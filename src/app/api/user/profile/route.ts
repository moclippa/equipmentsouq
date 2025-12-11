import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  fullNameAr: z
    .string()
    .max(100, "Arabic name must be less than 100 characters")
    .optional()
    .nullable(),
  preferredLanguage: z.enum(["en", "ar"]).optional(),
  country: z.enum(["SA", "BH"]).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      fullName: true,
      fullNameAr: true,
      email: true,
      phone: true,
      phoneVerified: true,
      preferredLanguage: true,
      preferredCurrency: true,
      country: true,
      role: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    // Build update data
    const updateData: Record<string, unknown> = {
      fullName: data.fullName,
    };

    if (data.fullNameAr !== undefined) {
      updateData.fullNameAr = data.fullNameAr || null;
    }

    if (data.preferredLanguage) {
      updateData.preferredLanguage = data.preferredLanguage;
    }

    if (data.country) {
      updateData.country = data.country;
      // Also update preferred currency to match country
      updateData.preferredCurrency = data.country === "SA" ? "SAR" : "BHD";
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        fullNameAr: true,
        email: true,
        phone: true,
        preferredLanguage: true,
        preferredCurrency: true,
        country: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return NextResponse.json(
        { error: zodError.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
