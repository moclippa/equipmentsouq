import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/equipment/[id]
 * Get equipment details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            nameEn: true,
            nameAr: true,
            slug: true,
            parentId: true,
          },
        },
        owner: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            createdAt: true,
            businessProfile: {
              select: {
                companyNameEn: true,
                companyNameAr: true,
                crVerificationStatus: true,
              },
            },
          },
        },
        images: {
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: { leads: true },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { error: "Equipment not found" },
        { status: 404 }
      );
    }

    // Increment view count (fire and forget)
    prisma.equipment.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    return NextResponse.json({ equipment });
  } catch (error) {
    console.error("Get equipment error:", error);
    return NextResponse.json(
      { error: "Failed to get equipment" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/equipment/[id]
 * Update equipment (owner only)
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

    // Check ownership
    const existing = await prisma.equipment.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Equipment not found" },
        { status: 404 }
      );
    }

    if (existing.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized to update this equipment" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { images, imagesToDelete, ...updateData } = body;

    // Don't allow changing certain fields
    delete updateData.id;
    delete updateData.ownerId;
    delete updateData.viewCount;
    delete updateData.leadCount;
    delete updateData.createdAt;
    delete updateData.categoryId; // Can't change category after creation

    // Use transaction for equipment + images update
    const equipment = await prisma.$transaction(async (tx) => {
      // Update equipment
      const updated = await tx.equipment.update({
        where: { id },
        data: updateData,
      });

      // Delete removed images
      if (imagesToDelete && imagesToDelete.length > 0) {
        await tx.equipmentImage.deleteMany({
          where: {
            id: { in: imagesToDelete },
            equipmentId: id,
          },
        });
      }

      // Update/add images
      if (images && images.length > 0) {
        for (const image of images) {
          if (image.id) {
            // Update existing image
            await tx.equipmentImage.update({
              where: { id: image.id },
              data: {
                url: image.url,
                isPrimary: image.isPrimary,
                sortOrder: image.sortOrder,
              },
            });
          } else {
            // Create new image
            await tx.equipmentImage.create({
              data: {
                equipmentId: id,
                url: image.url,
                isPrimary: image.isPrimary,
                sortOrder: image.sortOrder,
              },
            });
          }
        }
      }

      return updated;
    });

    return NextResponse.json({ equipment });
  } catch (error) {
    console.error("Update equipment error:", error);
    return NextResponse.json(
      { error: "Failed to update equipment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/equipment/[id]
 * Delete equipment (owner only)
 */
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

    // Check ownership
    const existing = await prisma.equipment.findUnique({
      where: { id },
      select: { ownerId: true, status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Equipment not found" },
        { status: 404 }
      );
    }

    if (existing.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized to delete this equipment" },
        { status: 403 }
      );
    }

    // Soft delete by archiving
    await prisma.equipment.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete equipment error:", error);
    return NextResponse.json(
      { error: "Failed to delete equipment" },
      { status: 500 }
    );
  }
}
