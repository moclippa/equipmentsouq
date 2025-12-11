import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Cron job to auto-expire pending booking requests
// Runs every hour to catch expired requests

export async function GET(request: NextRequest) {
  return handleExpiry(request);
}

export async function POST(request: NextRequest) {
  return handleExpiry(request);
}

async function handleExpiry(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
