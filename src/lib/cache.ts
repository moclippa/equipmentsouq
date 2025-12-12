/**
 * Redis Caching Utility for EquipmentSouq
 *
 * Uses Upstash Redis for serverless-compatible caching.
 * Works across all Vercel serverless instances.
 *
 * Environment variables required:
 * - UPSTASH_REDIS_REST_URL: Upstash Redis REST API URL
 * - UPSTASH_REDIS_REST_TOKEN: Upstash Redis REST API token
 */

import { Redis } from "@upstash/redis";

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  /** Categories - 24 hours (static data) */
  CATEGORIES: 24 * 60 * 60,
  /** Featured equipment - 1 hour */
  FEATURED_EQUIPMENT: 60 * 60,
  /** User sessions - 30 minutes */
  USER_SESSION: 30 * 60,
  /** Stats (equipment count, owner count) - 5 minutes */
  STATS: 5 * 60,
  /** Recent transactions - 15 minutes */
  RECENT_TRANSACTIONS: 15 * 60,
  /** Search results - 5 minutes */
  SEARCH_RESULTS: 5 * 60,
  /** Equipment detail - 10 minutes */
  EQUIPMENT_DETAIL: 10 * 60,
} as const;

// Cache key prefixes for organization and invalidation
export const CACHE_KEYS = {
  CATEGORIES: "categories",
  CATEGORIES_PARENT_ONLY: "categories:parent-only",
  FEATURED_EQUIPMENT: "featured-equipment",
  STATS: "stats",
  RECENT_TRANSACTIONS: "recent-transactions",
  EQUIPMENT: "equipment", // equipment:{id}
  SEARCH: "search", // search:{hash}
  USER_SESSION: "session", // session:{userId}
} as const;

// Lazy-initialized Redis client to avoid errors when env vars are not set
let redisClient: Redis | null = null;

/**
 * Get the Redis client instance.
 * Lazily initializes to avoid errors during build time.
 */
function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Cache] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set. Caching disabled."
      );
    }
    return null;
  }

  try {
    redisClient = new Redis({
      url,
      token,
    });
    return redisClient;
  } catch (error) {
    console.error("[Cache] Failed to initialize Redis client:", error);
    return null;
  }
}

/**
 * Export redis client for direct access (e.g., for rate limiting)
 */
export function getRedis(): Redis | null {
  return getRedisClient();
}

/**
 * Check if caching is available
 */
export function isCacheAvailable(): boolean {
  return getRedisClient() !== null;
}

/**
 * Get a cached value by key
 * @param key - Cache key
 * @returns Cached value or null if not found
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const cached = await redis.get<T>(key);
    return cached;
  } catch (error) {
    console.error(`[Cache] Error getting key ${key}:`, error);
    return null;
  }
}

/**
 * Set a cached value with TTL
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttlSeconds - Time to live in seconds
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.error(`[Cache] Error setting key ${key}:`, error);
  }
}

/**
 * Delete a cached value
 * @param key - Cache key
 */
export async function deleteCached(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    console.error(`[Cache] Error deleting key ${key}:`, error);
  }
}

/**
 * Delete all cached values matching a pattern
 * @param pattern - Key pattern (e.g., "equipment:*")
 */
export async function deleteCachedPattern(pattern: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    // Use SCAN to find matching keys
    const keys: string[] = [];
    let cursor = "0";
    do {
      const result: [string, string[]] = await redis.scan(cursor, {
        match: pattern,
        count: 100,
      });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== "0");

    // Delete all matching keys
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error(`[Cache] Error deleting pattern ${pattern}:`, error);
  }
}

/**
 * Get or set cached value (cache-aside pattern)
 * @param key - Cache key
 * @param ttlSeconds - Time to live in seconds
 * @param fetchFn - Function to fetch data if cache miss
 * @returns Cached or freshly fetched value
 */
export async function getOrSetCached<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache
  const cached = await getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Store in cache (don't await, fire and forget)
  setCached(key, data, ttlSeconds).catch(() => {
    // Error already logged in setCached
  });

  return data;
}

// ============================================================
// Typed Cache Functions for Common Data
// ============================================================

export interface CachedCategory {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  parentId: string | null;
  iconUrl: string | null;
  attributeSchema: unknown;
}

/**
 * Get cached categories
 * @param parentOnly - Only return top-level categories
 */
export async function getCachedCategories(
  parentOnly: boolean = false
): Promise<CachedCategory[] | null> {
  const key = parentOnly
    ? CACHE_KEYS.CATEGORIES_PARENT_ONLY
    : CACHE_KEYS.CATEGORIES;
  return getCached<CachedCategory[]>(key);
}

/**
 * Set cached categories
 * @param categories - Categories to cache
 * @param parentOnly - Whether these are top-level only
 */
export async function setCachedCategories(
  categories: CachedCategory[],
  parentOnly: boolean = false
): Promise<void> {
  const key = parentOnly
    ? CACHE_KEYS.CATEGORIES_PARENT_ONLY
    : CACHE_KEYS.CATEGORIES;
  await setCached(key, categories, CACHE_TTL.CATEGORIES);
}

/**
 * Invalidate all category caches
 */
export async function invalidateCategoryCache(): Promise<void> {
  await Promise.all([
    deleteCached(CACHE_KEYS.CATEGORIES),
    deleteCached(CACHE_KEYS.CATEGORIES_PARENT_ONLY),
  ]);
}

export interface CachedFeaturedEquipment {
  id: string;
  titleEn: string;
  titleAr: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  viewCount: number;
  rentalPrice: number | null;
  rentalPriceUnit: string | null;
  currency: string;
  locationCity: string | null;
  category: {
    nameEn: string;
  };
  images: Array<{
    url: string;
  }>;
}

/**
 * Get cached featured equipment
 */
export async function getCachedFeaturedEquipment(): Promise<
  CachedFeaturedEquipment[] | null
> {
  return getCached<CachedFeaturedEquipment[]>(CACHE_KEYS.FEATURED_EQUIPMENT);
}

/**
 * Set cached featured equipment
 */
export async function setCachedFeaturedEquipment(
  equipment: CachedFeaturedEquipment[]
): Promise<void> {
  await setCached(
    CACHE_KEYS.FEATURED_EQUIPMENT,
    equipment,
    CACHE_TTL.FEATURED_EQUIPMENT
  );
}

/**
 * Invalidate featured equipment cache
 */
export async function invalidateFeaturedEquipmentCache(): Promise<void> {
  await deleteCached(CACHE_KEYS.FEATURED_EQUIPMENT);
}

export interface CachedStats {
  equipment: number;
  owners: number;
  leads: number;
}

/**
 * Get cached site stats
 */
export async function getCachedStats(): Promise<CachedStats | null> {
  return getCached<CachedStats>(CACHE_KEYS.STATS);
}

/**
 * Set cached site stats
 */
export async function setCachedStats(stats: CachedStats): Promise<void> {
  await setCached(CACHE_KEYS.STATS, stats, CACHE_TTL.STATS);
}

/**
 * Invalidate stats cache
 */
export async function invalidateStatsCache(): Promise<void> {
  await deleteCached(CACHE_KEYS.STATS);
}

/**
 * Cache recent transactions
 */
export async function getCachedRecentTransactions<T>(): Promise<T[] | null> {
  return getCached<T[]>(CACHE_KEYS.RECENT_TRANSACTIONS);
}

export async function setCachedRecentTransactions<T>(
  transactions: T[]
): Promise<void> {
  await setCached(
    CACHE_KEYS.RECENT_TRANSACTIONS,
    transactions,
    CACHE_TTL.RECENT_TRANSACTIONS
  );
}

export async function invalidateRecentTransactionsCache(): Promise<void> {
  await deleteCached(CACHE_KEYS.RECENT_TRANSACTIONS);
}

/**
 * Cache individual equipment detail
 */
export async function getCachedEquipment<T>(id: string): Promise<T | null> {
  return getCached<T>(`${CACHE_KEYS.EQUIPMENT}:${id}`);
}

export async function setCachedEquipment<T>(
  id: string,
  equipment: T
): Promise<void> {
  await setCached(
    `${CACHE_KEYS.EQUIPMENT}:${id}`,
    equipment,
    CACHE_TTL.EQUIPMENT_DETAIL
  );
}

export async function invalidateEquipmentCache(id: string): Promise<void> {
  await deleteCached(`${CACHE_KEYS.EQUIPMENT}:${id}`);
}

/**
 * Invalidate all equipment-related caches
 * Call when equipment is created, updated, or deleted
 */
export async function invalidateAllEquipmentCaches(
  equipmentId?: string
): Promise<void> {
  const promises = [
    invalidateFeaturedEquipmentCache(),
    invalidateStatsCache(),
    invalidateRecentTransactionsCache(),
    deleteCachedPattern(`${CACHE_KEYS.SEARCH}:*`),
  ];

  if (equipmentId) {
    promises.push(invalidateEquipmentCache(equipmentId));
  }

  await Promise.all(promises);
}

/**
 * Generate a cache key for search results
 * @param params - Search parameters object
 */
export function generateSearchCacheKey(
  params: Record<string, string | number | boolean | undefined>
): string {
  // Sort keys for consistent hashing
  const sortedParams = Object.keys(params)
    .filter((key) => params[key] !== undefined)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  // Create a simple hash
  let hash = 0;
  for (let i = 0; i < sortedParams.length; i++) {
    const char = sortedParams.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return `${CACHE_KEYS.SEARCH}:${hash.toString(16)}`;
}

/**
 * Cache user session data
 */
export async function getCachedUserSession<T>(
  userId: string
): Promise<T | null> {
  return getCached<T>(`${CACHE_KEYS.USER_SESSION}:${userId}`);
}

export async function setCachedUserSession<T>(
  userId: string,
  session: T
): Promise<void> {
  await setCached(
    `${CACHE_KEYS.USER_SESSION}:${userId}`,
    session,
    CACHE_TTL.USER_SESSION
  );
}

export async function invalidateUserSession(userId: string): Promise<void> {
  await deleteCached(`${CACHE_KEYS.USER_SESSION}:${userId}`);
}

// ============================================================
// Health Check
// ============================================================

/**
 * Check Redis connection health
 * @returns Connection status and latency
 */
export async function checkCacheHealth(): Promise<{
  connected: boolean;
  latencyMs: number | null;
  error?: string;
}> {
  const redis = getRedisClient();
  if (!redis) {
    return {
      connected: false,
      latencyMs: null,
      error: "Redis not configured",
    };
  }

  try {
    const start = Date.now();
    await redis.ping();
    const latencyMs = Date.now() - start;

    return {
      connected: true,
      latencyMs,
    };
  } catch (error) {
    return {
      connected: false,
      latencyMs: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
