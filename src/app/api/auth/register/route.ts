import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";
import type { Country, Currency } from "@prisma/client";

// Validation schema
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  fullNameAr: z.string().optional(),
  phone: z
    .string()
    .regex(/^\+966[0-9]{9}$|^\+973[0-9]{8}$/, "Invalid KSA or Bahrain phone number")
    .optional(),
  country: z.enum(["SA", "BH"]).default("SA"),
  preferredLanguage: z.enum(["en", "ar"]).default("en"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Check if phone already exists (if provided)
    if (data.phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone: data.phone },
      });

      if (existingPhone) {
        return NextResponse.json(
          { error: "An account with this phone number already exists" },
          { status: 409 }
        );
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Determine currency based on country
    const currency: Currency = data.country === "SA" ? "SAR" : "BHD";

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        hashedPassword,
        fullName: data.fullName,
        fullNameAr: data.fullNameAr,
        phone: data.phone,
        country: data.country as Country,
        preferredCurrency: currency,
        preferredLanguage: data.preferredLanguage,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        country: true,
        preferredLanguage: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
