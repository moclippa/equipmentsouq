import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getOrSetCached,
  invalidateEquipmentCache,
  invalidateAllEquipmentCaches,
  CACHE_TTL,
  CACHE_KEYS,
} from "@/lib/cache";

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
  try {
    const { id } = await params;

    // Try to get from cache first, fetch from DB if miss
    const equipment = await getOrSetCached(
      `${CACHE_KEYS.EQUIPMENT}:${id}`,
      CACHE_TTL.EQUIPMENT_DETAIL,
      async () => {
        const eq = await prisma.equipment.findUnique({
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

        if (!eq) return null;

        // Serialize dates and Decimal fields for JSON/Redis storage
        return {
          ...eq,
          rentalPrice: eq.rentalPrice ? Number(eq.rentalPrice) : null,
          salePrice: eq.salePrice ? Number(eq.salePrice) : null,
          createdAt: eq.createdAt.toISOString(),
          updatedAt: eq.updatedAt.toISOString(),
          publishedAt: eq.publishedAt?.toISOString() || null,
          statusChangedAt: eq.statusChangedAt?.toISOString() || null,
          owner: {
            ...eq.owner,
            createdAt: eq.owner.createdAt.toISOString(),
          },
        };
      }
    );

    if (!equipment) {
      return NextResponse.json(
        { error: "Equipment not found" },
        { status: 404 }
      );
    }

    // Atomically increment view count using raw SQL to prevent race conditions
    // This ensures concurrent views don't lose updates (e.g., two concurrent requests
    // both reading viewCount=10 and writing viewCount=11 instead of 12)
    // Fire and forget - we don't block the response on this update
    prisma.$executeRaw`UPDATE "Equipment" SET "viewCount" = "viewCount" + 1 WHERE id = ${id}`
      .catch(() => {});

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

    // Check ownership and get current status
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

    // Track status changes for "Just Sold/Rented" feature and auto-archive
    if (updateData.status && updateData.status !== existing.status) {
      updateData.statusChangedAt = new Date();
    }

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

    // Invalidate caches (fire and forget)
    invalidateAllEquipmentCaches(id).catch(() => {});

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
      data: { status: "ARCHIVED", statusChangedAt: new Date() },
    });

    // Invalidate caches (fire and forget)
    invalidateAllEquipmentCaches(id).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete equipment error:", error);
    return NextResponse.json(
      { error: "Failed to delete equipment" },
      { status: 500 }
    );
  }
}
