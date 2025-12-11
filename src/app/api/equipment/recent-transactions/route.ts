import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/equipment/recent-transactions
 * Returns recently sold/rented equipment for the homepage "Just Sold/Rented" section
 */
export async function GET() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const equipment = await prisma.equipment.findMany({
      where: {
        status: { in: ["RENTED", "SOLD"] },
        // Only show items sold/rented within last 30 days
        // For items without statusChangedAt (legacy), fall back to updatedAt
        OR: [
          { statusChangedAt: { gte: thirtyDaysAgo } },
          {
            statusChangedAt: null,
            updatedAt: { gte: thirtyDaysAgo },
          },
        ],
      },
      orderBy: [
        // Primary sort: statusChangedAt (most recent first)
        { statusChangedAt: "desc" },
        // Fallback sort for legacy items
        { updatedAt: "desc" },
      ],
      take: 8,
      include: {
        category: {
          select: { nameEn: true, nameAr: true, slug: true },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    return NextResponse.json({ equipment });
  } catch (error) {
    console.error("Get recent transactions error:", error);
    return NextResponse.json(
      { error: "Failed to get recent transactions" },
      { status: 500 }
    );
  }
}
