/**
 * Equipment Quality Score API Routes
 *
 * GET /api/equipment/[id]/quality - Get quality score for an equipment listing
 * POST /api/equipment/[id]/quality - Recalculate quality score (owner only)
 */

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  serviceResultToResponse,
  requireAuth,
} from '@/lib/api-response';
import { qualityScoringService } from '@/services/trust';

// =============================================================================
// GET /api/equipment/[id]/quality
// Get quality score for a listing (public)
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await qualityScoringService.getScore(id);

  if (!result.success) {
    return serviceResultToResponse(result);
  }

  if (!result.data) {
    // Quality score not yet calculated - return default
    return successResponse({
      equipmentId: id,
      photoScore: 0,
      descriptionScore: 0,
      specificationScore: 0,
      overallScore: 0,
      message: 'Quality score not yet calculated',
    });
  }

  return successResponse(result.data);
}

// =============================================================================
// POST /api/equipment/[id]/quality
// Recalculate quality score (owner only)
// =============================================================================

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const authError = requireAuth(session);
  if (authError) return authError;

  const { id } = await params;

  // Verify ownership
  const equipment = await prisma.equipment.findUnique({
    where: { id },
    select: { ownerId: true },
  });

  if (!equipment) {
    return notFoundResponse('Equipment');
  }

  if (equipment.ownerId !== session!.user!.id) {
    return forbiddenResponse('Not authorized to recalculate quality score');
  }

  const result = await qualityScoringService.calculateAndSave(id);

  if (!result.success) {
    return serviceResultToResponse(result);
  }

  return successResponse({
    success: true,
    message: 'Quality score recalculated',
    ...result.data,
  });
}
