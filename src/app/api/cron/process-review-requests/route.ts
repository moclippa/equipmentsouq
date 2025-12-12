/**
 * Process Review Requests Cron Job
 *
 * POST /api/cron/process-review-requests
 *
 * Called by a cron job to process pending review requests.
 * This endpoint:
 * 1. Finds review requests that are due (7 days after lead)
 * 2. Sends notifications to renters to leave reviews
 * 3. Expires old requests (30 days after request)
 *
 * Security: This endpoint is protected by a secret header.
 */

import { NextRequest } from 'next/server';
import { successResponse, forbiddenResponse } from '@/lib/api-response';
import { trustEventsService } from '@/services/trust';

// =============================================================================
// POST /api/cron/process-review-requests
// Process pending review requests (protected by secret)
// =============================================================================

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return forbiddenResponse('Invalid cron secret');
  }

  const startTime = Date.now();

  // Process pending review requests
  const processed = await trustEventsService.processPendingReviewRequests();

  // Expire old requests
  const expired = await trustEventsService.expireOldRequests();

  const duration = Date.now() - startTime;

  return successResponse({
    success: true,
    message: 'Review requests processed',
    processed: processed.processed,
    errors: processed.errors,
    expired,
    durationMs: duration,
  });
}

// Also allow GET for Vercel cron jobs
export async function GET(request: NextRequest) {
  return POST(request);
}
