/**
 * EquipmentService Tests
 *
 * Tests for equipment business logic including:
 * - Creating equipment listings
 * - Retrieving equipment details
 * - Updating equipment
 * - Archiving equipment
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';
import '../mocks/cache';
import { EquipmentService } from '@/services/equipment.service';
import { ErrorCodes } from '@/services/base';

// Create a new instance for testing
const equipmentService = new EquipmentService();

// Mock equipment data
const mockEquipmentInput = {
  categoryId: 'cat-123',
  titleEn: 'CAT 320 Excavator for Rent',
  titleAr: 'حفارة CAT 320 للإيجار',
  descriptionEn: 'Well-maintained CAT 320 excavator available for rent. Perfect for construction projects.',
  descriptionAr: 'حفارة CAT 320 بحالة ممتازة متاحة للإيجار',
  make: 'Caterpillar',
  model: '320',
  year: 2020,
  condition: 'EXCELLENT',
  hoursUsed: 2500,
  listingType: 'FOR_RENT' as const,
  rentalPrice: 5000,
  rentalPriceUnit: 'day',
  currency: 'SAR' as const,
  locationCity: 'Riyadh',
  locationRegion: 'Riyadh Region',
  locationCountry: 'SA' as const,
  contactPhone: '+966501234567',
  images: [
    { url: 'https://example.com/image1.jpg', isPrimary: true, sortOrder: 0 },
    { url: 'https://example.com/image2.jpg', isPrimary: false, sortOrder: 1 },
  ],
};

const mockCreatedEquipment = {
  id: 'eq-123',
  ...mockEquipmentInput,
  ownerId: 'user-123',
  status: 'ACTIVE',
  viewCount: 0,
  leadCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  publishedAt: new Date(),
  statusChangedAt: null,
  specifications: {},
  priceOnRequest: false,
  contactWhatsApp: null,
  aiClassified: false,
};

const mockEquipmentWithDetails = {
  ...mockCreatedEquipment,
  category: {
    id: 'cat-123',
    nameEn: 'Excavators',
    nameAr: 'حفارات',
    slug: 'excavators',
    parentId: null,
  },
  owner: {
    id: 'user-123',
    fullName: 'Mohammed Al-Khalifa',
    avatarUrl: null,
    createdAt: new Date(),
    businessProfile: {
      companyNameEn: 'Al-Khalifa Equipment',
      companyNameAr: 'معدات الخليفة',
      crVerificationStatus: 'VERIFIED',
    },
  },
  images: [
    { id: 'img-1', url: 'https://example.com/image1.jpg', isPrimary: true, sortOrder: 0 },
  ],
  _count: { leads: 5 },
};

describe('EquipmentService', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  describe('create()', () => {
    it('creates equipment with valid input', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(prismaMock);
      });
      prismaMock.equipment.create.mockResolvedValue(mockCreatedEquipment);
      prismaMock.equipmentImage.createMany.mockResolvedValue({ count: 2 });

      const result = await equipmentService.create(mockEquipmentInput, 'user-123');

      expect(result.success).toBe(true);
      expect(result.data?.equipmentId).toBe('eq-123');
      expect(prismaMock.equipment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: 'user-123',
            titleEn: mockEquipmentInput.titleEn,
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('validates rental price is required for FOR_RENT listings', async () => {
      const inputWithoutPrice = {
        ...mockEquipmentInput,
        listingType: 'FOR_RENT' as const,
        rentalPrice: undefined,
        priceOnRequest: false,
      };

      const result = await equipmentService.create(inputWithoutPrice, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.PRICE_REQUIRED);
    });

    it('validates sale price is required for FOR_SALE listings', async () => {
      const inputWithoutPrice = {
        ...mockEquipmentInput,
        listingType: 'FOR_SALE' as const,
        rentalPrice: undefined,
        salePrice: undefined,
        priceOnRequest: false,
      };

      const result = await equipmentService.create(inputWithoutPrice, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.PRICE_REQUIRED);
    });

    it('allows priceOnRequest to skip price validation', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(prismaMock);
      });
      prismaMock.equipment.create.mockResolvedValue(mockCreatedEquipment);
      prismaMock.equipmentImage.createMany.mockResolvedValue({ count: 2 });

      const inputWithPriceOnRequest = {
        ...mockEquipmentInput,
        rentalPrice: undefined,
        priceOnRequest: true,
      };

      const result = await equipmentService.create(inputWithPriceOnRequest, 'user-123');

      expect(result.success).toBe(true);
    });

    it('handles database errors gracefully', async () => {
      prismaMock.$transaction.mockRejectedValue(new Error('Database connection failed'));

      const result = await equipmentService.create(mockEquipmentInput, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.DATABASE_ERROR);
    });
  });

  describe('getById()', () => {
    it('returns equipment with full details', async () => {
      // Mock the cache to call the fetcher
      const { cacheMock } = await import('../mocks/cache');
      cacheMock.getOrSetCached.mockImplementation(async (_key, _ttl, fetcher) => fetcher());

      prismaMock.equipment.findUnique.mockResolvedValue(mockEquipmentWithDetails);
      prismaMock.$executeRaw.mockResolvedValue(1);

      const result = await equipmentService.getById('eq-123');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('eq-123');
      expect(result.data?.category.nameEn).toBe('Excavators');
      expect(result.data?.owner.fullName).toBe('Mohammed Al-Khalifa');
    });

    it('returns NOT_FOUND for non-existent equipment', async () => {
      const { cacheMock } = await import('../mocks/cache');
      cacheMock.getOrSetCached.mockImplementation(async (_key, _ttl, fetcher) => fetcher());

      prismaMock.equipment.findUnique.mockResolvedValue(null);

      const result = await equipmentService.getById('non-existent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.NOT_FOUND);
    });

    it('serializes dates and decimals for JSON storage', async () => {
      const { cacheMock } = await import('../mocks/cache');
      cacheMock.getOrSetCached.mockImplementation(async (_key, _ttl, fetcher) => fetcher());

      prismaMock.equipment.findUnique.mockResolvedValue(mockEquipmentWithDetails);
      prismaMock.$executeRaw.mockResolvedValue(1);

      const result = await equipmentService.getById('eq-123');

      expect(result.success).toBe(true);
      expect(typeof result.data?.createdAt).toBe('string');
      expect(typeof result.data?.owner.createdAt).toBe('string');
    });
  });

  describe('update()', () => {
    it('updates equipment when user is owner', async () => {
      prismaMock.equipment.findUnique.mockResolvedValue({
        ownerId: 'user-123',
        status: 'ACTIVE',
      });
      prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
      prismaMock.equipment.update.mockResolvedValue({
        ...mockCreatedEquipment,
        titleEn: 'Updated Title',
      });

      const result = await equipmentService.update(
        'eq-123',
        { titleEn: 'Updated Title' },
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(prismaMock.equipment.update).toHaveBeenCalled();
    });

    it('returns FORBIDDEN when user is not owner', async () => {
      prismaMock.equipment.findUnique.mockResolvedValue({
        ownerId: 'other-user',
        status: 'ACTIVE',
      });

      const result = await equipmentService.update(
        'eq-123',
        { titleEn: 'Updated Title' },
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.FORBIDDEN);
    });

    it('returns NOT_FOUND for non-existent equipment', async () => {
      prismaMock.equipment.findUnique.mockResolvedValue(null);

      const result = await equipmentService.update(
        'non-existent',
        { titleEn: 'Updated Title' },
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.NOT_FOUND);
    });

    it('tracks status changes with statusChangedAt', async () => {
      prismaMock.equipment.findUnique.mockResolvedValue({
        ownerId: 'user-123',
        status: 'ACTIVE',
      });
      prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
      prismaMock.equipment.update.mockResolvedValue({
        ...mockCreatedEquipment,
        status: 'SOLD',
      });

      await equipmentService.update('eq-123', { status: 'SOLD' }, 'user-123');

      expect(prismaMock.equipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statusChangedAt: expect.any(Date),
          }),
        })
      );
    });

    it('handles image updates and deletions', async () => {
      prismaMock.equipment.findUnique.mockResolvedValue({
        ownerId: 'user-123',
        status: 'ACTIVE',
      });
      prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
      prismaMock.equipment.update.mockResolvedValue(mockCreatedEquipment);
      prismaMock.equipmentImage.deleteMany.mockResolvedValue({ count: 1 });
      prismaMock.equipmentImage.create.mockResolvedValue({});

      await equipmentService.update(
        'eq-123',
        {
          imagesToDelete: ['img-old'],
          images: [{ url: 'https://example.com/new.jpg', isPrimary: true, sortOrder: 0 }],
        },
        'user-123'
      );

      expect(prismaMock.equipmentImage.deleteMany).toHaveBeenCalled();
      expect(prismaMock.equipmentImage.create).toHaveBeenCalled();
    });
  });

  describe('archive()', () => {
    it('archives equipment when user is owner', async () => {
      prismaMock.equipment.findUnique.mockResolvedValue({
        ownerId: 'user-123',
      });
      prismaMock.equipment.update.mockResolvedValue({
        ...mockCreatedEquipment,
        status: 'ARCHIVED',
      });

      const result = await equipmentService.archive('eq-123', 'user-123');

      expect(result.success).toBe(true);
      expect(prismaMock.equipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ARCHIVED',
          }),
        })
      );
    });

    it('returns FORBIDDEN when user is not owner', async () => {
      prismaMock.equipment.findUnique.mockResolvedValue({
        ownerId: 'other-user',
      });

      const result = await equipmentService.archive('eq-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.FORBIDDEN);
    });

    it('returns NOT_FOUND for non-existent equipment', async () => {
      prismaMock.equipment.findUnique.mockResolvedValue(null);

      const result = await equipmentService.archive('non-existent', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.NOT_FOUND);
    });
  });
});
