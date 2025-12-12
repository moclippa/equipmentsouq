import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Archive sold listings after 30 days
// Runs daily at 2 AM UTC via Vercel Cron
// POST /api/cron/archive-sold

const SOLD_TTL_DAYS = 30;

/**
 * Verify cron job authentication
 * Supports both CRON_SECRET and Vercel's built-in cron authentication
 */
function verifyCronAuth(request: NextRequest): { authorized: boolean; error?: string } {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const vercelCronHeader = request.headers.get("x-vercel-cron");

  // In production, require authentication
  if (process.env.NODE_ENV === "production") {
    // Option 1: Vercel Cron built-in authentication
    if (vercelCronHeader === "1") {
      return { authorized: true };
    }

    // Option 2: CRON_SECRET (for manual triggers or other cron services)
    if (!cronSecret) {
      console.error("[CRON] CRON_SECRET not configured - cron jobs require authentication");
      return { authorized: false, error: "Cron authentication not configured" };
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return { authorized: false, error: "Unauthorized" };
    }
  }

  // In development, allow but warn if no secret configured
  if (!cronSecret && process.env.NODE_ENV === "development") {
    console.warn("[CRON] Warning: CRON_SECRET not set. Configure it for production.");
  }

  return { authorized: true };
}

export async function POST(request: NextRequest) {
  // Verify cron authentication
  const authResult = verifyCronAuth(request);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
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
