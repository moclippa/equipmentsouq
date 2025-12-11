import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/categories
 * List all equipment categories
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentOnly = searchParams.get("parentOnly") === "true";

    const where = parentOnly ? { parentId: null } : {};

    const categories = await prisma.category.findMany({
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

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("List categories error:", error);
    return NextResponse.json(
      { error: "Failed to list categories" },
      { status: 500 }
    );
  }
}
