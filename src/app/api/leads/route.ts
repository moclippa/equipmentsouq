import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import {
  successResponse,
  validationErrorResponse,
  requireAuth,
  serviceResultToResponse,
} from "@/lib/api-response";
import { leadService, LeadUser } from "@/services/lead.service";

const createLeadSchema = z.object({
  equipmentId: z.string().min(1),
  message: z.string().max(1000).optional(),
  interestedIn: z.enum(["rent", "buy", "both"]),
});

/**
 * POST /api/leads
 * Create a new lead (someone interested in equipment)
 * Requires: authenticated user with verified phone
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const authError = requireAuth(session);
  if (authError) return authError;

  const body = await request.json();
  const validation = createLeadSchema.safeParse(body);

  if (!validation.success) {
    return validationErrorResponse("Invalid request data", {
      issues: validation.error.issues,
    });
  }

  // Build user object from session for service
  const user: LeadUser = {
    id: session!.user!.id!,
    fullName: session!.user!.fullName || null,
    phone: session!.user!.phone || null,
    email: session!.user!.email || null,
    phoneVerified: session!.user!.phoneVerified || false,
  };

  const result = await leadService.create(validation.data, user);

  if (!result.success) {
    return serviceResultToResponse(result);
  }

  return successResponse(result.data);
}

/**
 * GET /api/leads
 * List leads for the current user's equipment (owner view)
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  const authError = requireAuth(session);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const equipmentId = searchParams.get("equipmentId") || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const result = await leadService.listForOwner({
    ownerId: session!.user!.id!,
    status,
    equipmentId,
    page,
    limit,
  });

  if (!result.success) {
    return serviceResultToResponse(result);
  }

  return successResponse(result.data);
}
