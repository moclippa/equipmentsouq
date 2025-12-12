/**
 * Trust Scoring Service
 *
 * Calculates owner trust scores and manages trust badges.
 * Trust is computed from multiple signals:
 * - Response rate and speed (from lead interactions)
 * - Review ratings (from completed transactions)
 * - Listing quality (aggregated from equipment scores)
 * - Verification status (business documents)
 *
 * Scores are pre-computed and cached for fast retrieval.
 */

import { prisma } from '@/lib/prisma';
import {
  getOrSetCached,
  deleteCached,
  CACHE_TTL,
} from '@/lib/cache';
import { ServiceResult, ErrorCodes } from '../base';
import {
  TrustMetrics,
  TRUST_THRESHOLDS,
  RATING_VALUES,
} from '@/types/trust';
import type { TrustBadge, ReviewRating } from '@prisma/client';

// =============================================================================
// CACHE KEYS
// =============================================================================

const TRUST_CACHE_PREFIX = 'trust:metrics:';

// =============================================================================
// TYPES
// =============================================================================

interface ResponseMetricsData {
  totalLeads: number;
  respondedLeads: number;
  avgResponseTimeHours: number | null;
}

interface ReviewMetricsData {
  totalReviews: number;
  averageRating: number | null;
  ratings: ReviewRating[];
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class TrustScoringService {
  /**
   * Get trust metrics for an owner (cached)
   */
  async getMetrics(ownerId: string): Promise<ServiceResult<TrustMetrics | null>> {
    try {
      const metrics = await getOrSetCached<TrustMetrics | null>(
        `${TRUST_CACHE_PREFIX}${ownerId}`,
        CACHE_TTL.STATS,
        async () => {
          const stored = await prisma.ownerTrustMetrics.findUnique({
            where: { ownerId },
            include: {
              owner: {
                select: {
                  createdAt: true,
                  phoneVerified: true,
                  businessProfile: {
                    select: { crVerificationStatus: true },
                  },
                },
              },
            },
          });

          if (!stored) return null;

          // Build rating distribution from individual counts
          const ratingDistribution: Record<ReviewRating, number> = {
            EXCELLENT: stored.excellentCount,
            GOOD: stored.goodCount,
            FAIR: stored.fairCount,
            POOR: stored.poorCount,
            VERY_POOR: stored.veryPoorCount,
          };

          return {
            ownerId: stored.ownerId,
            trustScore: Number(stored.trustScore),
            badges: stored.badges as TrustBadge[],
            responseMetrics: {
              totalLeads: stored.totalLeads,
              respondedLeads: stored.respondedLeads,
              responseRate: Number(stored.responseRate || 0),
              avgResponseTimeHours: stored.avgResponseTimeHours
                ? Number(stored.avgResponseTimeHours)
                : null,
            },
            reviewMetrics: {
              totalReviews: stored.totalReviews,
              averageRating: stored.averageRating
                ? Number(stored.averageRating)
                : null,
              ratingDistribution,
            },
            listingMetrics: {
              totalListings: stored.totalListings,
              activeListings: stored.activeListings,
              avgListingQuality: stored.avgListingQuality
                ? Number(stored.avgListingQuality)
                : null,
            },
            memberSince: stored.owner.createdAt,
            isVerified:
              stored.owner.businessProfile?.crVerificationStatus === 'VERIFIED' ||
              stored.owner.phoneVerified !== null,
            lastCalculatedAt: stored.lastCalculatedAt,
          };
        }
      );

      return ServiceResult.ok(metrics);
    } catch (error) {
      console.error('TrustScoringService.getMetrics error:', error);
      return ServiceResult.fail(ErrorCodes.DATABASE_ERROR, 'Failed to get trust metrics');
    }
  }

  /**
   * Recalculate trust metrics for an owner
   * Called after events: new review, lead response, listing update
   */
  async recalculate(ownerId: string): Promise<ServiceResult<TrustMetrics>> {
    try {
      // Gather all metrics in parallel
      const [responseMetrics, reviewMetrics, listingMetrics, ownerInfo] = await Promise.all([
        this.calculateResponseMetrics(ownerId),
        this.calculateReviewMetrics(ownerId),
        this.calculateListingMetrics(ownerId),
        prisma.user.findUnique({
          where: { id: ownerId },
          select: {
            createdAt: true,
            phoneVerified: true,
            businessProfile: {
              select: { crVerificationStatus: true },
            },
          },
        }),
      ]);

      if (!ownerInfo) {
        return ServiceResult.fail(ErrorCodes.NOT_FOUND, 'Owner not found');
      }

      const responseRate = responseMetrics.totalLeads > 0
        ? (responseMetrics.respondedLeads / responseMetrics.totalLeads) * 100
        : 0;

      const isBusinessVerified = ownerInfo.businessProfile?.crVerificationStatus === 'VERIFIED';
      const isIdentityVerified = ownerInfo.phoneVerified !== null;

      // Calculate badges
      const badges = this.calculateBadges({
        responseRate,
        avgResponseTimeHours: responseMetrics.avgResponseTimeHours,
        averageRating: reviewMetrics.averageRating,
        totalReviews: reviewMetrics.totalReviews,
        isBusinessVerified,
        isIdentityVerified,
      });

      // Calculate overall trust score
      const trustScore = this.calculateTrustScore({
        responseRate: responseMetrics.totalLeads > 0 ? responseRate : 100,
        avgResponseTimeHours: responseMetrics.avgResponseTimeHours,
        averageRating: reviewMetrics.averageRating,
        totalReviews: reviewMetrics.totalReviews,
        avgListingQuality: listingMetrics.avgListingQuality,
        isVerified: isBusinessVerified || isIdentityVerified,
      });

      // Build rating distribution counts
      const ratingCounts = {
        excellentCount: 0,
        goodCount: 0,
        fairCount: 0,
        poorCount: 0,
        veryPoorCount: 0,
      };
      for (const rating of reviewMetrics.ratings) {
        switch (rating) {
          case 'EXCELLENT': ratingCounts.excellentCount++; break;
          case 'GOOD': ratingCounts.goodCount++; break;
          case 'FAIR': ratingCounts.fairCount++; break;
          case 'POOR': ratingCounts.poorCount++; break;
          case 'VERY_POOR': ratingCounts.veryPoorCount++; break;
        }
      }

      // Upsert metrics
      await prisma.ownerTrustMetrics.upsert({
        where: { ownerId },
        create: {
          ownerId,
          trustScore,
          badges,
          totalLeads: responseMetrics.totalLeads,
          respondedLeads: responseMetrics.respondedLeads,
          responseRate,
          avgResponseTimeHours: responseMetrics.avgResponseTimeHours,
          totalReviews: reviewMetrics.totalReviews,
          averageRating: reviewMetrics.averageRating,
          ...ratingCounts,
          totalListings: listingMetrics.totalListings,
          activeListings: listingMetrics.activeListings,
          avgListingQuality: listingMetrics.avgListingQuality,
        },
        update: {
          trustScore,
          badges,
          totalLeads: responseMetrics.totalLeads,
          respondedLeads: responseMetrics.respondedLeads,
          responseRate,
          avgResponseTimeHours: responseMetrics.avgResponseTimeHours,
          totalReviews: reviewMetrics.totalReviews,
          averageRating: reviewMetrics.averageRating,
          ...ratingCounts,
          totalListings: listingMetrics.totalListings,
          activeListings: listingMetrics.activeListings,
          avgListingQuality: listingMetrics.avgListingQuality,
          lastCalculatedAt: new Date(),
        },
      });

      // Invalidate cache
      await deleteCached(`${TRUST_CACHE_PREFIX}${ownerId}`);

      const ratingDistribution: Record<ReviewRating, number> = {
        EXCELLENT: ratingCounts.excellentCount,
        GOOD: ratingCounts.goodCount,
        FAIR: ratingCounts.fairCount,
        POOR: ratingCounts.poorCount,
        VERY_POOR: ratingCounts.veryPoorCount,
      };

      const metrics: TrustMetrics = {
        ownerId,
        trustScore,
        badges,
        responseMetrics: {
          totalLeads: responseMetrics.totalLeads,
          respondedLeads: responseMetrics.respondedLeads,
          responseRate,
          avgResponseTimeHours: responseMetrics.avgResponseTimeHours,
        },
        reviewMetrics: {
          totalReviews: reviewMetrics.totalReviews,
          averageRating: reviewMetrics.averageRating,
          ratingDistribution,
        },
        listingMetrics,
        memberSince: ownerInfo.createdAt,
        isVerified: isBusinessVerified || isIdentityVerified,
        lastCalculatedAt: new Date(),
      };

      return ServiceResult.ok(metrics);
    } catch (error) {
      console.error('TrustScoringService.recalculate error:', error);
      return ServiceResult.fail(ErrorCodes.DATABASE_ERROR, 'Failed to recalculate trust metrics');
    }
  }

  /**
   * Invalidate trust metrics cache for an owner
   */
  async invalidateCache(ownerId: string): Promise<void> {
    await deleteCached(`${TRUST_CACHE_PREFIX}${ownerId}`);
  }

  // ===========================================================================
  // METRIC CALCULATION HELPERS
  // ===========================================================================

  /**
   * Calculate response metrics from leads
   */
  private async calculateResponseMetrics(ownerId: string): Promise<ResponseMetricsData> {
    const leads = await prisma.lead.findMany({
      where: {
        equipment: { ownerId },
      },
      select: {
        createdAt: true,
        ownerRespondedAt: true,
        status: true,
      },
    });

    const totalLeads = leads.length;
    let respondedLeads = 0;
    let totalResponseTimeMs = 0;
    let responsesWithTime = 0;

    for (const lead of leads) {
      // Count as responded if status changed beyond NEW or has response timestamp
      if (lead.status !== 'NEW' || lead.ownerRespondedAt) {
        respondedLeads++;
      }

      // Calculate response time if we have the timestamp
      if (lead.ownerRespondedAt) {
        const responseTime = lead.ownerRespondedAt.getTime() - lead.createdAt.getTime();
        totalResponseTimeMs += responseTime;
        responsesWithTime++;
      }
    }

    const avgResponseTimeHours =
      responsesWithTime > 0
        ? totalResponseTimeMs / responsesWithTime / (1000 * 60 * 60)
        : null;

    return {
      totalLeads,
      respondedLeads,
      avgResponseTimeHours,
    };
  }

  /**
   * Calculate review metrics
   */
  private async calculateReviewMetrics(ownerId: string): Promise<ReviewMetricsData> {
    const reviews = await prisma.ownerReview.findMany({
      where: {
        ownerId,
        status: 'SUBMITTED', // Only count submitted reviews
      },
      select: {
        rating: true,
      },
    });

    const totalReviews = reviews.length;
    const ratings = reviews.map((r) => r.rating);

    let averageRating: number | null = null;
    if (totalReviews > 0) {
      const sum = ratings.reduce((acc, rating) => acc + RATING_VALUES[rating], 0);
      averageRating = sum / totalReviews;
    }

    return {
      totalReviews,
      averageRating,
      ratings,
    };
  }

  /**
   * Calculate listing metrics
   */
  private async calculateListingMetrics(ownerId: string): Promise<{
    totalListings: number;
    activeListings: number;
    avgListingQuality: number | null;
  }> {
    const [totalListings, activeListings, qualityScores] = await Promise.all([
      prisma.equipment.count({ where: { ownerId } }),
      prisma.equipment.count({ where: { ownerId, status: 'ACTIVE' } }),
      prisma.listingQualityScore.findMany({
        where: {
          equipment: { ownerId, status: 'ACTIVE' },
        },
        select: { overallScore: true },
      }),
    ]);

    let avgListingQuality: number | null = null;
    if (qualityScores.length > 0) {
      const sum = qualityScores.reduce((acc, s) => acc + Number(s.overallScore), 0);
      avgListingQuality = sum / qualityScores.length;
    }

    return {
      totalListings,
      activeListings,
      avgListingQuality,
    };
  }

  // ===========================================================================
  // BADGE & SCORE CALCULATION
  // ===========================================================================

  /**
   * Determine which badges an owner has earned
   */
  private calculateBadges(data: {
    responseRate: number;
    avgResponseTimeHours: number | null;
    averageRating: number | null;
    totalReviews: number;
    isBusinessVerified: boolean;
    isIdentityVerified: boolean;
  }): TrustBadge[] {
    const badges: TrustBadge[] = [];

    // VERIFIED_BUSINESS: Has verified CR/VAT documents
    if (data.isBusinessVerified) {
      badges.push('VERIFIED_BUSINESS');
    }

    // VERIFIED_IDENTITY: Has verified phone
    if (data.isIdentityVerified) {
      badges.push('VERIFIED_IDENTITY');
    }

    // FAST_RESPONDER: Avg response time < 2 hours
    if (
      data.avgResponseTimeHours !== null &&
      data.avgResponseTimeHours <= TRUST_THRESHOLDS.FAST_RESPONDER_MAX_HOURS
    ) {
      badges.push('FAST_RESPONDER');
    }

    // RELIABLE: 95%+ response rate
    if (data.responseRate >= TRUST_THRESHOLDS.RELIABLE_MIN_RATE) {
      badges.push('RELIABLE');
    }

    // TOP_RATED: 4.5+ stars with 10+ reviews
    if (
      data.averageRating !== null &&
      data.averageRating >= TRUST_THRESHOLDS.TOP_RATED_MIN_RATING &&
      data.totalReviews >= TRUST_THRESHOLDS.TOP_RATED_MIN_REVIEWS
    ) {
      badges.push('TOP_RATED');
    }

    return badges;
  }

  /**
   * Calculate overall trust score (0-100)
   * Weighted combination of all trust signals
   */
  private calculateTrustScore(data: {
    responseRate: number;
    avgResponseTimeHours: number | null;
    averageRating: number | null;
    totalReviews: number;
    avgListingQuality: number | null;
    isVerified: boolean;
  }): number {
    // Response score (0-100)
    let responseScore = data.responseRate;
    if (data.avgResponseTimeHours !== null) {
      if (data.avgResponseTimeHours <= 1) {
        responseScore = Math.min(100, responseScore + 10);
      } else if (data.avgResponseTimeHours <= 2) {
        responseScore = Math.min(100, responseScore + 5);
      } else if (data.avgResponseTimeHours > 24) {
        responseScore = Math.max(0, responseScore - 10);
      }
    }

    // Review score (0-100)
    let reviewScore = 50;
    if (data.averageRating !== null && data.totalReviews > 0) {
      reviewScore = ((data.averageRating - 1) / 4) * 100;
      if (data.totalReviews < 5) {
        reviewScore = reviewScore * (data.totalReviews / 5);
      }
    }

    // Listing quality score (0-100)
    const listingScore = data.avgListingQuality ?? 50;

    // Verification bonus (0 or 10)
    const verificationBonus = data.isVerified ? 10 : 0;

    // Weighted combination
    const baseScore =
      responseScore * TRUST_THRESHOLDS.WEIGHT_RESPONSE +
      reviewScore * TRUST_THRESHOLDS.WEIGHT_REVIEWS +
      listingScore * TRUST_THRESHOLDS.WEIGHT_LISTING_QUALITY;

    const finalScore = Math.min(
      100,
      Math.round(baseScore + verificationBonus * TRUST_THRESHOLDS.WEIGHT_VERIFICATION * 100)
    );

    return finalScore;
  }
}

// Export singleton instance
export const trustScoringService = new TrustScoringService();
