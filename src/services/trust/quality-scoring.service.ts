/**
 * Quality Scoring Service
 *
 * Calculates and maintains listing quality scores for equipment.
 * Scores are based on:
 * - Photo quality (count, resolution hints)
 * - Description completeness (length, bilingual)
 * - Specification completeness (category-specific fields)
 *
 * These scores help renters identify well-documented listings
 * and incentivize owners to provide complete information.
 */

import { prisma } from '@/lib/prisma';
import { ServiceResult, ErrorCodes } from '../base';
import { getPhotoScore, ListingQuality } from '@/types/trust';
import { Prisma } from '@prisma/client';

// =============================================================================
// SCORING CONSTANTS
// =============================================================================

const DESCRIPTION_THRESHOLDS = {
  MIN_GOOD: 100, // chars
  MIN_EXCELLENT: 300, // chars
} as const;

const BILINGUAL_BONUS = 20; // Bonus for having both EN and AR

// =============================================================================
// TYPES
// =============================================================================

interface EquipmentForScoring {
  id: string;
  titleEn: string;
  titleAr: string | null;
  descriptionEn: string;
  descriptionAr: string | null;
  specifications: Prisma.JsonValue;
  images: { id: string }[];
  category: {
    id: string;
    slug: string;
  };
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class QualityScoringService {
  /**
   * Calculate and persist listing quality score for equipment
   */
  async calculateAndSave(equipmentId: string): Promise<ServiceResult<ListingQuality>> {
    try {
      const equipment = await prisma.equipment.findUnique({
        where: { id: equipmentId },
        select: {
          id: true,
          titleEn: true,
          titleAr: true,
          descriptionEn: true,
          descriptionAr: true,
          specifications: true,
          images: { select: { id: true } },
          category: { select: { id: true, slug: true } },
        },
      });

      if (!equipment) {
        return ServiceResult.fail(ErrorCodes.NOT_FOUND, 'Equipment not found');
      }

      const scores = this.calculateScores(equipment as EquipmentForScoring);

      // Upsert the quality score (Prisma stores as Decimal, we pass numbers)
      await prisma.listingQualityScore.upsert({
        where: { equipmentId },
        create: {
          equipmentId,
          photoScore: scores.photoScore,
          descriptionScore: scores.descriptionScore,
          specificationScore: scores.specificationScore,
          overallScore: scores.overallScore,
        },
        update: {
          photoScore: scores.photoScore,
          descriptionScore: scores.descriptionScore,
          specificationScore: scores.specificationScore,
          overallScore: scores.overallScore,
          calculatedAt: new Date(),
        },
      });

      return ServiceResult.ok(scores);
    } catch (error) {
      console.error('QualityScoringService.calculateAndSave error:', error);
      return ServiceResult.fail(ErrorCodes.DATABASE_ERROR, 'Failed to calculate quality score');
    }
  }

  /**
   * Get existing quality score for equipment
   */
  async getScore(equipmentId: string): Promise<ServiceResult<ListingQuality | null>> {
    try {
      const score = await prisma.listingQualityScore.findUnique({
        where: { equipmentId },
      });

      if (!score) {
        return ServiceResult.ok(null);
      }

      // Convert Decimal to number for API response
      return ServiceResult.ok({
        equipmentId: score.equipmentId,
        photoScore: Number(score.photoScore),
        descriptionScore: Number(score.descriptionScore),
        specificationScore: Number(score.specificationScore),
        overallScore: Number(score.overallScore),
      });
    } catch (error) {
      console.error('QualityScoringService.getScore error:', error);
      return ServiceResult.fail(ErrorCodes.DATABASE_ERROR, 'Failed to get quality score');
    }
  }

  /**
   * Bulk recalculate scores for all active equipment
   * Useful for batch jobs or admin operations
   */
  async recalculateAll(): Promise<ServiceResult<{ processed: number; errors: number }>> {
    try {
      const equipment = await prisma.equipment.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });

      let processed = 0;
      let errors = 0;

      for (const eq of equipment) {
        const result = await this.calculateAndSave(eq.id);
        if (result.success) {
          processed++;
        } else {
          errors++;
        }
      }

      return ServiceResult.ok({ processed, errors });
    } catch (error) {
      console.error('QualityScoringService.recalculateAll error:', error);
      return ServiceResult.fail(ErrorCodes.DATABASE_ERROR, 'Failed to recalculate scores');
    }
  }

  // ===========================================================================
  // SCORING ALGORITHMS
  // ===========================================================================

  /**
   * Calculate all quality scores for equipment
   */
  private calculateScores(equipment: EquipmentForScoring): ListingQuality {
    const photoScore = this.calculatePhotoScore(equipment.images.length);
    const descriptionScore = this.calculateDescriptionScore(
      equipment.descriptionEn,
      equipment.descriptionAr
    );
    const specificationScore = this.calculateSpecificationScore(
      equipment.specifications,
      equipment.category.slug
    );

    // Weighted overall score
    const overallScore = Math.round(
      photoScore * 0.4 + descriptionScore * 0.35 + specificationScore * 0.25
    );

    return {
      equipmentId: equipment.id,
      photoScore,
      descriptionScore,
      specificationScore,
      overallScore,
    };
  }

  /**
   * Calculate photo score (0-100)
   * More photos = higher score, capped at 5
   */
  private calculatePhotoScore(imageCount: number): number {
    return getPhotoScore(imageCount);
  }

  /**
   * Calculate description score (0-100)
   * Based on length and bilingual support
   */
  private calculateDescriptionScore(
    descriptionEn: string,
    descriptionAr: string | null
  ): number {
    let score = 0;
    const enLength = descriptionEn?.length || 0;

    // Base score from English description length
    if (enLength >= DESCRIPTION_THRESHOLDS.MIN_EXCELLENT) {
      score = 80;
    } else if (enLength >= DESCRIPTION_THRESHOLDS.MIN_GOOD) {
      score = 60;
    } else if (enLength > 0) {
      // Linear scale for short descriptions
      score = Math.round((enLength / DESCRIPTION_THRESHOLDS.MIN_GOOD) * 60);
    }

    // Bilingual bonus
    if (descriptionAr && descriptionAr.length >= DESCRIPTION_THRESHOLDS.MIN_GOOD) {
      score = Math.min(100, score + BILINGUAL_BONUS);
    }

    return score;
  }

  /**
   * Calculate specification score (0-100)
   * Based on number of filled specification fields
   */
  private calculateSpecificationScore(
    specifications: Prisma.JsonValue,
    _categorySlug: string
  ): number {
    if (!specifications || typeof specifications !== 'object' || Array.isArray(specifications)) {
      return 0;
    }

    // Count non-empty specification values
    const specObj = specifications as Record<string, unknown>;
    const values = Object.values(specObj);
    const filledCount = values.filter((v) => {
      if (v === null || v === undefined) return false;
      if (typeof v === 'string' && v.trim() === '') return false;
      return true;
    }).length;

    // Score based on filled specifications
    // 0 specs = 0, 1-2 = 30, 3-4 = 60, 5+ = 100
    if (filledCount >= 5) return 100;
    if (filledCount >= 3) return 60;
    if (filledCount >= 1) return 30;
    return 0;
  }
}

// Export singleton instance
export const qualityScoringService = new QualityScoringService();
