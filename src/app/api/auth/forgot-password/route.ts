import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    console.log("[forgot-password] Request for email:", email);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    console.log("[forgot-password] User found:", user ? { id: user.id, hasPassword: !!user.hashedPassword } : "NOT FOUND");

    // Always return success to prevent email enumeration
    if (!user || !user.hashedPassword) {
      // User doesn't exist or uses phone-only auth - still return success
      console.log("[forgot-password] Exiting early - no user or no password");
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a reset link has been sent.",
      });
    }

    // Check if user is active
    if (!user.isActive || user.isSuspended) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a reset link has been sent.",
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Check rate limiting (max 3 reset requests per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTokens = await prisma.verificationToken.count({
      where: {
        identifier: email.toLowerCase(),
        expires: { gt: oneHourAgo },
      },
    });

    if (recentTokens >= 3) {
      return NextResponse.json(
        { error: "Too many reset requests. Please try again later." },
        { status: 429 }
      );
    }

    // Delete any existing reset tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email.toLowerCase() },
    });

    // Create new verification token
    await prisma.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token: resetToken,
        expires: resetTokenExpiry,
      },
    });

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email.toLowerCase())}`;

    // Send email via Twilio SendGrid or log to console in development
    console.log("[forgot-password] SENDGRID_API_KEY exists:", !!process.env.SENDGRID_API_KEY);
    console.log("[forgot-password] SENDGRID_FROM:", process.env.SENDGRID_FROM);

    if (process.env.SENDGRID_API_KEY) {
      // Production: Send via SendGrid
      console.log("[forgot-password] Sending email via SendGrid to:", email);

      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: process.env.SENDGRID_FROM || "noreply@equipmentsouq.com" },
          subject: "Reset Your EquipmentSouq Password",
          content: [
            {
              type: "text/html",
              value: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Reset Your Password</h2>
                  <p>You requested to reset your password for your EquipmentSouq account.</p>
                  <p>Click the button below to set a new password:</p>
                  <p style="margin: 24px 0;">
                    <a href="${resetUrl}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Reset Password
                    </a>
                  </p>
                  <p style="color: #666; font-size: 14px;">
                    This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
                  </p>
                  <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
                  <p style="color: #999; font-size: 12px;">
                    EquipmentSouq - Heavy Equipment Rental in Saudi Arabia & Bahrain
                  </p>
                </div>
              `,
            },
          ],
        }),
      });

      console.log("[forgot-password] SendGrid response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[forgot-password] SendGrid error:", errorText);
      } else {
        console.log("[forgot-password] Email sent successfully");
      }
    } else {
      // Development: Log to console
      console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a reset link has been sent.",
      // Only include URL in development for testing
      ...(process.env.NODE_ENV === "development" && { resetUrl }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
