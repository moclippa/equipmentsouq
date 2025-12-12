/**
 * Edge Middleware for EquipmentSouq
 *
 * This middleware runs at the Edge (closest to users in Saudi Arabia/Bahrain)
 * and provides:
 *
 * 1. Rate Limiting (Upstash Redis)
 *    - Distributed rate limiting across all Edge nodes
 *    - Stricter limits for sensitive endpoints (auth, AI)
 *    - IP-based tracking with sliding window algorithm
 *
 * 2. Geographic Routing & Optimization
 *    - Detects user country from Vercel geo headers
 *    - Sets appropriate defaults for SA/BH users
 *    - Adds geo headers for downstream processing
 *
 * 3. Language Detection & Optimization
 *    - Detects preferred language from Accept-Language header
 *    - Optimizes for Arabic (ar) and English (en)
 *    - Sets locale cookie for consistent experience
 *
 * 4. Edge Caching Hints
 *    - Adds cache control hints for static pages
 *    - Optimizes for Vercel Edge Network
 *
 * Environment variables required:
 * - UPSTASH_REDIS_REST_URL: Upstash Redis REST API URL
 * - UPSTASH_REDIS_REST_TOKEN: Upstash Redis REST API token
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ============================================================
// Geographic Configuration
// Optimized for Saudi Arabia and Bahrain users
// ============================================================

/**
 * Supported countries with their default configurations
 */
const SUPPORTED_COUNTRIES: Record<
  string,
  { currency: string; locale: string; timezone: string }
> = {
  SA: { currency: "SAR", locale: "ar", timezone: "Asia/Riyadh" },
  BH: { currency: "BHD", locale: "ar", timezone: "Asia/Bahrain" },
  // Default for other countries
  DEFAULT: { currency: "SAR", locale: "en", timezone: "Asia/Riyadh" },
};

/**
 * Middle East region countries for edge caching optimization
 */
const MIDDLE_EAST_COUNTRIES = new Set([
  "SA", // Saudi Arabia
  "BH", // Bahrain
  "AE", // UAE
  "KW", // Kuwait
  "QA", // Qatar
  "OM", // Oman
  "JO", // Jordan
  "EG", // Egypt
  "LB", // Lebanon
]);

/**
 * Supported locales
 */
const SUPPORTED_LOCALES = ["ar", "en"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// ============================================================
// Rate Limit Configurations
// ============================================================

interface RateLimitConfig {
  /** Requests per window */
  limit: number;
  /** Window duration string (e.g., "1 m", "1 h") */
  window: string;
}

/**
 * Rate limit configurations by route pattern
 * Uses sliding window algorithm for smooth rate limiting
 */
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth endpoints - strict limits to prevent brute force
  "/api/auth/register": { limit: 5, window: "1 h" },
  "/api/auth/otp/send": { limit: 5, window: "1 h" },
  "/api/auth/otp/verify": { limit: 10, window: "15 m" },
  "/api/user/change-password": { limit: 5, window: "1 h" },

  // AI endpoints - protect expensive API calls
  "/api/ai/parse-document": { limit: 20, window: "1 h" },
  "/api/ai/classify-equipment": { limit: 30, window: "1 h" },
  "/api/ai/generate-listing": { limit: 20, window: "1 h" },
  "/api/ai/suggest-price": { limit: 30, window: "1 h" },

  // User actions
  "/api/leads": { limit: 20, window: "1 h" },
  "/api/upload": { limit: 50, window: "1 h" },
  "/api/equipment": { limit: 30, window: "1 h" },
  "/api/booking-requests": { limit: 20, window: "1 h" },

  // Default for all other API routes
  default: { limit: 100, window: "1 m" },
};

// ============================================================
// Redis Rate Limiter Setup
// ============================================================

// Cache for rate limiter instances
const rateLimiters = new Map<string, Ratelimit>();

// In-memory fallback store for when Redis is unavailable
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if Redis environment variables are configured
 */
function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Get or create a rate limiter for a specific route configuration
 */
function getRateLimiter(config: RateLimitConfig): Ratelimit | null {
  if (!isRedisConfigured()) {
    return null;
  }

  const cacheKey = `${config.limit}:${config.window}`;

  if (!rateLimiters.has(cacheKey)) {
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });

      // Parse window string to duration
      const windowParts = config.window.split(" ");
      const amount = parseInt(windowParts[0], 10);
      const unit = windowParts[1] as "s" | "m" | "h" | "d";

      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.limit, `${amount} ${unit}`),
        analytics: true, // Enable analytics for monitoring
        prefix: "equipmentsouq:ratelimit",
      });

      rateLimiters.set(cacheKey, limiter);
    } catch (error) {
      console.error("[RateLimit] Failed to create rate limiter:", error);
      return null;
    }
  }

  return rateLimiters.get(cacheKey) || null;
}

/**
 * Get client IP address from request headers
 */
function getClientIP(request: NextRequest): string {
  // Try various headers that might contain the real IP
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
 * Get rate limit configuration for a given pathname
 */
function getRateLimitConfig(pathname: string): RateLimitConfig {
  // Check for exact match first
  if (RATE_LIMITS[pathname]) {
    return RATE_LIMITS[pathname];
  }

  // Check for prefix matches
  for (const [pattern, config] of Object.entries(RATE_LIMITS)) {
    if (pattern !== "default" && pathname.startsWith(pattern)) {
      return config;
    }
  }

  return RATE_LIMITS["default"];
}

/**
 * In-memory rate limiting fallback
 * Used when Redis is not configured or unavailable
 */
function checkInMemoryRateLimit(
  key: string,
  config: RateLimitConfig
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  // Parse window to milliseconds
  const windowParts = config.window.split(" ");
  const amount = parseInt(windowParts[0], 10);
  const unit = windowParts[1];
  let windowMs: number;

  switch (unit) {
    case "s":
      windowMs = amount * 1000;
      break;
    case "m":
      windowMs = amount * 60 * 1000;
      break;
    case "h":
      windowMs = amount * 60 * 60 * 1000;
      break;
    case "d":
      windowMs = amount * 24 * 60 * 60 * 1000;
      break;
    default:
      windowMs = 60 * 1000; // Default 1 minute
  }

  let entry = inMemoryStore.get(key);

  // Create new entry if doesn't exist or window has passed
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  entry.count++;
  inMemoryStore.set(key, entry);

  const remaining = Math.max(0, config.limit - entry.count);
  const success = entry.count <= config.limit;

  return { success, remaining, resetAt: entry.resetAt };
}

/**
 * Clean up expired in-memory entries periodically
 */
function cleanupInMemoryStore() {
  const now = Date.now();
  for (const [key, entry] of inMemoryStore.entries()) {
    if (entry.resetAt < now) {
      inMemoryStore.delete(key);
    }
  }
}

// ============================================================
// Geographic & Language Detection Helpers
// ============================================================

/**
 * Detect user's country from Vercel geo headers
 */
function detectCountry(request: NextRequest): string {
  // Vercel provides geo information via headers
  const country = request.headers.get("x-vercel-ip-country");
  return country || "DEFAULT";
}

/**
 * Detect user's city from Vercel geo headers
 */
function detectCity(request: NextRequest): string | null {
  return request.headers.get("x-vercel-ip-city");
}

/**
 * Detect user's region from Vercel geo headers
 */
function detectRegion(request: NextRequest): string | null {
  return request.headers.get("x-vercel-ip-country-region");
}

/**
 * Detect preferred locale from Accept-Language header
 * Falls back to country-based default
 */
function detectLocale(request: NextRequest, country: string): SupportedLocale {
  // Check for existing locale cookie
  const localeCookie = request.cookies.get("locale")?.value;
  if (localeCookie && SUPPORTED_LOCALES.includes(localeCookie as SupportedLocale)) {
    return localeCookie as SupportedLocale;
  }

  // Parse Accept-Language header
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    // Extract language codes and find first supported one
    const languages = acceptLanguage
      .split(",")
      .map((lang) => {
        const [code, q] = lang.trim().split(";");
        return {
          code: code.split("-")[0].toLowerCase(),
          quality: q ? parseFloat(q.split("=")[1]) : 1,
        };
      })
      .sort((a, b) => b.quality - a.quality);

    for (const lang of languages) {
      if (SUPPORTED_LOCALES.includes(lang.code as SupportedLocale)) {
        return lang.code as SupportedLocale;
      }
    }
  }

  // Fall back to country-based default
  const countryConfig = SUPPORTED_COUNTRIES[country] || SUPPORTED_COUNTRIES.DEFAULT;
  return countryConfig.locale as SupportedLocale;
}

/**
 * Check if request is from Middle East region
 */
function isMiddleEastRegion(country: string): boolean {
  return MIDDLE_EAST_COUNTRIES.has(country);
}

// ============================================================
// Middleware
// ============================================================

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ========================================
  // Geographic Detection (runs for all routes)
  // ========================================
  const country = detectCountry(request);
  const city = detectCity(request);
  const region = detectRegion(request);
  const locale = detectLocale(request, country);
  const isMiddleEast = isMiddleEastRegion(country);
  const countryConfig = SUPPORTED_COUNTRIES[country] || SUPPORTED_COUNTRIES.DEFAULT;

  // ========================================
  // Static assets - skip all processing
  // ========================================
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|webp|avif|svg|woff|woff2|ttf|eot|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // ========================================
  // Non-API routes - add geo headers and locale
  // ========================================
  if (!pathname.startsWith("/api")) {
    const response = NextResponse.next();

    // Add geo headers for downstream processing
    response.headers.set("X-User-Country", country);
    response.headers.set("X-User-Locale", locale);
    response.headers.set("X-User-Currency", countryConfig.currency);
    response.headers.set("X-User-Timezone", countryConfig.timezone);

    if (city) {
      response.headers.set("X-User-City", city);
    }
    if (region) {
      response.headers.set("X-User-Region", region);
    }

    // Set locale cookie if not already set (for consistent experience)
    if (!request.cookies.get("locale")) {
      response.cookies.set("locale", locale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: "lax",
      });
    }

    // Add edge caching hints for public pages
    if (pathname === "/" || pathname === "/search" || pathname.startsWith("/equipment/")) {
      // Edge caching hint - content varies by locale
      response.headers.set("X-Edge-Cache-Tag", `locale:${locale},country:${country}`);

      // For Middle East users, hint for regional edge caching
      if (isMiddleEast) {
        response.headers.set("X-Edge-Region", "me-south-1"); // Vercel ME region hint
      }
    }

    return response;
  }

  // ========================================
  // API Routes - Rate Limiting
  // ========================================

  // Skip rate limiting for cron jobs (they have their own auth)
  if (pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }

  // Skip rate limiting for NextAuth internal routes
  if (
    pathname.startsWith("/api/auth/") &&
    !pathname.includes("register") &&
    !pathname.includes("otp")
  ) {
    return NextResponse.next();
  }

  const ip = getClientIP(request);
  const config = getRateLimitConfig(pathname);
  const identifier = `${ip}:${pathname}`;

  // Try Redis rate limiting first
  const limiter = getRateLimiter(config);

  if (limiter) {
    try {
      const { success, limit, remaining, reset } =
        await limiter.limit(identifier);

      // Create rate limit headers
      const headers: Record<string, string> = {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": Math.ceil(reset / 1000).toString(),
        // Add geo headers to API responses
        "X-User-Country": country,
        "X-User-Locale": locale,
      };

      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        return NextResponse.json(
          {
            error: "Too many requests",
            message: "Rate limit exceeded. Please try again later.",
            retryAfter,
          },
          {
            status: 429,
            headers: {
              ...headers,
              "Retry-After": retryAfter.toString(),
            },
          }
        );
      }

      // Continue with request, adding rate limit and geo headers
      const response = NextResponse.next();
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      // Log error and fall through to in-memory fallback
      console.error("[RateLimit] Redis error, falling back to in-memory:", error);
    }
  }

  // Fallback to in-memory rate limiting
  // Note: This doesn't work across serverless instances but provides
  // basic protection when Redis is unavailable

  // Periodic cleanup (1% chance per request)
  if (Math.random() < 0.01) {
    cleanupInMemoryStore();
  }

  const result = checkInMemoryRateLimit(identifier, config);

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": config.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
    // Add geo headers to API responses
    "X-User-Country": country,
    "X-User-Locale": locale,
  };

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": retryAfter.toString(),
        },
      }
    );
  }

  // Continue with the request, adding rate limit and geo headers
  const response = NextResponse.next();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt, sitemap.xml (SEO files)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|eot)$).*)",
  ],
};
