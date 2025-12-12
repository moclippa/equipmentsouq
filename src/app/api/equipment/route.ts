import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { fullTextSearchEquipment, buildEquipmentSearchWhere } from "@/lib/db/search";
import {
  createdResponse,
  validationErrorResponse,
  requireVerifiedPhone,
  serviceResultToResponse,
} from "@/lib/api-response";
import { equipmentService, CreateEquipmentInput } from "@/services/equipment.service";

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
  const session = await auth();
  const phoneError = requireVerifiedPhone(session);
  if (phoneError) return phoneError;

  const body = await request.json();
  const validation = createEquipmentSchema.safeParse(body);

  if (!validation.success) {
    return validationErrorResponse("Invalid request data", {
      issues: validation.error.issues,
    });
  }

  const result = await equipmentService.create(
    validation.data as CreateEquipmentInput,
    session!.user!.id!
  );

  if (!result.success) {
    return serviceResultToResponse(result);
  }

  return createdResponse({
    success: true,
    message: "Equipment listing created successfully",
    equipmentId: result.data!.equipmentId,
  });
}

/**
 * GET /api/equipment
 * List equipment with filters
 *
 * Supports two pagination modes:
 * 1. Cursor-based (keyset) pagination - Recommended for performance
 *    - Use `cursor` param with the last item's ID
 *    - Example: /api/equipment?cursor=abc123&limit=20
 * 2. Offset pagination - For backward compatibility
 *    - Use `page` param (1-indexed)
 *    - Example: /api/equipment?page=2&limit=20
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
            select: {
              id: true,
              fullName: true,
              trustMetrics: {
                select: {
                  badges: true,
                  trustScore: true,
                  responseRate: true,
                  totalReviews: true,
                  averageRating: true,
                },
              },
            },
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
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Pagination mode: cursor-based (keyset) takes precedence over offset
    const cursor = searchParams.get("cursor");
    const page = parseInt(searchParams.get("page") || "1");

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
    // First try PostgreSQL full-text search (uses GIN-indexed tsvector for O(log n) performance)
    // Falls back to ILIKE search if full-text search is not available
    let searchIds: string[] | null = null;
    if (search) {
      // Try full-text search first
      searchIds = await fullTextSearchEquipment(search, 1000);

      if (searchIds.length > 0) {
        // Full-text search succeeded - filter by IDs
        // This is much faster than ILIKE because it uses pre-computed search vectors
        where.id = { in: searchIds };
      } else {
        // Fallback to ILIKE search (still uses indexes where possible)
        const searchWhere = buildEquipmentSearchWhere(search);
        if (searchWhere.OR) {
          where.OR = searchWhere.OR;
        } else if (searchWhere.AND) {
          where.AND = [
            ...(where.AND as Record<string, unknown>[] || []),
            ...((searchWhere.AND as Record<string, unknown>[]) || []),
          ];
        }
      }
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
    // Uses AND logic: item must match price range (via rentalPrice OR salePrice)
    if (minPrice || maxPrice) {
      const priceCondition: Record<string, number> = {};
      if (minPrice) {
        priceCondition.gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        priceCondition.lte = parseFloat(maxPrice);
      }

      // Item qualifies if EITHER rentalPrice OR salePrice is in range
      // This is wrapped in AND (implicit in where) so it combines with other filters
      where.AND = [
        ...(where.AND as Record<string, unknown>[] || []),
        {
          OR: [
            { rentalPrice: priceCondition },
            { salePrice: priceCondition },
          ],
        },
      ];
    }

    // Get total count (only needed for offset pagination or first page)
    // For cursor pagination, we skip count on subsequent pages for performance
    const needsTotalCount = !cursor;
    const total = needsTotalCount ? await prisma.equipment.count({ where }) : 0;

    // Build cursor-based pagination configuration
    // Keyset pagination is more efficient than OFFSET for large datasets because:
    // - OFFSET requires the database to scan and skip N rows
    // - Cursor uses an indexed WHERE clause to jump directly to the right position
    const paginationConfig: {
      skip?: number;
      take: number;
      cursor?: { id: string };
    } = {
      take: limit + 1, // Fetch one extra to determine if there's a next page
    };

    if (cursor) {
      // Cursor-based (keyset) pagination
      // The cursor is the ID of the last item from the previous page
      paginationConfig.cursor = { id: cursor };
      paginationConfig.skip = 1; // Skip the cursor item itself
    } else if (page > 1) {
      // Fallback to offset pagination for backward compatibility
      // Note: This is less efficient for large page numbers
      paginationConfig.skip = (page - 1) * limit;
      paginationConfig.take = limit;
    } else {
      paginationConfig.take = limit + 1;
    }

    // Get equipment with pagination
    const equipmentResults = await prisma.equipment.findMany({
      where,
      include: {
        category: {
          select: { id: true, nameEn: true, nameAr: true, slug: true },
        },
        owner: {
          select: {
            id: true,
            fullName: true,
            trustMetrics: {
              select: {
                badges: true,
                trustScore: true,
                responseRate: true,
                totalReviews: true,
                averageRating: true,
              },
            },
          },
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
      ...paginationConfig,
    });

    // Determine if there are more results
    const hasNextPage = equipmentResults.length > limit;
    const equipment = hasNextPage ? equipmentResults.slice(0, limit) : equipmentResults;
    const nextCursor = hasNextPage && equipment.length > 0 ? equipment[equipment.length - 1].id : null;

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
        // Cursor-based pagination (recommended)
        nextCursor,
        hasNextPage,
        // Offset pagination (backward compatibility)
        page,
        limit,
        total, // Note: total is 0 when using cursor pagination for performance
        totalPages: total > 0 ? Math.ceil(total / limit) : undefined,
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
