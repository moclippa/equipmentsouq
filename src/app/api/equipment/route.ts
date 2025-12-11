import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createEquipmentSchema = z.object({
  // Basic info
  categoryId: z.string().min(1),
  titleEn: z.string().min(10).max(100),
  titleAr: z.string().min(10).max(100).optional(),
  descriptionEn: z.string().min(20).max(5000),
  descriptionAr: z.string().min(20).max(5000).optional(),

  // Equipment details
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().min(1990).max(2030).optional(),
  condition: z.string().min(1), // EXCELLENT, GOOD, FAIR, POOR
  hoursUsed: z.number().min(0).optional(),

  // Specifications (optional, dynamic based on category)
  specifications: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),

  // Listing type & pricing (classifieds model)
  listingType: z.enum(["FOR_RENT", "FOR_SALE", "BOTH"]),
  rentalPrice: z.number().min(0).optional(),
  rentalPriceUnit: z.string().optional(), // "day", "week", "month"
  salePrice: z.number().min(0).optional(),
  priceOnRequest: z.boolean().default(false),
  currency: z.enum(["SAR", "BHD"]),

  // Location
  locationCity: z.string().min(1),
  locationRegion: z.string().min(1),
  locationCountry: z.enum(["SA", "BH"]),

  // Direct contact (key for classifieds)
  contactPhone: z.string().min(8).max(20),
  contactWhatsApp: z.string().optional(),

  // Images
  images: z.array(z.object({
    url: z.string(),
    isPrimary: z.boolean().default(false),
    sortOrder: z.number().min(0),
  })).min(1),

  // AI metadata (optional)
  aiClassified: z.boolean().default(false),
});

/**
 * POST /api/equipment
 * Create a new equipment listing
 * Requires: authenticated user with verified phone
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check phone verification
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phoneVerified: true, phone: true },
    });

    if (!user?.phone || !user?.phoneVerified) {
      return NextResponse.json(
        {
          error: "Phone verification required",
          code: "PHONE_NOT_VERIFIED",
          message: "Please verify your phone number before posting equipment"
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createEquipmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Validate pricing based on listing type
    if (data.listingType === "FOR_RENT" || data.listingType === "BOTH") {
      if (!data.priceOnRequest && !data.rentalPrice) {
        return NextResponse.json(
          { error: "Rental price is required for rental listings" },
          { status: 400 }
        );
      }
    }
    if (data.listingType === "FOR_SALE" || data.listingType === "BOTH") {
      if (!data.priceOnRequest && !data.salePrice) {
        return NextResponse.json(
          { error: "Sale price is required for sale listings" },
          { status: 400 }
        );
      }
    }

    // Create equipment with images in a transaction
    const equipment = await prisma.$transaction(async (tx) => {
      // Create the equipment
      const eq = await tx.equipment.create({
        data: {
          ownerId: session.user.id,
          categoryId: data.categoryId,
          titleEn: data.titleEn,
          titleAr: data.titleAr,
          descriptionEn: data.descriptionEn,
          descriptionAr: data.descriptionAr,
          make: data.make,
          model: data.model,
          year: data.year,
          condition: data.condition,
          hoursUsed: data.hoursUsed,
          specifications: data.specifications || {},
          listingType: data.listingType,
          rentalPrice: data.rentalPrice,
          rentalPriceUnit: data.rentalPriceUnit || "day",
          salePrice: data.salePrice,
          priceOnRequest: data.priceOnRequest,
          currency: data.currency,
          locationCity: data.locationCity,
          locationRegion: data.locationRegion,
          locationCountry: data.locationCountry,
          contactPhone: data.contactPhone,
          contactWhatsApp: data.contactWhatsApp,
          aiClassified: data.aiClassified,
          status: "ACTIVE", // Go live immediately for classifieds MVP
          publishedAt: new Date(),
        },
      });

      // Create images
      if (data.images.length > 0) {
        await tx.equipmentImage.createMany({
          data: data.images.map((img, index) => ({
            equipmentId: eq.id,
            url: img.url,
            isPrimary: img.isPrimary || index === 0,
            sortOrder: img.sortOrder ?? index,
          })),
        });
      }

      return eq;
    });

    return NextResponse.json({
      success: true,
      message: "Equipment listing created successfully",
      equipmentId: equipment.id,
    });
  } catch (error) {
    console.error("Create equipment error:", error);
    return NextResponse.json(
      { error: "Failed to create equipment listing" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/equipment
 * List equipment with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Support fetching by IDs (for favorites)
    const ids = searchParams.get("ids");
    if (ids) {
      const idArray = ids.split(",").filter(Boolean);
      if (idArray.length === 0) {
        return NextResponse.json({ equipment: [] });
      }

      const equipment = await prisma.equipment.findMany({
        where: {
          id: { in: idArray },
          // Show all public statuses (favorites can include rented/sold items)
          status: { in: ["ACTIVE", "RENTED", "SOLD"] },
        },
        include: {
          category: {
            select: { id: true, nameEn: true, nameAr: true, slug: true },
          },
          owner: {
            select: { id: true, fullName: true },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          _count: {
            select: { leads: true },
          },
        },
      });

      return NextResponse.json({ equipment });
    }

    const search = searchParams.get("q");
    const category = searchParams.get("category");
    const city = searchParams.get("city");
    const country = searchParams.get("country");
    const condition = searchParams.get("condition");
    const currency = searchParams.get("currency");
    const listingType = searchParams.get("listingType");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Availability filters
    const showUnavailable = searchParams.get("showUnavailable") !== "false"; // default: true
    const availableOnly = searchParams.get("availableOnly") === "true";
    const availableFrom = searchParams.get("availableFrom");
    const availableTo = searchParams.get("availableTo");

    // Build where clause with dynamic status filtering
    const where: Record<string, unknown> = {};

    // Status filtering: show public statuses by default, hide internal ones
    if (availableOnly) {
      where.status = "ACTIVE";
    } else if (showUnavailable) {
      // Show all public statuses (ACTIVE, RENTED, SOLD)
      where.status = { in: ["ACTIVE", "RENTED", "SOLD"] };
    } else {
      // Hide rented/sold, show only active
      where.status = "ACTIVE";
    }

    // Full-text search
    if (search) {
      where.OR = [
        { titleEn: { contains: search, mode: "insensitive" } },
        { titleAr: { contains: search, mode: "insensitive" } },
        { make: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { descriptionEn: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = { slug: category };
    }
    if (city) {
      where.locationCity = city;
    }
    if (country) {
      where.locationCountry = country;
    }
    if (condition) {
      where.condition = condition;
    }
    if (listingType) {
      // BOTH matches both FOR_RENT and FOR_SALE filters
      if (listingType === "FOR_RENT") {
        where.listingType = { in: ["FOR_RENT", "BOTH"] };
      } else if (listingType === "FOR_SALE") {
        where.listingType = { in: ["FOR_SALE", "BOTH"] };
      }
    }
    if (currency) {
      where.currency = currency;
    }

    // Price filter - check both rental and sale prices
    if (minPrice || maxPrice) {
      const priceFilter: Record<string, number>[] = [];
      if (minPrice) {
        priceFilter.push({ gte: parseFloat(minPrice) });
      }
      if (maxPrice) {
        priceFilter.push({ lte: parseFloat(maxPrice) });
      }

      where.OR = [
        ...(where.OR as Record<string, unknown>[] || []),
        { rentalPrice: Object.assign({}, ...priceFilter) },
        { salePrice: Object.assign({}, ...priceFilter) },
      ];
    }

    // Get total count
    const total = await prisma.equipment.count({ where });

    // Get equipment with pagination
    const equipment = await prisma.equipment.findMany({
      where,
      include: {
        category: {
          select: { id: true, nameEn: true, nameAr: true, slug: true },
        },
        owner: {
          select: { id: true, fullName: true },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    // If date range provided, check availability conflicts for rental listings
    let equipmentWithConflicts = equipment;
    if (availableFrom && availableTo) {
      const fromDate = new Date(availableFrom);
      const toDate = new Date(availableTo);

      // Get all equipment IDs that have rental capability
      const rentalEquipmentIds = equipment
        .filter((e) => e.listingType === "FOR_RENT" || e.listingType === "BOTH")
        .map((e) => e.id);

      // Find conflicts in one query
      const conflicts = await prisma.availabilityBlock.findMany({
        where: {
          equipmentId: { in: rentalEquipmentIds },
          isAvailable: false, // Only check unavailable blocks
          OR: [
            // Block overlaps with requested date range
            {
              startDate: { lte: toDate },
              endDate: { gte: fromDate },
            },
          ],
        },
        select: { equipmentId: true },
      });

      const conflictingIds = new Set(conflicts.map((c) => c.equipmentId));

      // Add hasAvailabilityConflict flag to each equipment
      equipmentWithConflicts = equipment.map((e) => ({
        ...e,
        hasAvailabilityConflict:
          // SOLD items are always unavailable
          e.status === "SOLD" ||
          // RENTED items may have availability issues
          e.status === "RENTED" ||
          // Check availability blocks for rental listings
          conflictingIds.has(e.id),
      }));
    }

    return NextResponse.json({
      equipment: equipmentWithConflicts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List equipment error:", error);
    return NextResponse.json(
      { error: "Failed to list equipment" },
      { status: 500 }
    );
  }
}
