/**
 * Review Requests API Routes
 *
 * GET /api/reviews/requests - Get pending review requests for the current user
 */

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import {
  serviceResultToResponse,
  requireAuth,
} from '@/lib/api-response';
import { reviewService } from '@/services/trust';

// =============================================================================
// GET /api/reviews/requests
// Get pending review requests for the authenticated user
// =============================================================================

export async function GET(_request: NextRequest) {
  const session = await auth();
  const authError = requireAuth(session);
  if (authError) return authError;

  const result = await reviewService.getPendingRequests(session!.user!.id!);

  return serviceResultToResponse(result);
}
