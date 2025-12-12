import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyVerificationApproved, notifyVerificationRejected } from "@/lib/notifications/sms";

const approveSchema = z.object({
  action: z.literal("approve"),
});

const rejectSchema = z.object({
  action: z.literal("reject"),
  rejectionReason: z.string().min(10, "Rejection reason must be at least 10 characters"),
});

const actionSchema = z.discriminatedUnion("action", [approveSchema, rejectSchema]);

// PATCH /api/admin/verifications/[id] - Approve or reject a verification
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    // Only allow ADMIN users
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate the request body
    const validation = actionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if the business profile exists
    const profile = await prisma.businessProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, phone: true } } },
    });

    if (!profile) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 404 });
    }

    // Check if the profile is in PENDING status
    if (profile.crVerificationStatus !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot ${data.action} a profile with status: ${profile.crVerificationStatus}` },
        { status: 400 }
      );
    }

    if (data.action === "approve") {
      // Approve the verification
      const updatedProfile = await prisma.businessProfile.update({
        where: { id },
        data: {
          crVerificationStatus: "VERIFIED",
          verifiedAt: new Date(),
          verifiedBy: session.user.id,
          rejectionReason: null, // Clear any previous rejection reason
        },
      });

      // Send SMS notification (fire-and-forget)
      notifyVerificationApproved({
        userPhone: profile.user.phone,
        companyName: profile.companyNameEn,
      });

      return NextResponse.json({
        message: "Business verification approved",
        profile: {
          id: updatedProfile.id,
          crVerificationStatus: updatedProfile.crVerificationStatus,
          verifiedAt: updatedProfile.verifiedAt,
        },
      });
    } else {
      // Reject the verification
      const updatedProfile = await prisma.businessProfile.update({
        where: { id },
        data: {
          crVerificationStatus: "REJECTED",
          rejectionReason: data.rejectionReason,
          verifiedAt: null,
          verifiedBy: null,
        },
      });

      // Send SMS notification with rejection reason (fire-and-forget)
      notifyVerificationRejected({
        userPhone: profile.user.phone,
        companyName: profile.companyNameEn,
        reason: data.rejectionReason,
      });

      return NextResponse.json({
        message: "Business verification rejected",
        profile: {
          id: updatedProfile.id,
          crVerificationStatus: updatedProfile.crVerificationStatus,
          rejectionReason: updatedProfile.rejectionReason,
        },
      });
    }
  } catch (error) {
    console.error("Verification action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/admin/verifications/[id] - Get verification details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    // Only allow ADMIN users
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const profile = await prisma.businessProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            fullNameAr: true,
            email: true,
            phone: true,
            createdAt: true,
            country: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Get verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
