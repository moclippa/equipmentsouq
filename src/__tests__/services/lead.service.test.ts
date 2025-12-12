/**
 * LeadService Tests
 *
 * Tests for lead management business logic including:
 * - Creating leads
 * - Listing leads for owners
 * - Updating lead status
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';
import { LeadService } from '@/services/lead.service';
import { ErrorCodes } from '@/services/base';

// Mock the SMS module
vi.mock('@/lib/notifications/sms', () => ({
  notifyOwnerOfNewLead: vi.fn(),
}));

// Create a new instance for testing
const leadService = new LeadService();

// Mock data
const mockUser = {
  id: 'user-123',
  fullName: 'Ahmed Al-Saud',
  phone: '+966501234567',
  email: 'ahmed@example.com',
  phoneVerified: true,
};

const mockEquipment = {
  id: 'eq-123',
  titleEn: 'CAT 320 Excavator',
  status: 'ACTIVE',
  ownerId: 'owner-456',
  owner: {
    phone: '+966509876543',
    email: 'owner@example.com',
    fullName: 'Mohammed Owner',
  },
};

const mockLead = {
  id: 'lead-123',
  equipmentId: 'eq-123',
  name: 'Ahmed Al-Saud',
  phone: '+966501234567',
  email: 'ahmed@example.com',
  message: 'Interested in renting for a week',
  interestedIn: 'rent',
  status: 'NEW',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('LeadService', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  describe('create()', () => {
    it('creates a lead for active equipment', async () => {
      prismaMock.equipment.findUnique.mockResolvedValue(mockEquipment);
      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(prismaMock);
      });
      prismaMock.lead.create.mockResolvedValue(mockLead);
      prismaMock.equipment.update.mockResolvedValue({});

      const result = await leadService.create(
        { equipmentId: 'eq-123', interestedIn: 'rent', message: 'Interested' },
        mockUser
      );

      expect(result.success).toBe(true);
      expect(result.data?.lead.id).toBe('lead-123');
      expect(result.data?.contact.phone).toBe('+966509876543');
    });

    it('returns PHONE_NOT_VERIFIED for unverified users', async () => {
      const unverifiedUser = { ...mockUser, phoneVerified: false };

      const result = await leadService.create(
        { equipmentId: 'eq-123', interestedIn: 'rent' },
        unverifiedUser
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.PHONE_NOT_VERIFIED);
    });

    it('returns PHONE_NOT_VERIFIED for users without phone', async () => {
      const noPhoneUser = { ...mockUser, phone: null };

      const result = await leadService.create(
        { equipmentId: 'eq-123', interestedIn: 'rent' },
        noPhoneUser
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.PHONE_NOT_VERIFIED);
    });

    it('returns NOT_FOUND for non-existent equipment', async () => {
      prismaMock.equipment.findUnique.mockResolvedValue(null);

      const result = await leadService.create(
        { equipmentId: 'non-existent', interestedIn: 'rent' },
        mockUser
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.NOT_FOUND);
    });

    it('returns EQUIPMENT_NOT_AVAILABLE for inactive equipment', async () => {
      prismaMock.equipment.findUnique.mockResolvedValue({
        ...mockEquipment,
        status: 'SOLD',
      });

      const result = await leadService.create(
        { equipmentId: 'eq-123', interestedIn: 'rent' },
        mockUser
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.EQUIPMENT_NOT_AVAILABLE);
    });

    it('increments lead count atomically', async () => {
      prismaMock.equipment.findUnique.mockResolvedValue(mockEquipment);
      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(prismaMock);
      });
      prismaMock.lead.create.mockResolvedValue(mockLead);
      prismaMock.equipment.update.mockResolvedValue({});

      await leadService.create(
        { equipmentId: 'eq-123', interestedIn: 'rent' },
        mockUser
      );

      expect(prismaMock.equipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { leadCount: { increment: 1 } },
        })
      );
    });

    it('sends SMS notification to owner', async () => {
      const { notifyOwnerOfNewLead } = await import('@/lib/notifications/sms');

      prismaMock.equipment.findUnique.mockResolvedValue(mockEquipment);
      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(prismaMock);
      });
      prismaMock.lead.create.mockResolvedValue(mockLead);
      prismaMock.equipment.update.mockResolvedValue({});

      await leadService.create(
        { equipmentId: 'eq-123', interestedIn: 'rent' },
        mockUser
      );

      expect(notifyOwnerOfNewLead).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerPhone: '+966509876543',
          equipmentTitle: 'CAT 320 Excavator',
        })
      );
    });
  });

  describe('listForOwner()', () => {
    it('lists leads for owner equipment', async () => {
      const mockLeads = [
        { ...mockLead, equipment: { id: 'eq-123', titleEn: 'Equipment 1', make: 'CAT', model: '320', images: [] } },
        { ...mockLead, id: 'lead-456', equipment: { id: 'eq-456', titleEn: 'Equipment 2', make: 'Komatsu', model: 'PC200', images: [] } },
      ];

      prismaMock.lead.count.mockResolvedValue(2);
      prismaMock.lead.findMany.mockResolvedValue(mockLeads);

      const result = await leadService.listForOwner({ ownerId: 'owner-123' });

      expect(result.success).toBe(true);
      expect(result.data?.leads).toHaveLength(2);
      expect(result.data?.pagination.total).toBe(2);
    });

    it('filters by status', async () => {
      prismaMock.lead.count.mockResolvedValue(1);
      prismaMock.lead.findMany.mockResolvedValue([mockLead]);

      await leadService.listForOwner({ ownerId: 'owner-123', status: 'NEW' });

      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'NEW',
          }),
        })
      );
    });

    it('filters by equipment ID', async () => {
      prismaMock.lead.count.mockResolvedValue(1);
      prismaMock.lead.findMany.mockResolvedValue([mockLead]);

      await leadService.listForOwner({ ownerId: 'owner-123', equipmentId: 'eq-123' });

      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            equipmentId: 'eq-123',
          }),
        })
      );
    });

    it('paginates results', async () => {
      prismaMock.lead.count.mockResolvedValue(100);
      prismaMock.lead.findMany.mockResolvedValue([mockLead]);

      const result = await leadService.listForOwner({
        ownerId: 'owner-123',
        page: 3,
        limit: 10,
      });

      expect(result.data?.pagination.page).toBe(3);
      expect(result.data?.pagination.limit).toBe(10);
      expect(result.data?.pagination.totalPages).toBe(10);

      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10
          take: 10,
        })
      );
    });

    it('caps limit at 50', async () => {
      prismaMock.lead.count.mockResolvedValue(100);
      prismaMock.lead.findMany.mockResolvedValue([]);

      const result = await leadService.listForOwner({
        ownerId: 'owner-123',
        limit: 100, // Requesting more than allowed
      });

      expect(result.data?.pagination.limit).toBe(50);
      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });
  });

  describe('updateStatus()', () => {
    it('updates lead status when user is owner', async () => {
      prismaMock.lead.findUnique.mockResolvedValue({
        ...mockLead,
        equipment: { ownerId: 'owner-123' },
      });
      prismaMock.lead.update.mockResolvedValue({
        ...mockLead,
        status: 'CONTACTED',
      });

      const result = await leadService.updateStatus('lead-123', 'CONTACTED', 'owner-123');

      expect(result.success).toBe(true);
      expect(prismaMock.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'CONTACTED' },
        })
      );
    });

    it('returns FORBIDDEN when user is not owner', async () => {
      prismaMock.lead.findUnique.mockResolvedValue({
        ...mockLead,
        equipment: { ownerId: 'other-owner' },
      });

      const result = await leadService.updateStatus('lead-123', 'CONTACTED', 'owner-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.FORBIDDEN);
    });

    it('returns NOT_FOUND for non-existent lead', async () => {
      prismaMock.lead.findUnique.mockResolvedValue(null);

      const result = await leadService.updateStatus('non-existent', 'CONTACTED', 'owner-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.NOT_FOUND);
    });

    it('allows all valid status transitions', async () => {
      const statuses = ['NEW', 'VIEWED', 'CONTACTED', 'CONVERTED', 'CLOSED'] as const;

      for (const status of statuses) {
        prismaMock.lead.findUnique.mockResolvedValue({
          ...mockLead,
          equipment: { ownerId: 'owner-123' },
        });
        prismaMock.lead.update.mockResolvedValue({
          ...mockLead,
          status,
        });

        const result = await leadService.updateStatus('lead-123', status, 'owner-123');

        expect(result.success).toBe(true);
      }
    });
  });
});
