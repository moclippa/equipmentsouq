import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyRenterOfBookingStatus } from "@/lib/notifications/sms";

// ============================================================================
// GET - Get a single booking request
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const bookingRequest = await prisma.bookingRequest.findUnique({
      where: { id },
      include: {
        equipment: {
          select: {
            id: true,
            titleEn: true,
            titleAr: true,
            rentalPrice: true,
            rentalPriceUnit: true,
            salePrice: true,
            currency: true,
            contactPhone: true,
            contactWhatsApp: true,
            locationCity: true,
            locationRegion: true,
            locationCountry: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true, thumbnailUrl: true },
            },
            owner: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        renter: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!bookingRequest) {
      return NextResponse.json(
        { error: "Booking request not found" },
        { status: 404 }
      );
    }

    // Check authorization: must be renter or equipment owner
    const isRenter = bookingRequest.renterId === session.user.id;
    const isOwner = bookingRequest.equipment.owner.id === session.user.id;

    if (!isRenter && !isOwner) {
      return NextResponse.json(
        { error: "Not authorized to view this booking request" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      bookingRequest,
      role: isOwner ? "owner" : "renter",
    });
  } catch (error) {
    console.error("Error fetching booking request:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking request" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update booking request status (confirm/decline/cancel)
// ============================================================================

const updateBookingRequestSchema = z.object({
  action: z.enum(["confirm", "decline", "cancel"]),
  response: z.string().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updateBookingRequestSchema.parse(body);

    // Get the booking request with equipment owner info
    const bookingRequest = await prisma.bookingRequest.findUnique({
      where: { id },
      include: {
        equipment: {
          select: {
            id: true,
            titleEn: true,
            titleAr: true,
            ownerId: true,
            contactPhone: true,
            contactWhatsApp: true,
            owner: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        renter: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!bookingRequest) {
      return NextResponse.json(
        { error: "Booking request not found" },
        { status: 404 }
      );
    }

    const isOwner = bookingRequest.equipment.ownerId === session.user.id;
    const isRenter = bookingRequest.renterId === session.user.id;

    // Validate action based on role
    if (validatedData.action === "confirm" || validatedData.action === "decline") {
      if (!isOwner) {
        return NextResponse.json(
          { error: "Only the equipment owner can confirm or decline requests" },
          { status: 403 }
        );
      }
    }

    if (validatedData.action === "cancel") {
      if (!isRenter && !isOwner) {
        return NextResponse.json(
          { error: "Only the renter or owner can cancel a request" },
          { status: 403 }
        );
      }
    }

    // Validate current status allows the action
    if (bookingRequest.status !== "PENDING" && validatedData.action !== "cancel") {
      return NextResponse.json(
        { error: `Cannot ${validatedData.action} a request that is ${bookingRequest.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    if (validatedData.action === "cancel" && bookingRequest.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Request is already cancelled" },
        { status: 400 }
      );
    }

    // Check if request has expired
    if (bookingRequest.status === "PENDING" && new Date() > bookingRequest.expiresAt) {
      // Auto-expire it first
      await prisma.bookingRequest.update({
        where: { id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "This booking request has expired" },
        { status: 400 }
      );
    }

    // Perform the action
    let newStatus: "CONFIRMED" | "DECLINED" | "CANCELLED";
    let notificationTitleEn: string;
    let notificationTitleAr: string;
    let notificationBodyEn: string;
    let notificationBodyAr: string;
    let notifyUserId: string;

    switch (validatedData.action) {
      case "confirm":
        newStatus = "CONFIRMED";
        notifyUserId = bookingRequest.renterId;
        notificationTitleEn = "Booking Request Confirmed!";
        notificationTitleAr = "تم تأكيد طلب الحجز!";
        notificationBodyEn = `Your booking request for "${bookingRequest.equipment.titleEn}" has been confirmed! Contact the owner at ${bookingRequest.equipment.contactPhone} to finalize details.`;
        notificationBodyAr = `تم تأكيد طلب حجزك لـ "${bookingRequest.equipment.titleAr || bookingRequest.equipment.titleEn}"! تواصل مع المالك على ${bookingRequest.equipment.contactPhone}`;
        break;

      case "decline":
        newStatus = "DECLINED";
        notifyUserId = bookingRequest.renterId;
        notificationTitleEn = "Booking Request Declined";
        notificationTitleAr = "تم رفض طلب الحجز";
        notificationBodyEn = `Your booking request for "${bookingRequest.equipment.titleEn}" was declined. ${validatedData.response || "Try different dates or contact the owner directly."}`;
        notificationBodyAr = `تم رفض طلب حجزك لـ "${bookingRequest.equipment.titleAr || bookingRequest.equipment.titleEn}". ${validatedData.response || "جرب تواريخ مختلفة أو تواصل مع المالك مباشرة"}`;
        break;

      case "cancel":
        newStatus = "CANCELLED";
        // Notify the other party
        notifyUserId = isRenter ? bookingRequest.equipment.ownerId : bookingRequest.renterId;
        notificationTitleEn = "Booking Request Cancelled";
        notificationTitleAr = "تم إلغاء طلب الحجز";
        const cancelledBy = isRenter ? "renter" : "owner";
        notificationBodyEn = `The booking request for "${bookingRequest.equipment.titleEn}" was cancelled by the ${cancelledBy}.`;
        notificationBodyAr = `تم إلغاء طلب الحجز لـ "${bookingRequest.equipment.titleAr || bookingRequest.equipment.titleEn}" من قبل ${cancelledBy === "renter" ? "المستأجر" : "المالك"}`;
        break;
    }

    // Update the booking request
    const updatedRequest = await prisma.bookingRequest.update({
      where: { id },
      data: {
        status: newStatus,
        ownerResponse: validatedData.response || null,
        respondedAt: new Date(),
      },
    });

    // Create notification
    if (notifyUserId !== "guest") {
      await prisma.notification.create({
        data: {
          userId: notifyUserId,
          type: `BOOKING_${newStatus}`,
          titleEn: notificationTitleEn,
          titleAr: notificationTitleAr,
          bodyEn: notificationBodyEn,
          bodyAr: notificationBodyAr,
          actionUrl: `/dashboard/booking-requests/${id}`,
          actionData: {
            bookingRequestId: id,
            equipmentId: bookingRequest.equipment.id,
          },
        },
      });
    }

    // If confirmed, create an availability block to prevent double-booking
    if (newStatus === "CONFIRMED") {
      await prisma.availabilityBlock.create({
        data: {
          equipmentId: bookingRequest.equipmentId,
          startDate: bookingRequest.startDate,
          endDate: bookingRequest.endDate,
          isAvailable: false,
          reason: `Booked by ${bookingRequest.renterName}`,
        },
      });
    }

    // Send SMS notification to renter (fire-and-forget)
    if (newStatus === "CONFIRMED" || newStatus === "DECLINED") {
      notifyRenterOfBookingStatus({
        renterPhone: bookingRequest.renter?.phone || bookingRequest.renterPhone,
        equipmentTitle: bookingRequest.equipment.titleEn,
        status: newStatus,
        ownerPhone: newStatus === "CONFIRMED" ? bookingRequest.equipment.contactPhone : undefined,
      });
    }

    return NextResponse.json({
      success: true,
      bookingRequest: updatedRequest,
      message:
        newStatus === "CONFIRMED"
          ? "Booking confirmed! The renter has been notified with your contact details."
          : newStatus === "DECLINED"
          ? "Booking request declined. The renter has been notified."
          : "Booking request cancelled.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating booking request:", error);
    return NextResponse.json(
      { error: "Failed to update booking request" },
      { status: 500 }
    );
  }
}
