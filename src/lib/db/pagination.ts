/**
 * Keyset Pagination Utilities
 *
 * Provides cursor-based pagination that is O(1) instead of O(n) like OFFSET pagination.
 * Uses composite cursors for stable ordering with tie-breakers.
 */

import { Prisma } from "@prisma/client";

/**
 * Cursor structure for keyset pagination
 * Uses createdAt + id for stable ordering (id breaks ties for same timestamp)
 */
export interface PaginationCursor {
  createdAt: string; // ISO date string
  id: string;
}

/**
 * Encode a cursor to a URL-safe string
 */
export function encodeCursor(cursor: PaginationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

/**
 * Decode a cursor from a URL-safe string
 * Validates the date format to prevent injection attacks
 */
export function decodeCursor(encoded: string): PaginationCursor | null {
  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);

    if (
      typeof parsed.createdAt === "string" &&
      typeof parsed.id === "string"
    ) {
      // Validate ISO 8601 date format to prevent injection
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      if (!isoDateRegex.test(parsed.createdAt)) {
        console.warn("[Pagination] Invalid date format in cursor");
        return null;
      }

      // Verify it's a valid date
      const date = new Date(parsed.createdAt);
      if (isNaN(date.getTime())) {
        console.warn("[Pagination] Invalid date value in cursor");
        return null;
      }

      // Validate ID format (should be a CUID or UUID-like string)
      if (parsed.id.length < 10 || parsed.id.length > 50) {
        console.warn("[Pagination] Invalid ID length in cursor");
        return null;
      }

      return {
        createdAt: parsed.createdAt,
        id: parsed.id,
      };
    }
    return null;
  } catch (error) {
    console.warn("[Pagination] Failed to decode cursor:", error);
    return null;
  }
}

/**
 * Build a Prisma where clause for keyset pagination (descending order)
 *
 * For descending order (newest first), we need items that are:
 * - Created BEFORE the cursor's createdAt, OR
 * - Created at the SAME time but with a SMALLER id
 *
 * This ensures stable pagination even when items have the same timestamp.
 */
export function buildKeysetWhereDesc(
  cursor: PaginationCursor
): Prisma.EquipmentWhereInput {
  const cursorDate = new Date(cursor.createdAt);

  return {
    OR: [
      { createdAt: { lt: cursorDate } },
      {
        AND: [{ createdAt: cursorDate }, { id: { lt: cursor.id } }],
      },
    ],
  };
}

/**
 * Build a Prisma where clause for keyset pagination (ascending order)
 *
 * For ascending order (oldest first), we need items that are:
 * - Created AFTER the cursor's createdAt, OR
 * - Created at the SAME time but with a LARGER id
 */
export function buildKeysetWhereAsc(
  cursor: PaginationCursor
): Prisma.EquipmentWhereInput {
  const cursorDate = new Date(cursor.createdAt);

  return {
    OR: [
      { createdAt: { gt: cursorDate } },
      {
        AND: [{ createdAt: cursorDate }, { id: { gt: cursor.id } }],
      },
    ],
  };
}

/**
 * Extract cursor from the last item in a result set
 */
export function extractCursor(item: {
  id: string;
  createdAt: Date;
}): PaginationCursor {
  return {
    id: item.id,
    createdAt: item.createdAt.toISOString(),
  };
}

/**
 * Pagination response with cursor information
 */
export interface CursorPaginationResult<T> {
  items: T[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
    prevCursor: string | null;
  };
}

/**
 * Build pagination response with cursor encoding
 */
export function buildCursorPaginationResult<
  T extends { id: string; createdAt: Date },
>(
  items: T[],
  limit: number,
  direction: "forward" | "backward" = "forward"
): CursorPaginationResult<T> {
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;

  let nextCursor: string | null = null;
  let prevCursor: string | null = null;

  if (resultItems.length > 0) {
    if (direction === "forward") {
      // Forward pagination: next cursor is last item
      if (hasMore) {
        nextCursor = encodeCursor(extractCursor(resultItems[resultItems.length - 1]));
      }
      // First item could be used for prev cursor (if going backward)
      prevCursor = encodeCursor(extractCursor(resultItems[0]));
    } else {
      // Backward pagination: reverse the items and swap cursors
      if (hasMore) {
        prevCursor = encodeCursor(extractCursor(resultItems[resultItems.length - 1]));
      }
      nextCursor = encodeCursor(extractCursor(resultItems[0]));
    }
  }

  return {
    items: resultItems,
    pagination: {
      limit,
      hasMore,
      nextCursor,
      prevCursor,
    },
  };
}

/**
 * Price-based cursor for sorting by price
 */
export interface PricePaginationCursor {
  price: string; // Decimal as string
  id: string;
}

/**
 * Encode a price cursor
 */
export function encodePriceCursor(cursor: PricePaginationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

/**
 * Decode a price cursor
 * Validates the price format to prevent injection attacks
 */
export function decodePriceCursor(encoded: string): PricePaginationCursor | null {
  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);

    if (typeof parsed.price === "string" && typeof parsed.id === "string") {
      // Validate price is a valid decimal number
      const priceValue = parseFloat(parsed.price);
      if (isNaN(priceValue) || !isFinite(priceValue) || priceValue < 0) {
        console.warn("[Pagination] Invalid price value in cursor");
        return null;
      }

      // Validate ID format (should be a CUID or UUID-like string)
      if (parsed.id.length < 10 || parsed.id.length > 50) {
        console.warn("[Pagination] Invalid ID length in cursor");
        return null;
      }

      return {
        price: parsed.price,
        id: parsed.id,
      };
    }
    return null;
  } catch (error) {
    console.warn("[Pagination] Failed to decode price cursor:", error);
    return null;
  }
}

/**
 * Build where clause for price-based keyset pagination (ascending)
 */
export function buildPriceKeysetWhereAsc(
  cursor: PricePaginationCursor,
  priceField: "rentalPrice" | "salePrice"
): Prisma.EquipmentWhereInput {
  const priceValue = parseFloat(cursor.price);

  return {
    OR: [
      { [priceField]: { gt: priceValue } },
      {
        AND: [{ [priceField]: priceValue }, { id: { gt: cursor.id } }],
      },
    ],
  };
}

/**
 * Build where clause for price-based keyset pagination (descending)
 */
export function buildPriceKeysetWhereDesc(
  cursor: PricePaginationCursor,
  priceField: "rentalPrice" | "salePrice"
): Prisma.EquipmentWhereInput {
  const priceValue = parseFloat(cursor.price);

  return {
    OR: [
      { [priceField]: { lt: priceValue } },
      {
        AND: [{ [priceField]: priceValue }, { id: { lt: cursor.id } }],
      },
    ],
  };
}

/**
 * Legacy OFFSET pagination (kept for backward compatibility)
 *
 * IMPORTANT: This has O(n) performance and should be avoided for large datasets.
 * Use keyset pagination instead when possible.
 */
export interface OffsetPaginationResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Build legacy offset pagination response
 */
export function buildOffsetPaginationResult<T>(
  items: T[],
  page: number,
  limit: number,
  total: number
): OffsetPaginationResult<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
