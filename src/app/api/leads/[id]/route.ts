import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

/**
 * GET /api/leads/[id]
 * Get lead details (owner only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        equipment: {
          select: {
            id: true,
            titleEn: true,
            make: true,
            model: true,
            ownerId: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    // Only owner can view lead details
    if (lead.equipment.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    // Mark as viewed if first time
    if (!lead.ownerViewedAt) {
      await prisma.lead.update({
        where: { id },
        data: {
          ownerViewedAt: new Date(),
          status: "VIEWED",
        },
      });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("Get lead error:", error);
    return NextResponse.json(
      { error: "Failed to get lead" },
      { status: 500 }
    );
  }
}

const updateLeadSchema = z.object({
  status: z.enum(["VIEWED", "CONTACTED", "CONVERTED", "CLOSED"]),
});

/**
 * PATCH /api/leads/[id]
 * Update lead status (owner only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateLeadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        equipment: {
          select: { ownerId: true },
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    // Only owner can update lead
    if (lead.equipment.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    const { status } = validation.data;

    const updateData: Record<string, unknown> = { status };

    // Set timestamp based on status
    if (status === "CONTACTED" && !lead.ownerContactedAt) {
      updateData.ownerContactedAt = new Date();
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      lead: updatedLead,
    });
  } catch (error) {
    console.error("Update lead error:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    );
  }
}
