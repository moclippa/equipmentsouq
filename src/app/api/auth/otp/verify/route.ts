import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const verifySchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  code: z.string().length(6, "OTP must be 6 digits"),
});

/**
 * POST /api/auth/otp/verify
 * Verify OTP code for an authenticated user (for phone verification in settings)
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { phone, code } = verifySchema.parse(body);

    // Find the OTP code
    const otpRecord = await prisma.oTPCode.findFirst({
      where: {
        phone,
        code,
        type: "VERIFY",
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 400 }
      );
    }

    // Mark OTP as verified
    await prisma.oTPCode.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // Update user's phone and phoneVerified status
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phone,
        phoneVerified: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Phone number verified successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("OTP verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
