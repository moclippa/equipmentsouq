import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createBlockSchema = z.object({
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid start date",
  }),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid end date",
  }),
  isAvailable: z.boolean().default(false),
  reason: z.string().optional(),
});

const deleteBlockSchema = z.object({
  blockId: z.string(),
});

// GET - Fetch availability blocks for an equipment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause
    const where: {
      equipmentId: string;
      startDate?: { gte: Date };
      endDate?: { lte: Date };
    } = {
      equipmentId: id,
    };

    if (startDate) {
      where.startDate = { gte: new Date(startDate) };
    }
    if (endDate) {
      where.endDate = { lte: new Date(endDate) };
    }

    const blocks = await prisma.availabilityBlock.findMany({
      where,
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json({ blocks });
  } catch (error) {
    console.error("Failed to fetch availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

// POST - Create a new availability block
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    if (equipment.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = createBlockSchema.parse(body);

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    // Validate date range
    if (endDate < startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Check for overlapping blocks
    const overlapping = await prisma.availabilityBlock.findFirst({
      where: {
        equipmentId: id,
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { error: "This date range overlaps with an existing block" },
        { status: 400 }
      );
    }

    const block = await prisma.availabilityBlock.create({
      data: {
        equipmentId: id,
        startDate,
        endDate,
        isAvailable: data.isAvailable,
        reason: data.reason,
      },
    });

    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }
    console.error("Failed to create availability block:", error);
    return NextResponse.json(
      { error: "Failed to create availability block" },
      { status: 500 }
    );
  }
}

// DELETE - Remove an availability block
export async function DELETE(
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
    const { blockId } = deleteBlockSchema.parse(body);

    // Verify ownership through equipment
    const block = await prisma.availabilityBlock.findUnique({
      where: { id: blockId },
      include: {
        equipment: { select: { ownerId: true } },
      },
    });

    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    if (block.equipment.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.availabilityBlock.delete({
      where: { id: blockId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }
    console.error("Failed to delete availability block:", error);
    return NextResponse.json(
      { error: "Failed to delete availability block" },
      { status: 500 }
    );
  }
}
