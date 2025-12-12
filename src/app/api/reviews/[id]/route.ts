/**
 * Review Detail API Routes
 *
 * GET /api/reviews/[id] - Get a specific review
 * POST /api/reviews/[id]/respond - Owner responds to a review
 * POST /api/reviews/[id]/flag - Flag a review for moderation
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import {
  successResponse,
  validationErrorResponse,
  notFoundResponse,
  serviceResultToResponse,
  requireAuth,
} from '@/lib/api-response';
import { reviewService } from '@/services/trust';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const respondSchema = z.object({
  response: z.string().min(1).max(2000),
});

// =============================================================================
// GET /api/reviews/[id]
// Get a specific review by ID
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await reviewService.getReview(id);

  if (!result.success) {
    return serviceResultToResponse(result);
  }

  if (!result.data) {
    return notFoundResponse('Review');
  }

  return successResponse(result.data);
}

// =============================================================================
// PATCH /api/reviews/[id]
// Owner responds to a review
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const authError = requireAuth(session);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  // Check if this is a response action
  if (body.response !== undefined) {
    const validation = respondSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse('Invalid response data', {
        issues: validation.error.issues,
      });
    }

    const result = await reviewService.respondToReview(
      {
        reviewId: id,
        response: validation.data.response,
      },
      session!.user!.id!
    );

    if (!result.success) {
      return serviceResultToResponse(result);
    }

    return successResponse({
      success: true,
      message: 'Response added successfully',
    });
  }

  // Check if this is a flag action
  if (body.flag !== undefined) {
    const result = await reviewService.flagReview(id, body.reason || 'No reason provided');

    if (!result.success) {
      return serviceResultToResponse(result);
    }

    return successResponse({
      success: true,
      message: 'Review flagged for moderation',
    });
  }

  return validationErrorResponse('Invalid action');
}
