import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Cached category fetcher
 * Categories rarely change, so we cache for 1 hour with revalidation tag
 * This prevents hitting the database on every category request
 */
const getCachedCategories = unstable_cache(
  async (parentOnly: boolean) => {
    const where = parentOnly ? { parentId: null } : {};

    return prisma.category.findMany({
      where,
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
        slug: true,
        parentId: true,
        iconUrl: true,
        attributeSchema: true,
      },
      orderBy: [{ parentId: "asc" }, { nameEn: "asc" }],
    });
  },
  ["categories"], // Cache key prefix
  {
    revalidate: 3600, // Revalidate every hour (categories rarely change)
    tags: ["categories"], // Tag for manual revalidation when categories are updated
  }
);

/**
 * GET /api/categories
 * List all equipment categories
 *
 * Response is cached for 1 hour. To invalidate cache when categories
 * are updated, call: revalidateTag("categories")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentOnly = searchParams.get("parentOnly") === "true";

    const categories = await getCachedCategories(parentOnly);

    // Add cache headers for CDN/browser caching
    return NextResponse.json(
      { categories },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("List categories error:", error);
    return NextResponse.json(
      { error: "Failed to list categories" },
      { status: 500 }
    );
  }
}
