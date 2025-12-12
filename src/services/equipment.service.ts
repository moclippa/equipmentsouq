/**
 * Equipment Service
 *
 * Handles all equipment-related business logic:
 * - Creating new listings
 * - Retrieving equipment details
 * - Updating equipment
 * - Archiving/deleting equipment
 *
 * This service is framework-agnostic and returns ServiceResult
 * for consistent error handling. The API routes remain thin
 * (auth check → call service → return response).
 */

import { prisma } from '@/lib/prisma';
import {
  getOrSetCached,
  invalidateAllEquipmentCaches,
  CACHE_TTL,
  CACHE_KEYS,
} from '@/lib/cache';
import { ServiceResult, ErrorCodes } from './base';
import { trustEventsService } from './trust';
import type { Equipment, EquipmentImage, Prisma } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateEquipmentInput {
  categoryId: string;
  titleEn: string;
  titleAr?: string;
  descriptionEn: string;
  descriptionAr?: string;
  make: string;
  model: string;
  year?: number;
  condition: string;
  hoursUsed?: number;
  specifications?: Record<string, string | number | boolean>;
  listingType: 'FOR_RENT' | 'FOR_SALE' | 'BOTH';
  rentalPrice?: number;
  rentalPriceUnit?: string;
  salePrice?: number;
  priceOnRequest?: boolean;
  currency: 'SAR' | 'BHD';
  locationCity: string;
  locationRegion: string;
  locationCountry: 'SA' | 'BH';
  contactPhone: string;
  contactWhatsApp?: string;
  images: Array<{
    url: string;
    isPrimary?: boolean;
    sortOrder?: number;
  }>;
  aiClassified?: boolean;
}

export interface UpdateEquipmentInput {
  titleEn?: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  make?: string;
  model?: string;
  year?: number;
  condition?: string;
  hoursUsed?: number;
  specifications?: Record<string, string | number | boolean>;
  listingType?: 'FOR_RENT' | 'FOR_SALE' | 'BOTH';
  rentalPrice?: number;
  rentalPriceUnit?: string;
  salePrice?: number;
  priceOnRequest?: boolean;
  currency?: 'SAR' | 'BHD';
  locationCity?: string;
  locationRegion?: string;
  contactPhone?: string;
  contactWhatsApp?: string;
  status?: 'ACTIVE' | 'PAUSED' | 'RENTED' | 'SOLD';
  images?: Array<{
    id?: string;
    url: string;
    isPrimary?: boolean;
    sortOrder?: number;
  }>;
  imagesToDelete?: string[];
}

export interface EquipmentWithDetails extends Omit<Equipment, 'rentalPrice' | 'salePrice' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'statusChangedAt'> {
  category: {
    id: string;
    nameEn: string;
    nameAr: string | null;
    slug: string;
    parentId: string | null;
  };
  owner: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    createdAt: string;
    businessProfile: {
      companyNameEn: string | null;
      companyNameAr: string | null;
      crVerificationStatus: string;
    } | null;
  };
  images: EquipmentImage[];
  _count: {
    leads: number;
  };
  // Serialized fields (Date → string, Decimal → number for JSON/cache)
  rentalPrice: number | null;
  salePrice: number | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  statusChangedAt: string | null;
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class EquipmentService {
  /**
   * Create a new equipment listing
   */
  async create(
    input: CreateEquipmentInput,
    ownerId: string
  ): Promise<ServiceResult<{ equipmentId: string }>> {
    // Validate pricing based on listing type
    const priceValidation = this.validatePricing(input);
    if (!priceValidation.success) {
      return ServiceResult.fail(
        priceValidation.error!.code,
        priceValidation.error!.message
      );
    }

    try {
      // Create equipment with images in a transaction
      const equipment = await prisma.$transaction(async (tx) => {
        const eq = await tx.equipment.create({
          data: {
            ownerId,
            categoryId: input.categoryId,
            titleEn: input.titleEn,
            titleAr: input.titleAr,
            descriptionEn: input.descriptionEn,
            descriptionAr: input.descriptionAr,
            make: input.make,
            model: input.model,
            year: input.year,
            condition: input.condition,
            hoursUsed: input.hoursUsed,
            specifications: input.specifications || {},
            listingType: input.listingType,
            rentalPrice: input.rentalPrice,
            rentalPriceUnit: input.rentalPriceUnit || 'day',
            salePrice: input.salePrice,
            priceOnRequest: input.priceOnRequest ?? false,
            currency: input.currency,
            locationCity: input.locationCity,
            locationRegion: input.locationRegion,
            locationCountry: input.locationCountry,
            contactPhone: input.contactPhone,
            contactWhatsApp: input.contactWhatsApp,
            aiClassified: input.aiClassified ?? false,
            status: 'ACTIVE',
            publishedAt: new Date(),
          },
        });

        // Create images
        if (input.images.length > 0) {
          await tx.equipmentImage.createMany({
            data: input.images.map((img, index) => ({
              equipmentId: eq.id,
              url: img.url,
              isPrimary: img.isPrimary ?? index === 0,
              sortOrder: img.sortOrder ?? index,
            })),
          });
        }

        return eq;
      });

      // Invalidate caches (fire and forget)
      invalidateAllEquipmentCaches().catch(() => {});

      // Emit trust event for quality scoring (fire and forget)
      trustEventsService.onListingCreated({
        equipmentId: equipment.id,
        ownerId,
      }).catch(() => {});

      return ServiceResult.ok({ equipmentId: equipment.id });
    } catch (error) {
      console.error('EquipmentService.create error:', error);
      return ServiceResult.fail(
        ErrorCodes.DATABASE_ERROR,
        'Failed to create equipment listing'
      );
    }
  }

  /**
   * Get equipment details by ID with caching
   */
  async getById(id: string): Promise<ServiceResult<EquipmentWithDetails>> {
    try {
      const equipment = await getOrSetCached<EquipmentWithDetails | null>(
        `${CACHE_KEYS.EQUIPMENT}:${id}`,
        CACHE_TTL.EQUIPMENT_DETAIL,
        async () => {
          const eq = await prisma.equipment.findUnique({
            where: { id },
            include: {
              category: {
                select: {
                  id: true,
                  nameEn: true,
                  nameAr: true,
                  slug: true,
                  parentId: true,
                },
              },
              owner: {
                select: {
                  id: true,
                  fullName: true,
                  avatarUrl: true,
                  createdAt: true,
                  businessProfile: {
                    select: {
                      companyNameEn: true,
                      companyNameAr: true,
                      crVerificationStatus: true,
                    },
                  },
                },
              },
              images: {
                orderBy: { sortOrder: 'asc' },
              },
              _count: {
                select: { leads: true },
              },
            },
          });

          if (!eq) return null;

          // Serialize for JSON/Redis storage
          return this.serializeEquipment(eq);
        }
      );

      if (!equipment) {
        return ServiceResult.fail(ErrorCodes.NOT_FOUND, 'Equipment not found');
      }

      // Increment view count (fire and forget)
      this.incrementViewCount(id);

      return ServiceResult.ok(equipment);
    } catch (error) {
      console.error('EquipmentService.getById error:', error);
      return ServiceResult.fail(
        ErrorCodes.DATABASE_ERROR,
        'Failed to get equipment'
      );
    }
  }

  /**
   * Update equipment (must be owner)
   */
  async update(
    id: string,
    input: UpdateEquipmentInput,
    userId: string
  ): Promise<ServiceResult<Equipment>> {
    try {
      // Check ownership and get current status
      const existing = await prisma.equipment.findUnique({
        where: { id },
        select: { ownerId: true, status: true },
      });

      if (!existing) {
        return ServiceResult.fail(ErrorCodes.NOT_FOUND, 'Equipment not found');
      }

      if (existing.ownerId !== userId) {
        return ServiceResult.fail(
          ErrorCodes.FORBIDDEN,
          'Not authorized to update this equipment'
        );
      }

      const { images, imagesToDelete, ...updateData } = input;

      // Build update payload, tracking status changes
      const payload: Prisma.EquipmentUpdateInput = { ...updateData };
      if (updateData.status && updateData.status !== existing.status) {
        payload.statusChangedAt = new Date();
      }

      // Transaction for equipment + images
      const equipment = await prisma.$transaction(async (tx) => {
        const updated = await tx.equipment.update({
          where: { id },
          data: payload,
        });

        // Delete removed images
        if (imagesToDelete && imagesToDelete.length > 0) {
          await tx.equipmentImage.deleteMany({
            where: {
              id: { in: imagesToDelete },
              equipmentId: id,
            },
          });
        }

        // Update/add images
        if (images && images.length > 0) {
          for (const image of images) {
            if (image.id) {
              await tx.equipmentImage.update({
                where: { id: image.id },
                data: {
                  url: image.url,
                  isPrimary: image.isPrimary,
                  sortOrder: image.sortOrder,
                },
              });
            } else {
              await tx.equipmentImage.create({
                data: {
                  equipmentId: id,
                  url: image.url,
                  isPrimary: image.isPrimary ?? false,
                  sortOrder: image.sortOrder ?? 0,
                },
              });
            }
          }
        }

        return updated;
      });

      // Invalidate caches (fire and forget)
      invalidateAllEquipmentCaches(id).catch(() => {});

      // Emit trust event for quality scoring (fire and forget)
      trustEventsService.onListingUpdated({
        equipmentId: id,
        ownerId: userId,
      }).catch(() => {});

      return ServiceResult.ok(equipment);
    } catch (error) {
      console.error('EquipmentService.update error:', error);
      return ServiceResult.fail(
        ErrorCodes.DATABASE_ERROR,
        'Failed to update equipment'
      );
    }
  }

  /**
   * Archive/delete equipment (soft delete)
   */
  async archive(id: string, userId: string): Promise<ServiceResult<void>> {
    try {
      const existing = await prisma.equipment.findUnique({
        where: { id },
        select: { ownerId: true },
      });

      if (!existing) {
        return ServiceResult.fail(ErrorCodes.NOT_FOUND, 'Equipment not found');
      }

      if (existing.ownerId !== userId) {
        return ServiceResult.fail(
          ErrorCodes.FORBIDDEN,
          'Not authorized to delete this equipment'
        );
      }

      await prisma.equipment.update({
        where: { id },
        data: { status: 'ARCHIVED', statusChangedAt: new Date() },
      });

      // Invalidate caches (fire and forget)
      invalidateAllEquipmentCaches(id).catch(() => {});

      return ServiceResult.ok(undefined);
    } catch (error) {
      console.error('EquipmentService.archive error:', error);
      return ServiceResult.fail(
        ErrorCodes.DATABASE_ERROR,
        'Failed to delete equipment'
      );
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Validate pricing based on listing type
   */
  private validatePricing(
    input: CreateEquipmentInput
  ): ServiceResult<void> {
    if (input.listingType === 'FOR_RENT' || input.listingType === 'BOTH') {
      if (!input.priceOnRequest && !input.rentalPrice) {
        return ServiceResult.fail(
          ErrorCodes.PRICE_REQUIRED,
          'Rental price is required for rental listings'
        );
      }
    }
    if (input.listingType === 'FOR_SALE' || input.listingType === 'BOTH') {
      if (!input.priceOnRequest && !input.salePrice) {
        return ServiceResult.fail(
          ErrorCodes.PRICE_REQUIRED,
          'Sale price is required for sale listings'
        );
      }
    }
    return ServiceResult.ok(undefined);
  }

  /**
   * Serialize equipment for JSON/cache storage
   */
  private serializeEquipment(eq: {
    rentalPrice: Prisma.Decimal | null;
    salePrice: Prisma.Decimal | null;
    createdAt: Date;
    updatedAt: Date;
    publishedAt: Date | null;
    statusChangedAt: Date | null;
    owner: {
      id: string;
      fullName: string | null;
      avatarUrl: string | null;
      createdAt: Date;
      businessProfile: {
        companyNameEn: string | null;
        companyNameAr: string | null;
        crVerificationStatus: string;
      } | null;
    };
    [key: string]: unknown;
  }): EquipmentWithDetails {
    return {
      ...eq,
      rentalPrice: eq.rentalPrice ? Number(eq.rentalPrice) : null,
      salePrice: eq.salePrice ? Number(eq.salePrice) : null,
      createdAt: eq.createdAt.toISOString(),
      updatedAt: eq.updatedAt.toISOString(),
      publishedAt: eq.publishedAt?.toISOString() || null,
      statusChangedAt: eq.statusChangedAt?.toISOString() || null,
      owner: {
        ...eq.owner,
        createdAt: eq.owner.createdAt.toISOString(),
      },
    } as EquipmentWithDetails;
  }

  /**
   * Atomically increment view count (fire and forget)
   */
  private incrementViewCount(id: string): void {
    prisma.$executeRaw`UPDATE "Equipment" SET "viewCount" = "viewCount" + 1 WHERE id = ${id}`
      .catch(() => {});
  }
}

// Export singleton instance
export const equipmentService = new EquipmentService();
