/**
 * Database Search Utilities
 *
 * Provides optimized full-text search functionality using PostgreSQL tsvector.
 * Falls back to ILIKE search if full-text search is not available.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Sanitize a search query for safe use with PostgreSQL full-text search
 *
 * Uses plainto_tsquery() which automatically handles user input safely.
 * This function only does basic cleanup - the actual sanitization is done by PostgreSQL.
 *
 * @param query - The user's search query
 * @returns Sanitized query string
 */
export function sanitizeSearchQuery(query: string): string {
  // Basic cleanup - remove excessive whitespace
  // plainto_tsquery() handles the actual sanitization
  return query
    .trim()
    .replace(/\s+/g, " ") // Normalize whitespace
    .slice(0, 200); // Limit query length
}

/**
 * Search equipment using PostgreSQL full-text search
 *
 * Uses the pre-computed search_vector column with GIN index for O(log n) performance.
 * Falls back to ILIKE if full-text search fails.
 *
 * @param searchQuery - The user's search query
 * @param options - Additional filter options
 * @returns Prisma where clause for equipment search
 */
export async function searchEquipmentFullText(
  searchQuery: string,
  options: {
    status?: string | string[];
    categoryId?: string;
    locationCity?: string;
    locationCountry?: string;
    listingType?: string;
    minPrice?: number;
    maxPrice?: number;
  } = {}
): Promise<{
  ids: string[];
  useFullText: boolean;
}> {
  const sanitizedQuery = sanitizeSearchQuery(searchQuery);

  if (!sanitizedQuery) {
    return { ids: [], useFullText: false };
  }

  try {
    // Use plainto_tsquery() which safely handles user input without manual parsing
    // This prevents SQL injection by letting PostgreSQL handle the query parsing
    const results = await prisma.$queryRaw<{ id: string; rank: number }[]>`
      SELECT id, ts_rank(search_vector, plainto_tsquery('english', ${sanitizedQuery})) as rank
      FROM "Equipment"
      WHERE search_vector @@ plainto_tsquery('english', ${sanitizedQuery})
      ${options.status ? Prisma.sql`AND status = ${options.status}::text::"ListingStatus"` : Prisma.empty}
      ${options.categoryId ? Prisma.sql`AND "categoryId" = ${options.categoryId}` : Prisma.empty}
      ${options.locationCity ? Prisma.sql`AND "locationCity" = ${options.locationCity}` : Prisma.empty}
      ${options.locationCountry ? Prisma.sql`AND "locationCountry" = ${options.locationCountry}::text::"Country"` : Prisma.empty}
      ORDER BY rank DESC
      LIMIT 1000
    `;

    return {
      ids: results.map((r) => r.id),
      useFullText: true,
    };
  } catch (error) {
    console.warn("Full-text search failed, falling back to ILIKE:", error);
    return { ids: [], useFullText: false };
  }
}

/**
 * Build a Prisma-compatible where clause for equipment search
 *
 * This is the fallback ILIKE-based search when full-text search is not available.
 * It's slower but works without the tsvector column.
 */
export function buildEquipmentSearchWhere(searchQuery: string): Prisma.EquipmentWhereInput {
  const terms = searchQuery.trim().split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return {};
  }

  // For single term, search across all fields
  if (terms.length === 1) {
    const term = terms[0];
    return {
      OR: [
        { titleEn: { contains: term, mode: "insensitive" } },
        { titleAr: { contains: term, mode: "insensitive" } },
        { make: { contains: term, mode: "insensitive" } },
        { model: { contains: term, mode: "insensitive" } },
        { descriptionEn: { contains: term, mode: "insensitive" } },
      ],
    };
  }

  // For multiple terms, require all terms to match (AND logic)
  // Each term can match in any field (OR within term)
  return {
    AND: terms.map((term) => ({
      OR: [
        { titleEn: { contains: term, mode: "insensitive" } },
        { titleAr: { contains: term, mode: "insensitive" } },
        { make: { contains: term, mode: "insensitive" } },
        { model: { contains: term, mode: "insensitive" } },
        { descriptionEn: { contains: term, mode: "insensitive" } },
      ],
    })),
  };
}

/**
 * Full-text search with Prisma raw query
 *
 * This function performs a full-text search using PostgreSQL's tsvector
 * and returns equipment IDs ordered by relevance.
 *
 * @param query - Search query string
 * @param limit - Maximum number of results
 * @returns Array of equipment IDs sorted by relevance
 */
export async function fullTextSearchEquipment(
  query: string,
  limit: number = 100
): Promise<string[]> {
  const sanitizedQuery = sanitizeSearchQuery(query);

  if (!sanitizedQuery) {
    return [];
  }

  try {
    // Use plainto_tsquery() for safe handling of user input
    const results = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM "Equipment"
      WHERE search_vector @@ plainto_tsquery('english', ${sanitizedQuery})
        AND status = 'ACTIVE'
      ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${sanitizedQuery})) DESC
      LIMIT ${limit}
    `;

    return results.map((r) => r.id);
  } catch (error) {
    console.error("Full-text search error:", error);
    return [];
  }
}
