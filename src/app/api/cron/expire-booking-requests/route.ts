import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Cron job to auto-expire pending booking requests
// Runs every hour to catch expired requests

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

export async function GET(request: NextRequest) {
  return handleExpiry(request);
}

export async function POST(request: NextRequest) {
  return handleExpiry(request);
}

async function handleExpiry(request: NextRequest) {
  // Verify cron authentication
  const authResult = verifyCronAuth(request);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  try {

    // Find all pending requests that have expired
    const expiredRequests = await prisma.bookingRequest.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      include: {
        equipment: {
          select: {
            id: true,
            titleEn: true,
            titleAr: true,
            ownerId: true,
          },
        },
      },
    });

    if (expiredRequests.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expired requests found",
        expiredCount: 0,
      });
    }

    // Update all expired requests
    await prisma.bookingRequest.updateMany({
      where: {
        id: { in: expiredRequests.map((r) => r.id) },
      },
      data: {
        status: "EXPIRED",
      },
    });

    // Create notifications for renters about expired requests
    const notifications = expiredRequests.map((request) => ({
      userId: request.renterId,
      type: "BOOKING_EXPIRED",
      titleEn: "Booking Request Expired",
      titleAr: "انتهت صلاحية طلب الحجز",
      bodyEn: `Your booking request for "${request.equipment.titleEn}" expired because the owner didn't respond within 48 hours.`,
      bodyAr: `انتهت صلاحية طلب حجزك لـ "${request.equipment.titleAr || request.equipment.titleEn}" لأن المالك لم يرد خلال 48 ساعة.`,
      actionUrl: `/dashboard/booking-requests/${request.id}`,
      actionData: JSON.stringify({
        bookingRequestId: request.id,
        equipmentId: request.equipment.id,
      }),
    }));

    // Filter out guest users (can't notify them)
    const validNotifications = notifications.filter((n) => n.userId !== "guest");

    if (validNotifications.length > 0) {
      await prisma.notification.createMany({
        data: validNotifications.map((n) => ({
          ...n,
          actionData: JSON.parse(n.actionData),
        })),
      });
    }

    console.log(`[CRON] Expired ${expiredRequests.length} booking requests`);

    return NextResponse.json({
      success: true,
      message: `Expired ${expiredRequests.length} booking requests`,
      expiredCount: expiredRequests.length,
      expiredIds: expiredRequests.map((r) => r.id),
    });
  } catch (error) {
    console.error("[CRON] Error expiring booking requests:", error);
    return NextResponse.json(
      { error: "Failed to expire booking requests" },
      { status: 500 }
    );
  }
}
