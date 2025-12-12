/**
 * Lead Service
 *
 * Handles lead management business logic:
 * - Creating leads (interest in equipment)
 * - Listing leads for equipment owners
 * - Updating lead status
 *
 * Leads are the core conversion metric for the classifieds platform.
 * When a user contacts an equipment owner, a lead is created.
 */

import { prisma } from '@/lib/prisma';
import { notifyOwnerOfNewLead } from '@/lib/notifications/sms';
import { ServiceResult, ErrorCodes } from './base';
import { trustEventsService } from './trust';
import type { Lead, Equipment, EquipmentImage, Prisma } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateLeadInput {
  equipmentId: string;
  message?: string;
  interestedIn: 'rent' | 'buy' | 'both';
}

export interface LeadUser {
  id: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  phoneVerified: boolean | null;
}

export interface LeadWithEquipment extends Lead {
  equipment: {
    id: string;
    titleEn: string;
    make: string;
    model: string;
    images: EquipmentImage[];
  };
}

export interface CreateLeadResult {
  lead: {
    id: string;
    status: string;
  };
  contact: {
    phone: string | null;
    name: string | null;
  };
}

export interface ListLeadsOptions {
  ownerId: string;
  status?: string;
  equipmentId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedLeads {
  leads: LeadWithEquipment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class LeadService {
  /**
   * Create a new lead (express interest in equipment)
   */
  async create(
    input: CreateLeadInput,
    user: LeadUser
  ): Promise<ServiceResult<CreateLeadResult>> {
    // Validate phone verification
    if (!user.phone || !user.phoneVerified) {
      return ServiceResult.fail(
        ErrorCodes.PHONE_NOT_VERIFIED,
        'Please verify your phone number before contacting sellers'
      );
    }

    try {
      // Get equipment with owner info
      const equipment = await prisma.equipment.findUnique({
        where: { id: input.equipmentId },
        select: {
          id: true,
          titleEn: true,
          status: true,
          ownerId: true,
          owner: {
            select: {
              phone: true,
              email: true,
              fullName: true,
            },
          },
        },
      });

      if (!equipment) {
        return ServiceResult.fail(ErrorCodes.NOT_FOUND, 'Equipment not found');
      }

      if (equipment.status !== 'ACTIVE') {
        return ServiceResult.fail(
          ErrorCodes.EQUIPMENT_NOT_AVAILABLE,
          'Equipment is not available'
        );
      }

      // Create lead and increment count in transaction
      const lead = await prisma.$transaction(async (tx) => {
        const newLead = await tx.lead.create({
          data: {
            equipmentId: input.equipmentId,
            name: user.fullName || 'Anonymous',
            phone: user.phone!,
            email: user.email,
            message: input.message || null,
            interestedIn: input.interestedIn,
          },
        });

        // Atomically increment lead count
        await tx.equipment.update({
          where: { id: input.equipmentId },
          data: { leadCount: { increment: 1 } },
        });

        return newLead;
      });

      // Send SMS notification (fire-and-forget)
      notifyOwnerOfNewLead({
        ownerPhone: equipment.owner.phone,
        ownerName: equipment.owner.fullName,
        equipmentTitle: equipment.titleEn,
        leadName: user.fullName,
        interestedIn: input.interestedIn,
      });

      // Emit trust event (fire-and-forget)
      trustEventsService.onLeadCreated({
        leadId: lead.id,
        equipmentId: equipment.id,
        ownerId: equipment.ownerId,
      }).catch(() => {});

      return ServiceResult.ok({
        lead: {
          id: lead.id,
          status: lead.status,
        },
        contact: {
          phone: equipment.owner.phone,
          name: equipment.owner.fullName,
        },
      });
    } catch (error) {
      console.error('LeadService.create error:', error);
      return ServiceResult.fail(
        ErrorCodes.DATABASE_ERROR,
        'Failed to create lead'
      );
    }
  }

  /**
   * List leads for equipment owned by a user
   */
  async listForOwner(options: ListLeadsOptions): Promise<ServiceResult<PaginatedLeads>> {
    const { ownerId, status, equipmentId, page = 1, limit = 20 } = options;
    const safeLimit = Math.min(limit, 50);

    try {
      const where: Prisma.LeadWhereInput = {
        equipment: {
          ownerId,
        },
      };

      if (status) {
        where.status = status as Lead['status'];
      }

      if (equipmentId) {
        where.equipmentId = equipmentId;
      }

      const [total, leads] = await Promise.all([
        prisma.lead.count({ where }),
        prisma.lead.findMany({
          where,
          include: {
            equipment: {
              select: {
                id: true,
                titleEn: true,
                make: true,
                model: true,
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * safeLimit,
          take: safeLimit,
        }),
      ]);

      return ServiceResult.ok({
        leads: leads as LeadWithEquipment[],
        pagination: {
          page,
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit),
        },
      });
    } catch (error) {
      console.error('LeadService.listForOwner error:', error);
      return ServiceResult.fail(
        ErrorCodes.DATABASE_ERROR,
        'Failed to list leads'
      );
    }
  }

  /**
   * Update lead status
   */
  async updateStatus(
    leadId: string,
    newStatus: 'NEW' | 'VIEWED' | 'CONTACTED' | 'CONVERTED' | 'CLOSED',
    ownerId: string
  ): Promise<ServiceResult<Lead>> {
    try {
      // Verify ownership through equipment
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          id: true,
          status: true,
          ownerRespondedAt: true,
          equipment: {
            select: { ownerId: true },
          },
        },
      });

      if (!lead) {
        return ServiceResult.fail(ErrorCodes.NOT_FOUND, 'Lead not found');
      }

      if (lead.equipment.ownerId !== ownerId) {
        return ServiceResult.fail(
          ErrorCodes.FORBIDDEN,
          'Not authorized to update this lead'
        );
      }

      // Track first response for trust metrics
      const isFirstResponse =
        lead.status === 'NEW' &&
        (newStatus === 'VIEWED' || newStatus === 'CONTACTED' || newStatus === 'CONVERTED');

      const updated = await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: newStatus,
          // Record first response timestamp
          ...(isFirstResponse && !lead.ownerRespondedAt
            ? { ownerRespondedAt: new Date() }
            : {}),
        },
      });

      // Emit trust event if this is a response (fire-and-forget)
      if (isFirstResponse && !lead.ownerRespondedAt) {
        trustEventsService.onLeadResponded({
          leadId,
          ownerId,
          respondedAt: new Date(),
        }).catch(() => {});
      }

      return ServiceResult.ok(updated);
    } catch (error) {
      console.error('LeadService.updateStatus error:', error);
      return ServiceResult.fail(
        ErrorCodes.DATABASE_ERROR,
        'Failed to update lead'
      );
    }
  }
}

// Export singleton instance
export const leadService = new LeadService();
