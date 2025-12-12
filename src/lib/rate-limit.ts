/**
 * Rate Limiting Utilities for API Routes
 *
 * Provides both Redis-based (distributed) and in-memory (fallback) rate limiting.
 * Use these utilities for granular rate limiting within specific API routes
 * beyond what the middleware provides.
 *
 * For production with multiple server instances, Redis is required.
 * Falls back to in-memory when Redis is not configured.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ============================================================
// Types
// ============================================================

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

// ============================================================
// Redis Rate Limiter
// ============================================================

// Cache for Redis rate limiter instances
const redisLimiters = new Map<string, Ratelimit>();
let redisInstance: Redis | null = null;

/**
 * Check if Redis is configured
 */
function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Get or create Redis instance
 */
function getRedis(): Redis | null {
  if (!isRedisConfigured()) {
    return null;
  }

  if (!redisInstance) {
    try {
      redisInstance = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
    } catch (error) {
      console.error("[RateLimit] Failed to create Redis instance:", error);
      return null;
    }
  }

  return redisInstance;
}

/**
 * Get or create a Redis rate limiter
 */
function getRedisLimiter(config: RateLimitConfig, prefix: string): Ratelimit | null {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  const cacheKey = `${prefix}:${config.limit}:${config.windowSeconds}`;

  if (!redisLimiters.has(cacheKey)) {
    try {
      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
        prefix: `equipmentsouq:${prefix}`,
      });
      redisLimiters.set(cacheKey, limiter);
    } catch (error) {
      console.error("[RateLimit] Failed to create limiter:", error);
      return null;
    }
  }

  return redisLimiters.get(cacheKey) || null;
}

// ============================================================
// In-Memory Fallback
// ============================================================

interface InMemoryEntry {
  count: number;
  resetAt: number;
}

// In-memory store (resets on server restart)
const inMemoryStore = new Map<string, InMemoryEntry>();

// Clean up expired entries periodically
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of inMemoryStore.entries()) {
        if (entry.resetAt < now) {
          inMemoryStore.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Clean every 5 minutes
  }
}

/**
 * In-memory rate limit check
 */
function checkInMemoryRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  startCleanup();

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let entry = inMemoryStore.get(identifier);

  // Create new entry if doesn't exist or window has passed
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  // Increment count
  entry.count++;
  inMemoryStore.set(identifier, entry);

  const remaining = Math.max(0, config.limit - entry.count);
  const success = entry.count <= config.limit;

  return {
    success,
    limit: config.limit,
    remaining,
    resetAt: entry.resetAt,
  };
}

// ============================================================
// Main API
// ============================================================

/**
 * Check rate limit for a given identifier
 * Uses Redis if configured, falls back to in-memory
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID, compound key)
 * @param config - Rate limit configuration
 * @param prefix - Optional prefix for Redis keys (default: "api")
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  prefix: string = "api"
): Promise<RateLimitResult> {
  // Try Redis first
  const limiter = getRedisLimiter(config, prefix);

  if (limiter) {
    try {
      const { success, limit, remaining, reset } = await limiter.limit(identifier);
      return {
        success,
        limit,
        remaining,
        resetAt: reset,
      };
    } catch (error) {
      console.error("[RateLimit] Redis error, falling back to in-memory:", error);
    }
  }

  // Fallback to in-memory
  return checkInMemoryRateLimit(identifier, config);
}

/**
 * Synchronous rate limit check (in-memory only)
 * Use when async is not possible
 */
export function checkRateLimitSync(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  return checkInMemoryRateLimit(identifier, config);
}

// ============================================================
// Pre-configured Rate Limits
// ============================================================

/**
 * Pre-configured rate limits for different API endpoints
 */
export const RATE_LIMITS = {
  // Authentication endpoints - strict limits
  auth: {
    register: { limit: 5, windowSeconds: 3600 },        // 5 per hour
    login: { limit: 10, windowSeconds: 900 },           // 10 per 15 minutes
    otpSend: { limit: 5, windowSeconds: 3600 },         // 5 per hour
    otpVerify: { limit: 10, windowSeconds: 900 },       // 10 per 15 minutes
    passwordChange: { limit: 5, windowSeconds: 3600 },  // 5 per hour
  },

  // AI endpoints - protect expensive API calls
  ai: {
    parseDocument: { limit: 20, windowSeconds: 3600 },     // 20 per hour
    classifyEquipment: { limit: 30, windowSeconds: 3600 }, // 30 per hour
    generateListing: { limit: 20, windowSeconds: 3600 },   // 20 per hour
    suggestPrice: { limit: 30, windowSeconds: 3600 },      // 30 per hour
  },

  // User actions
  leads: {
    create: { limit: 20, windowSeconds: 3600 },  // 20 leads per hour
  },
  upload: {
    files: { limit: 50, windowSeconds: 3600 },   // 50 uploads per hour
  },
  equipment: {
    create: { limit: 10, windowSeconds: 3600 },  // 10 listings per hour
  },

  // General API access
  api: {
    general: { limit: 100, windowSeconds: 60 },  // 100 requests per minute
  },
} as const;

// ============================================================
// Utility Functions
// ============================================================

/**
 * Get client IP address from request headers
 */
export function getClientIP(request: Request): string {
  // Check various headers that might contain the real IP
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Vercel provides this header
  const vercelIP = request.headers.get("x-vercel-forwarded-for");
  if (vercelIP) {
    return vercelIP.split(",")[0].trim();
  }

  // Fallback for development
  return "127.0.0.1";
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
  };
}

/**
 * Create a compound identifier for more specific rate limiting
 * @example createIdentifier(ip, userId, action) => "127.0.0.1:user123:create-lead"
 */
export function createIdentifier(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(":");
}
