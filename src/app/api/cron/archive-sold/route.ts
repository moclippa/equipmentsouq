import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Archive sold listings after 30 days
// Runs daily at 2 AM UTC via Vercel Cron
// POST /api/cron/archive-sold

const SOLD_TTL_DAYS = 30;

export async function POST(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - SOLD_TTL_DAYS);

    // Find all SOLD listings older than 30 days that aren't already archived
    const soldListings = await prisma.equipment.findMany({
      where: {
        status: "SOLD",
        statusChangedAt: {
          lt: cutoffDate,
        },
      },
      select: {
        id: true,
        titleEn: true,
        statusChangedAt: true,
      },
    });

    if (soldListings.length === 0) {
      return NextResponse.json({
        message: "No listings to archive",
        archived: 0,
      });
    }

    // Archive the listings
    const result = await prisma.equipment.updateMany({
      where: {
        id: {
          in: soldListings.map((l) => l.id),
        },
      },
      data: {
        status: "ARCHIVED",
      },
    });

    console.log(`[Cron] Archived ${result.count} sold listings older than ${SOLD_TTL_DAYS} days`);

    return NextResponse.json({
      message: `Archived ${result.count} listings`,
      archived: result.count,
      listings: soldListings.map((l) => ({
        id: l.id,
        title: l.titleEn,
        soldAt: l.statusChangedAt,
      })),
    });
  } catch (error) {
    console.error("[Cron] Archive sold listings error:", error);
    return NextResponse.json(
      { error: "Failed to archive listings" },
      { status: 500 }
    );
  }
}

// Also allow GET for manual trigger in development
export async function GET(request: NextRequest) {
  return POST(request);
}
