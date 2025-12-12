/**
 * Trust Events Service
 *
 * Handles event-driven trust metric updates.
 * This service is called by other parts of the system when events occur
 * that should trigger trust recalculations.
 *
 * Events that trigger recalculation:
 * - Lead created → Schedule review request
 * - Lead status changed to CONTACTED/CONVERTED → Record response time
 * - Review submitted → Recalculate owner trust
 * - Listing created/updated → Recalculate quality score
 * - Business verification approved → Update badges
 *
 * Design: Event handlers are fire-and-forget to not block main operations.
 * Failures are logged but don't affect the triggering operation.
 */

import { prisma } from '@/lib/prisma';
import { trustScoringService } from './trust-scoring.service';
import { qualityScoringService } from './quality-scoring.service';
import { TRUST_THRESHOLDS } from '@/types/trust';

// =============================================================================
// TYPES
// =============================================================================

export interface LeadCreatedEvent {
  leadId: string;
  equipmentId: string;
  ownerId: string;
}

export interface LeadRespondedEvent {
  leadId: string;
  ownerId: string;
  respondedAt: Date;
}

export interface ReviewSubmittedEvent {
  reviewId: string;
  ownerId: string;
}

export interface ListingCreatedEvent {
  equipmentId: string;
  ownerId: string;
}

export interface ListingUpdatedEvent {
  equipmentId: string;
  ownerId: string;
}

export interface VerificationApprovedEvent {
  ownerId: string;
  verificationType: 'business' | 'identity';
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class TrustEventsService {
  /**
   * Handle lead creation event
   * - Recalculate owner metrics (new lead count)
   * - Schedule review request for 7 days later
   */
  async onLeadCreated(event: LeadCreatedEvent): Promise<void> {
    try {
      // Recalculate trust metrics to include new lead
      await trustScoringService.recalculate(event.ownerId);

      // Schedule review request
      await this.scheduleReviewRequest(event.leadId);
    } catch (error) {
      console.error('TrustEventsService.onLeadCreated error:', error);
    }
  }

  /**
   * Handle lead response event
   * - Record response timestamp
   * - Recalculate response metrics
   */
  async onLeadResponded(event: LeadRespondedEvent): Promise<void> {
    try {
      // Update lead with response timestamp
      await prisma.lead.update({
        where: { id: event.leadId },
        data: { ownerRespondedAt: event.respondedAt },
      });

      // Recalculate trust metrics
      await trustScoringService.recalculate(event.ownerId);
    } catch (error) {
      console.error('TrustEventsService.onLeadResponded error:', error);
    }
  }

  /**
   * Handle review submission event
   * - Recalculate owner trust score and badges
   */
  async onReviewSubmitted(event: ReviewSubmittedEvent): Promise<void> {
    try {
      await trustScoringService.recalculate(event.ownerId);
    } catch (error) {
      console.error('TrustEventsService.onReviewSubmitted error:', error);
    }
  }

  /**
   * Handle listing creation event
   * - Calculate initial quality score
   * - Recalculate owner listing metrics
   */
  async onListingCreated(event: ListingCreatedEvent): Promise<void> {
    try {
      // Calculate quality score for new listing
      await qualityScoringService.calculateAndSave(event.equipmentId);

      // Recalculate owner trust metrics
      await trustScoringService.recalculate(event.ownerId);
    } catch (error) {
      console.error('TrustEventsService.onListingCreated error:', error);
    }
  }

  /**
   * Handle listing update event
   * - Recalculate quality score
   * - Recalculate owner listing metrics if significant change
   */
  async onListingUpdated(event: ListingUpdatedEvent): Promise<void> {
    try {
      // Recalculate quality score
      await qualityScoringService.calculateAndSave(event.equipmentId);

      // Recalculate owner trust metrics
      await trustScoringService.recalculate(event.ownerId);
    } catch (error) {
      console.error('TrustEventsService.onListingUpdated error:', error);
    }
  }

  /**
   * Handle verification approval event
   * - Recalculate owner badges (VERIFIED_BUSINESS or VERIFIED_IDENTITY)
   */
  async onVerificationApproved(event: VerificationApprovedEvent): Promise<void> {
    try {
      await trustScoringService.recalculate(event.ownerId);
    } catch (error) {
      console.error('TrustEventsService.onVerificationApproved error:', error);
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Schedule a review request to be sent after the delay period
   */
  private async scheduleReviewRequest(leadId: string): Promise<void> {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          id: true,
          createdAt: true,
          phone: true,
          email: true,
        },
      });

      if (!lead) return;

      // Calculate when the review request should be sent
      const sentAt = new Date(lead.createdAt);
      sentAt.setDate(sentAt.getDate() + TRUST_THRESHOLDS.REVIEW_DELAY_DAYS);

      // Calculate expiry (30 days after sent)
      const expiredAt = new Date(sentAt);
      expiredAt.setDate(expiredAt.getDate() + TRUST_THRESHOLDS.REVIEW_EXPIRY_DAYS);

      // Create the review request
      await prisma.reviewRequest.create({
        data: {
          leadId: lead.id,
          reviewerPhone: lead.phone,
          reviewerEmail: lead.email,
          sentAt,
          expiredAt,
        },
      });
    } catch (error) {
      // If request already exists (unique constraint), that's fine
      if ((error as { code?: string }).code !== 'P2002') {
        console.error('TrustEventsService.scheduleReviewRequest error:', error);
      }
    }
  }

  /**
   * Process pending review requests that are now active
   * This should be called by a cron job
   */
  async processPendingReviewRequests(): Promise<{ processed: number; errors: number }> {
    const now = new Date();
    let processed = 0;
    let errors = 0;

    try {
      // Find requests that are due and not expired or completed
      const pendingRequests = await prisma.reviewRequest.findMany({
        where: {
          sentAt: { lte: now },
          completedAt: null,
          OR: [
            { expiredAt: null },
            { expiredAt: { gt: now } },
          ],
        },
        include: {
          lead: {
            include: {
              equipment: {
                select: {
                  titleEn: true,
                  owner: {
                    select: { fullName: true },
                  },
                },
              },
            },
          },
        },
        take: 100, // Process in batches
      });

      for (const request of pendingRequests) {
        try {
          // In production, send email/SMS notification to the renter
          console.log(
            `[ReviewRequest] Would send review request to ${request.reviewerPhone || request.reviewerEmail}`,
            `for equipment "${request.lead.equipment.titleEn}" owned by ${request.lead.equipment.owner.fullName}`
          );

          processed++;
        } catch (err) {
          console.error(`Failed to process review request ${request.id}:`, err);
          errors++;
        }
      }
    } catch (error) {
      console.error('TrustEventsService.processPendingReviewRequests error:', error);
    }

    return { processed, errors };
  }

  /**
   * Expire old review requests
   * This should be called by a cron job
   */
  async expireOldRequests(): Promise<number> {
    const now = new Date();

    try {
      // Mark requests as expired by setting expiredAt if not already set
      // The schema uses expiredAt to track when it expires, and completedAt to track completion
      // Requests with expiredAt < now and completedAt = null are considered expired

      // Count how many are now expired (for logging purposes)
      const expiredCount = await prisma.reviewRequest.count({
        where: {
          completedAt: null,
          expiredAt: { lt: now },
        },
      });

      return expiredCount;
    } catch (error) {
      console.error('TrustEventsService.expireOldRequests error:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const trustEventsService = new TrustEventsService();
