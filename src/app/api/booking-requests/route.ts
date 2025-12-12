import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyOwnerOfBookingRequest } from "@/lib/notifications/sms";

// ============================================================================
// POST - Create a new booking request (renter)
// ============================================================================

const createBookingRequestSchema = z.object({
  equipmentId: z.string().min(1, "Equipment ID is required"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
  message: z.string().max(1000).optional(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Require authentication for booking requests
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required to submit booking requests" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createBookingRequestSchema.parse(body);

    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);

    // Validate date range
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    if (startDate < new Date()) {
      return NextResponse.json(
        { error: "Start date cannot be in the past" },
        { status: 400 }
      );
    }

    // Verify equipment exists and is active
    const equipment = await prisma.equipment.findUnique({
      where: { id: validatedData.equipmentId },
      select: {
        id: true,
        status: true,
        listingType: true,
        ownerId: true,
        titleEn: true,
        owner: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
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
        { error: "Equipment is not available for booking" },
        { status: 400 }
      );
    }

    // Don't allow booking your own equipment
    if (session?.user?.id === equipment.ownerId) {
      return NextResponse.json(
        { error: "You cannot request a booking for your own equipment" },
        { status: 400 }
      );
    }

    // Check for conflicting pending/confirmed requests
    const conflictingRequests = await prisma.bookingRequest.findMany({
      where: {
        equipmentId: validatedData.equipmentId,
        status: { in: ["PENDING", "CONFIRMED"] },
        OR: [
          {
            // New request starts during existing request
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (conflictingRequests.length > 0) {
      return NextResponse.json(
        { error: "The selected dates conflict with an existing booking request" },
        { status: 409 }
      );
    }

    // Check for existing availability blocks (owner-set unavailable periods)
    const conflictingBlocks = await prisma.availabilityBlock.findMany({
      where: {
        equipmentId: validatedData.equipmentId,
        isAvailable: false,
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (conflictingBlocks.length > 0) {
      return NextResponse.json(
        { error: "The equipment is not available for the selected dates" },
        { status: 409 }
      );
    }

    // Create the booking request with 48-hour expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const bookingRequest = await prisma.bookingRequest.create({
      data: {
        equipmentId: validatedData.equipmentId,
        renterId: session.user.id,
        startDate,
        endDate,
        renterMessage: validatedData.message || null,
        renterName: validatedData.name,
        renterPhone: validatedData.phone,
        renterEmail: validatedData.email || null,
        expiresAt,
      },
      include: {
        equipment: {
          select: {
            id: true,
            titleEn: true,
            titleAr: true,
            owner: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    // Create notification for equipment owner
    await prisma.notification.create({
      data: {
        userId: equipment.ownerId,
        type: "BOOKING_REQUEST",
        titleEn: "New Booking Request",
        titleAr: "طلب حجز جديد",
        bodyEn: `${validatedData.name} has requested to book "${equipment.titleEn}" from ${validatedData.startDate} to ${validatedData.endDate}`,
        bodyAr: `طلب ${validatedData.name} حجز "${equipment.titleEn}" من ${validatedData.startDate} إلى ${validatedData.endDate}`,
        actionUrl: `/dashboard/booking-requests/${bookingRequest.id}`,
        actionData: {
          bookingRequestId: bookingRequest.id,
          equipmentId: equipment.id,
        },
      },
    });

    // Send SMS notification to owner (fire-and-forget)
    notifyOwnerOfBookingRequest({
      ownerPhone: equipment.owner.phone,
      equipmentTitle: equipment.titleEn,
      renterName: validatedData.name,
      startDate: validatedData.startDate,
      endDate: validatedData.endDate,
    });

    return NextResponse.json({
      success: true,
      bookingRequest: {
        id: bookingRequest.id,
        status: bookingRequest.status,
        startDate: bookingRequest.startDate,
        endDate: bookingRequest.endDate,
        expiresAt: bookingRequest.expiresAt,
        equipment: bookingRequest.equipment,
      },
      message: "Booking request submitted successfully. The owner has 48 hours to respond.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating booking request:", error);
    return NextResponse.json(
      { error: "Failed to create booking request" },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - List booking requests (for renter or owner)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || "renter"; // "renter" or "owner"
    const status = searchParams.get("status"); // Optional filter
    const equipmentId = searchParams.get("equipmentId"); // Optional filter
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause based on role
    const where: Record<string, unknown> = {};

    if (role === "owner") {
      // Get requests for equipment owned by this user
      where.equipment = { ownerId: session.user.id };
    } else {
      // Get requests made by this user
      where.renterId = session.user.id;
    }

    if (status) {
      where.status = status;
    }

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    const [bookingRequests, total] = await Promise.all([
      prisma.bookingRequest.findMany({
        where,
        include: {
          equipment: {
            select: {
              id: true,
              titleEn: true,
              titleAr: true,
              rentalPrice: true,
              rentalPriceUnit: true,
              currency: true,
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
                },
              },
            },
          },
          renter: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.bookingRequest.count({ where }),
    ]);

    return NextResponse.json({
      bookingRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching booking requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking requests" },
      { status: 500 }
    );
  }
}
