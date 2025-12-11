import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validation schema
const sendOTPSchema = z.object({
  phone: z
    .string()
    .regex(/^\+966[0-9]{9}$|^\+973[0-9]{8}$/, "Invalid KSA or Bahrain phone number"),
  type: z.enum(["LOGIN", "VERIFICATION"]).default("LOGIN"),
});

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, type } = sendOTPSchema.parse(body);

    // Check rate limiting (max 5 OTPs per hour per phone)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOTPs = await prisma.oTPCode.count({
      where: {
        phone,
        createdAt: { gt: oneHourAgo },
      },
    });

    if (recentOTPs >= 5) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please try again later." },
        { status: 429 }
      );
    }

    // Generate OTP and expiry (5 minutes)
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Invalidate previous OTPs for this phone and type
    await prisma.oTPCode.updateMany({
      where: { phone, type, verified: false },
      data: { expiresAt: new Date() }, // Expire immediately
    });

    // Create new OTP
    await prisma.oTPCode.create({
      data: {
        phone,
        code,
        type,
        expiresAt,
      },
    });

    // Send OTP via Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const twilioClient = await import("twilio").then((m) =>
        m.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      );

      const messageBody =
        type === "LOGIN"
          ? `Your EquipmentSouq login code is: ${code}. Valid for 5 minutes.`
          : `Your EquipmentSouq verification code is: ${code}. Valid for 5 minutes.`;

      await twilioClient.messages.create({
        body: messageBody,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
    } else {
      // Development: log OTP to console
      console.log(`[DEV] OTP for ${phone}: ${code}`);
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      // Only include code in development for testing
      ...(process.env.NODE_ENV === "development" && { code }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    console.error("OTP send error:", error);
    return NextResponse.json(
      { error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}
