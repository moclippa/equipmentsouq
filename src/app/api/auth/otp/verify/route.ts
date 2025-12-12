import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const verifySchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  code: z.string().length(6, "OTP must be 6 digits"),
});

// Maximum failed attempts before OTP is invalidated
const MAX_OTP_ATTEMPTS = 5;

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

    // First, check if there's an active (non-expired, non-verified) OTP for this phone
    const activeOtp = await prisma.oTPCode.findFirst({
      where: {
        phone,
        type: "VERIFY",
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    // If no active OTP exists, return error
    if (!activeOtp) {
      return NextResponse.json(
        { error: "No active verification code. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if too many failed attempts
    if (activeOtp.attempts >= MAX_OTP_ATTEMPTS) {
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new code." },
        { status: 429 }
      );
    }

    // Check if the code matches
    if (activeOtp.code !== code) {
      // Increment attempts on failed verification
      await prisma.oTPCode.update({
        where: { id: activeOtp.id },
        data: { attempts: { increment: 1 } },
      });

      const remainingAttempts = MAX_OTP_ATTEMPTS - activeOtp.attempts - 1;
      return NextResponse.json(
        {
          error: remainingAttempts > 0
            ? `Invalid code. ${remainingAttempts} attempts remaining.`
            : "Invalid code. Please request a new one."
        },
        { status: 400 }
      );
    }

    // Code is valid - find the record (for type safety)
    const otpRecord = activeOtp;

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
