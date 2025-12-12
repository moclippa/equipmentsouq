/**
 * Reviews API Routes
 *
 * GET /api/reviews - List reviews (filter by owner or reviewer)
 * POST /api/reviews - Submit a new review for an owner
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import {
  successResponse,
  validationErrorResponse,
  serviceResultToResponse,
  requireVerifiedPhone,
} from '@/lib/api-response';
import { reviewService } from '@/services/trust';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createReviewSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  rating: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'VERY_POOR']),
  title: z.string().max(100).optional(),
  comment: z.string().max(2000).optional(),
});

// =============================================================================
// GET /api/reviews
// List reviews with optional filters
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const ownerId = searchParams.get('ownerId') || undefined;
  const reviewerId = searchParams.get('reviewerId') || undefined;
  const status = searchParams.get('status') as 'PENDING' | 'SUBMITTED' | 'RESPONDED' | 'FLAGGED' | undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  const result = await reviewService.listReviews({
    ownerId,
    reviewerId,
    status,
    page,
    limit,
  });

  return serviceResultToResponse(result);
}

// =============================================================================
// POST /api/reviews
// Submit a new review (requires verified phone)
// =============================================================================

export async function POST(request: NextRequest) {
  const session = await auth();
  const phoneError = requireVerifiedPhone(session);
  if (phoneError) return phoneError;

  const body = await request.json();
  const validation = createReviewSchema.safeParse(body);

  if (!validation.success) {
    return validationErrorResponse('Invalid review data', {
      issues: validation.error.issues,
    });
  }

  const result = await reviewService.submitReview(
    {
      leadId: validation.data.leadId,
      rating: validation.data.rating,
      title: validation.data.title,
      comment: validation.data.comment,
    },
    session!.user!.id!
  );

  if (!result.success) {
    return serviceResultToResponse(result);
  }

  return successResponse(
    {
      success: true,
      message: 'Review submitted successfully',
      reviewId: result.data!.reviewId,
    },
    201
  );
}
