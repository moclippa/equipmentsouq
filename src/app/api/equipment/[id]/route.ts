import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  successResponse,
  serviceResultToResponse,
  requireAuth,
} from "@/lib/api-response";
import { equipmentService } from "@/services/equipment.service";

/**
 * GET /api/equipment/[id]
 * Get equipment details by ID
 *
 * Uses Redis caching (10 min TTL) for faster response times.
 * Cache is invalidated on equipment update/delete.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await equipmentService.getById(id);

  if (!result.success) {
    return serviceResultToResponse(result);
  }

  return successResponse({ equipment: result.data });
}

/**
 * PATCH /api/equipment/[id]
 * Update equipment (owner only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const authError = requireAuth(session);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  const result = await equipmentService.update(id, body, session!.user!.id!);

  if (!result.success) {
    return serviceResultToResponse(result);
  }

  return successResponse({ equipment: result.data });
}

/**
 * DELETE /api/equipment/[id]
 * Delete equipment (owner only) - soft delete via archive
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const authError = requireAuth(session);
  if (authError) return authError;

  const { id } = await params;
  const result = await equipmentService.archive(id, session!.user!.id!);

  if (!result.success) {
    return serviceResultToResponse(result);
  }

  return successResponse({ success: true });
}
