/**
 * Review Service
 *
 * Handles the owner review system:
 * - Review request management (sent 7 days after lead)
 * - Review submission by renters
 * - Owner responses to reviews
 * - Review moderation
 *
 * Reviews are tied to leads to ensure authenticity - only users
 * who actually contacted an owner can leave a review.
 */

import { prisma } from '@/lib/prisma';
import { ServiceResult, ErrorCodes } from '../base';
import {
  ReviewWithRelations,
  CreateReviewInput,
  OwnerRespondInput,
  TRUST_THRESHOLDS,
} from '@/types/trust';
import { trustScoringService } from './trust-scoring.service';
import type { ReviewStatus } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface ReviewRequestInfo {
  id: string;
  leadId: string;
  canSubmit: boolean;
  expiredAt: Date | null;
  sentAt: Date;
  equipment: {
    id: string;
    titleEn: string;
    titleAr: string | null;
  };
  owner: {
    id: string;
    fullName: string | null;
  };
}

export interface ListReviewsOptions {
  ownerId?: string;
  reviewerId?: string;
  status?: ReviewStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedReviews {
  reviews: ReviewWithRelations[];
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

export class ReviewService {
  /**
   * Create a review request for a lead
   * Called automatically 7 days after lead creation
   */
  async createReviewRequest(leadId: string): Promise<ServiceResult<{ requestId: string }>> {
    try {
      // Get lead with equipment
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          reviewRequest: true,
        },
      });

      if (!lead) {
        return ServiceResult.fail(ErrorCodes.NOT_FOUND, 'Lead not found');
      }

      // Check if review request already exists
      if (lead.reviewRequest) {
        return ServiceResult.ok({ requestId: lead.reviewRequest.id });
      }

      // Calculate expiry date (30 days from now)
      const expiredAt = new Date();
      expiredAt.setDate(expiredAt.getDate() + TRUST_THRESHOLDS.REVIEW_EXPIRY_DAYS);

      // Create review request with contact info from lead
      const request = await prisma.reviewRequest.create({
        data: {
          leadId,
          reviewerEmail: lead.email,
          reviewerPhone: lead.phone,
          sentAt: new Date(),
          expiredAt,
        },
      });

      return ServiceResult.ok({ requestId: request.id });
    } catch (error) {
      console.error('ReviewService.createReviewRequest error:', error);
      return ServiceResult.fail(ErrorCodes.DATABASE_ERROR, 'Failed to create review request');
    }
  }

  /**
   * Get review request details for a user
   */
  async getReviewRequest(
    requestId: string,
    userId: string
  ): Promise<ServiceResult<ReviewRequestInfo | null>> {
    try {
      const request = await prisma.reviewRequest.findUnique({
        where: { id: requestId },
        include: {
          lead: {
            include: {
              equipment: {
                select: {
                  id: true,
                  titleEn: true,
                  titleAr: true,
                  owner: {
                    select: {
                      id: true,
                      fullName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!request) {
        return ServiceResult.ok(null);
      }

      // Verify the request belongs to this user (by phone or email match)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, email: true },
      });

      if (!user) {
        return ServiceResult.fail(ErrorCodes.NOT_FOUND, 'User not found');
      }

      // Match by phone or email
      const isOwner =
        (user.phone && request.reviewerPhone === user.phone) ||
        (user.email && request.reviewerEmail === user.email);

      if (!isOwner) {
        return ServiceResult.fail(ErrorCodes.FORBIDDEN, 'Not authorized to view this request');
      }

      const now = new Date();
      const canSubmit =
        !request.completedAt &&
        (!request.expiredAt || request.expiredAt > now);

      return ServiceResult.ok({
        id: request.id,
        leadId: request.leadId,
        canSubmit,
        expiredAt: request.expiredAt,
        sentAt: request.sentAt,
        equipment: {
          id: request.lead.equipment.id,
          titleEn: request.lead.equipment.titleEn,
          titleAr: request.lead.equipment.titleAr,
        },
        owner: request.lead.equipment.owner,
      });
    } catch (error) {
      console.error('ReviewService.getReviewRequest error:', error);
      return ServiceResult.fail(ErrorCodes.DATABASE_ERROR, 'Failed to get review request');
    }
  }

  /**
   * Get pending review requests for a user
   */
  async getPendingRequests(userId: string): Promise<ServiceResult<ReviewRequestInfo[]>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, email: true },
      });

      if (!user) {
        return ServiceResult.fail(ErrorCodes.NOT_FOUND, 'User not found');
      }

      const now = new Date();

      // Build OR conditions based on available contact info
      const orConditions: { reviewerPhone?: string; reviewerEmail?: string }[] = [];
      if (user.phone) orConditions.push({ reviewerPhone: user.phone });
      if (user.email) orConditions.push({ reviewerEmail: user.email });

      if (orConditions.length === 0) {
        return ServiceResult.ok([]);
      }

      // Find pending review requests for this user's contact info
      const requests = await prisma.reviewRequest.findMany({
        where: {
          completedAt: null,
          OR: [
            { expiredAt: null },
            { expiredAt: { gt: now } },
          ],
          AND: {
            OR: orConditions,
          },
        },
        include: {
          lead: {
            include: {
              equipment: {
                select: {
                  id: true,
                  titleEn: true,
                  titleAr: true,
                  owner: {
                    select: {
                      id: true,
                      fullName: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { sentAt: 'desc' },
      });

      return ServiceResult.ok(
        requests.map((request) => ({
          id: request.id,
          leadId: request.leadId,
          canSubmit: true,
          expiredAt: request.expiredAt,
          sentAt: request.sentAt,
          equipment: {
            id: request.lead.equipment.id,
            titleEn: request.lead.equipment.titleEn,
            titleAr: request.lead.equipment.titleAr,
          },
          owner: request.lead.equipment.owner,
        }))
      );
    } catch (error) {
      console.error('ReviewService.getPendingRequests error:', error);
      return ServiceResult.fail(ErrorCodes.DATABASE_ERROR, 'Failed to get pending requests');
    }
  }

  /**
   * Submit a review for an owner
   */
  async submitReview(
    input: CreateReviewInput,
    reviewerId: string
  ): Promise<ServiceResult<{ reviewId: string }>> {
    try {
      // Get lead with review request and owner
      const lead = await prisma.lead.findUnique({
        where: { id: input.leadId },
        include: {
          equipment: {
            select: {
              id: true,
              ownerId: true,
            },
          },
          review: true,
          reviewRequest: true,
        },
      });

      if (!lead) {
        return ServiceResult.fail(ErrorCodes.NOT_FOUND, 'Lead not found');
      }

      // Check if review already exists
      if (lead.review) {
        return ServiceResult.fail(ErrorCodes.REVIEW_ALREADY_EXISTS, 'Review already submitted for this lead');
      }

      // Verify reviewer owns this lead
      const reviewer = await prisma.user.findUnique({
        where: { id: reviewerId },
        select: { phone: true, email: true },
      });

      if (!reviewer) {
        return ServiceResult.fail(ErrorCodes.NOT_FOUND, 'Reviewer not found');
      }

      const isLeadOwner =
        (reviewer.phone && lead.phone === reviewer.phone) ||
        (reviewer.email && lead.email === reviewer.email);

      if (!isLeadOwner) {
        return ServiceResult.fail(ErrorCodes.FORBIDDEN, 'Not authorized to review this interaction');
      }

      // Prevent reviewing own listing
      if (lead.equipment.ownerId === reviewerId) {
        return ServiceResult.fail(
          ErrorCodes.CANNOT_REVIEW_OWN_LISTING,
          'Cannot review your own listing'
        );
      }

      // Check review request expiry if exists
      const now = new Date();
      if (lead.reviewRequest?.expiredAt && lead.reviewRequest.expiredAt < now) {
        return ServiceResult.fail(
          ErrorCodes.REVIEW_REQUEST_EXPIRED,
          'Review request has expired'
        );
      }

      // If no review request, check if lead is old enough
      if (!lead.reviewRequest) {
        const leadAge = now.getTime() - lead.createdAt.getTime();
        const minAge = TRUST_THRESHOLDS.REVIEW_DELAY_DAYS * 24 * 60 * 60 * 1000;
        if (leadAge < minAge) {
          return ServiceResult.fail(
            ErrorCodes.REVIEW_REQUEST_NOT_READY,
            `Please wait ${TRUST_THRESHOLDS.REVIEW_DELAY_DAYS} days after contacting the owner to leave a review`
          );
        }
      }

      // Calculate response time metrics
      let responseTimeHours: number | null = null;
      if (lead.ownerRespondedAt) {
        responseTimeHours = Math.round(
          (lead.ownerRespondedAt.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60)
        );
      }

      // Create review in transaction
      const review = await prisma.$transaction(async (tx) => {
        // Create the review
        const newReview = await tx.ownerReview.create({
          data: {
            leadId: input.leadId,
            ownerId: lead.equipment.ownerId,
            reviewerId,
            rating: input.rating,
            title: input.title,
            comment: input.comment,
            status: 'SUBMITTED',
            submittedAt: now,
            requestedAt: lead.reviewRequest?.sentAt || now,
            isVerified: true, // Verified because linked to lead
            responseTimeHours,
            didOwnerRespond: lead.ownerRespondedAt !== null,
          },
        });

        // Update review request if exists
        if (lead.reviewRequest) {
          await tx.reviewRequest.update({
            where: { id: lead.reviewRequest.id },
            data: { completedAt: now },
          });
        }

        return newReview;
      });

      // Recalculate owner trust metrics (fire and forget)
      trustScoringService.recalculate(lead.equipment.ownerId).catch(() => {});

      return ServiceResult.ok({ reviewId: review.id });
    } catch (error) {
      console.error('ReviewService.submitReview error:', error);
      return ServiceResult.fail(ErrorCodes.DATABASE_ERROR, 'Failed to submit review');
    }
  }

  /**
   * Owner responds to a review
   */
  async respondToReview(
    input: OwnerRespondInput,
    ownerId: string
  ): Promise<ServiceResult<void>> {
    try {
      const review = await prisma.ownerReview.findUnique({
        where: { id: input.reviewId },
        select: {
          ownerId: true,
          ownerResponse: true,
        },
      });

      if (!review) {
        return ServiceResult.fail(ErrorCodes.NOT_FOUND, 'Review not found');
      }

      if (review.ownerId !== ownerId) {
        return ServiceResult.fail(ErrorCodes.FORBIDDEN, 'Not authorized to respond to this review');
      }

      if (review.ownerResponse) {
        return ServiceResult.fail(ErrorCodes.ALREADY_EXISTS, 'Already responded to this review');
      }

      await prisma.ownerReview.update({
        where: { id: input.reviewId },
        data: {
          ownerResponse: input.response,
          respondedAt: new Date(),
          status: 'RESPONDED',
        },
      });

      return ServiceResult.ok(undefined);
    } catch (error) {
      console.error('ReviewService.respondToReview error:', error);
      return ServiceResult.fail(ErrorCodes.DATABASE_ERROR, 'Failed to respond to review');
    }
  }

  /**
   * List reviews with filtering and pagination
   */
  async listReviews(options: ListReviewsOptions): Promise<ServiceResult<PaginatedReviews>> {
    const { ownerId, reviewerId, status, page = 1, limit = 20 } = options;
    const safeLimit = Math.min(limit, 50);

    try {
      const where: {
        ownerId?: string;
        reviewerId?: string;
        status?: ReviewStatus;
      } = {};

      if (ownerId) where.ownerId = ownerId;
      if (reviewerId) where.reviewerId = reviewerId;
      if (status) where.status = status;

      const [total, reviews] = await Promise.all([
        prisma.ownerReview.count({ where }),
        prisma.ownerReview.findMany({
          where,
          include: {
            owner: {
              select: { id: true, fullName: true, avatarUrl: true },
            },
            reviewer: {
              select: { id: true, fullName: true, avatarUrl: true },
            },
            lead: {
              select: {
                equipment: {
                  select: { id: true, titleEn: true, titleAr: true },
                },
              },
            },
          },
          orderBy: { submittedAt: 'desc' },
          skip: (page - 1) * safeLimit,
          take: safeLimit,
        }),
      ]);

      // Transform to ReviewWithRelations format
      const transformedReviews: ReviewWithRelations[] = reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        submittedAt: review.submittedAt,
        owner: review.owner,
        reviewer: review.reviewer,
        equipment: review.lead.equipment,
        ownerResponse: review.ownerResponse,
        respondedAt: review.respondedAt,
        isVerified: review.isVerified,
        status: review.status,
        responseTimeHours: review.responseTimeHours,
        didOwnerRespond: review.didOwnerRespond,
      }));

      return ServiceResult.ok({
        reviews: transformedReviews,
        pagination: {
          page,
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit),
        },
      });
    } catch (error) {
      console.error('ReviewService.listReviews error:', error);
      return ServiceResult.fail(ErrorCodes.DATABASE_ERROR, 'Failed to list reviews');
    }
  }

  /**
   * Get a single review by ID
   */
  async getReview(reviewId: string): Promise<ServiceResult<ReviewWithRelations | null>> {
    try {
      const review = await prisma.ownerReview.findUnique({
        where: { id: reviewId },
        include: {
          owner: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
          reviewer: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
          lead: {
            select: {
              equipment: {
                select: { id: true, titleEn: true, titleAr: true },
              },
            },
          },
        },
      });

      if (!review) {
        return ServiceResult.ok(null);
      }

      return ServiceResult.ok({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        submittedAt: review.submittedAt,
        owner: review.owner,
        reviewer: review.reviewer,
        equipment: review.lead.equipment,
        ownerResponse: review.ownerResponse,
        respondedAt: review.respondedAt,
        isVerified: review.isVerified,
        status: review.status,
        responseTimeHours: review.responseTimeHours,
        didOwnerRespond: review.didOwnerRespond,
      });
    } catch (error) {
      console.error('ReviewService.getReview error:', error);
      return ServiceResult.fail(ErrorCodes.DATABASE_ERROR, 'Failed to get review');
    }
  }

  /**
   * Flag a review for moderation (admin or owner)
   */
  async flagReview(reviewId: string, reason: string): Promise<ServiceResult<void>> {
    try {
      await prisma.ownerReview.update({
        where: { id: reviewId },
        data: {
          status: 'FLAGGED',
          flaggedReason: reason,
        },
      });

      return ServiceResult.ok(undefined);
    } catch (error) {
      console.error('ReviewService.flagReview error:', error);
      return ServiceResult.fail(ErrorCodes.DATABASE_ERROR, 'Failed to flag review');
    }
  }
}

// Export singleton instance
export const reviewService = new ReviewService();
