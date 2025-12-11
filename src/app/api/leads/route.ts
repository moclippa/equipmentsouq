import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyOwnerOfNewLead } from "@/lib/notifications/sms";

const createLeadSchema = z.object({
  equipmentId: z.string().min(1),
  name: z.string().min(1).max(100),
  phone: z.string().min(8).max(20),
  email: z.string().email().optional().or(z.literal("")),
  message: z.string().max(1000).optional(),
  interestedIn: z.enum(["rent", "buy", "both"]),
});

/**
 * POST /api/leads
 * Create a new lead (someone interested in equipment)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createLeadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Get equipment to verify it exists and get owner info
    const equipment = await prisma.equipment.findUnique({
      where: { id: data.equipmentId },
      select: {
        id: true,
        titleEn: true,
        status: true,
        ownerId: true,
        owner: {
          select: {
            phone: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { error: "Equipment not found" },
        { status: 404 }
      );
    }

    if (equipment.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Equipment is not available" },
        { status: 400 }
      );
    }

    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        equipmentId: data.equipmentId,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        message: data.message || null,
        interestedIn: data.interestedIn,
      },
    });

    // Increment lead count on equipment
    await prisma.equipment.update({
      where: { id: data.equipmentId },
      data: { leadCount: { increment: 1 } },
    });

    // Send SMS notification to owner (fire-and-forget)
    notifyOwnerOfNewLead({
      ownerPhone: equipment.owner.phone,
      ownerName: equipment.owner.fullName,
      equipmentTitle: equipment.titleEn,
      leadName: data.name,
      interestedIn: data.interestedIn,
    });

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        status: lead.status,
      },
      // Return owner contact info so user can reach out directly
      contact: {
        phone: equipment.owner.phone,
        name: equipment.owner.fullName,
      },
    });
  } catch (error) {
    console.error("Create lead error:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/leads
 * List leads for the current user's equipment (owner view)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const equipmentId = searchParams.get("equipmentId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    // Build where clause - only show leads for equipment owned by this user
    const where: Record<string, unknown> = {
      equipment: {
        ownerId: session.user.id,
      },
    };

    if (status) {
      where.status = status;
    }

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    const total = await prisma.lead.count({ where });

    const leads = await prisma.lead.findMany({
      where,
      include: {
        equipment: {
          select: {
            id: true,
            titleEn: true,
            make: true,
            model: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List leads error:", error);
    return NextResponse.json(
      { error: "Failed to list leads" },
      { status: 500 }
    );
  }
}
