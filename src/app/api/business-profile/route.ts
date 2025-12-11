import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// City to Region/Country mapping for Saudi Arabia and Bahrain
const CITY_MAPPING: Record<string, { region: string; country: "SA" | "BH" }> = {
  // Saudi Arabia
  "Riyadh": { region: "Riyadh", country: "SA" },
  "Jeddah": { region: "Makkah", country: "SA" },
  "Mecca": { region: "Makkah", country: "SA" },
  "Medina": { region: "Madinah", country: "SA" },
  "Dammam": { region: "Eastern", country: "SA" },
  "Khobar": { region: "Eastern", country: "SA" },
  "Dhahran": { region: "Eastern", country: "SA" },
  "Jubail": { region: "Eastern", country: "SA" },
  "Yanbu": { region: "Madinah", country: "SA" },
  "Tabuk": { region: "Tabuk", country: "SA" },
  "Abha": { region: "Asir", country: "SA" },
  "Jazan": { region: "Jazan", country: "SA" },
  "Najran": { region: "Najran", country: "SA" },
  "Hail": { region: "Hail", country: "SA" },
  "Al Kharj": { region: "Riyadh", country: "SA" },
  // Bahrain
  "Manama": { region: "Capital", country: "BH" },
  "Riffa": { region: "Southern", country: "BH" },
  "Muharraq": { region: "Muharraq", country: "BH" },
  "Hamad Town": { region: "Northern", country: "BH" },
  "Isa Town": { region: "Central", country: "BH" },
  "Sitra": { region: "Central", country: "BH" },
  "Budaiya": { region: "Northern", country: "BH" },
  "Jidhafs": { region: "Capital", country: "BH" },
  "Al Hidd": { region: "Muharraq", country: "BH" },
};

// Accept both form field names and database field names for flexibility
const businessProfileSchema = z.object({
  businessType: z.enum(["INDIVIDUAL", "RENTAL_COMPANY", "CONTRACTOR", "INDUSTRIAL"]),
  companyNameEn: z.string().min(2, "Company name must be at least 2 characters"),
  companyNameAr: z.string().optional().or(z.literal("")),
  crNumber: z.string().min(10, "CR number must be at least 10 characters").optional().or(z.literal("")),
  vatNumber: z.string().optional().or(z.literal("")),
  city: z.string().min(1, "City is required"),
  // Accept form field name "address" OR database field "addressLine1"
  address: z.string().min(10, "Address must be at least 10 characters").optional(),
  addressLine1: z.string().optional(),
  // Document URLs (optional)
  crDocumentUrl: z.string().nullable().optional(),
  vatDocumentUrl: z.string().nullable().optional(),
  // Accept form field names OR database field names for bank details
  bankName: z.string().optional().or(z.literal("")),
  accountHolderName: z.string().optional().or(z.literal("")),
  bankAccountName: z.string().optional(),
  iban: z.string().optional().or(z.literal("")),
  bankIban: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already has a business profile
    const existingProfile = await prisma.businessProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (existingProfile) {
      return NextResponse.json(
        { error: "Business profile already exists" },
        { status: 409 }
      );
    }

    const body = await request.json();
    const data = businessProfileSchema.parse(body);

    // Derive region and country from city
    const cityInfo = CITY_MAPPING[data.city];
    if (!cityInfo) {
      return NextResponse.json(
        { error: "Invalid city selected" },
        { status: 400 }
      );
    }

    // Map form field names to database field names
    const addressLine1 = data.address || data.addressLine1 || "";
    const bankAccountName = data.accountHolderName || data.bankAccountName || "";
    const bankIban = data.iban || data.bankIban || "";

    // Create business profile
    const profile = await prisma.businessProfile.create({
      data: {
        userId: session.user.id,
        businessType: data.businessType,
        companyNameEn: data.companyNameEn,
        companyNameAr: data.companyNameAr || null,
        crNumber: data.crNumber || null,
        vatNumber: data.vatNumber || null,
        city: data.city,
        region: cityInfo.region,
        country: cityInfo.country,
        addressLine1: addressLine1 || null,
        crDocumentUrl: data.crDocumentUrl || null,
        vatDocumentUrl: data.vatDocumentUrl || null,
        // Bank details - in production, these should be encrypted
        bankName: data.bankName || null,
        bankAccountName: bankAccountName || null,
        bankIban: bankIban || null,
        // Set initial verification status
        crVerificationStatus: "PENDING",
      },
    });

    // Update user role to OWNER
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: "OWNER" },
    });

    return NextResponse.json({
      success: true,
      message: "Business profile created successfully",
      profileId: profile.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Business profile error:", error);
    return NextResponse.json(
      { error: "Failed to create business profile" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.businessProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        businessType: true,
        companyNameEn: true,
        companyNameAr: true,
        crNumber: true,
        vatNumber: true,
        city: true,
        region: true,
        addressLine1: true,
        crVerificationStatus: true,
        rejectionReason: true,
        verifiedAt: true,
        createdAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Get business profile error:", error);
    return NextResponse.json(
      { error: "Failed to get business profile" },
      { status: 500 }
    );
  }
}
