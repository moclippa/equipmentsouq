import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Bundle analyzer configuration (enabled via ANALYZE env var)
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/**
 * Next.js Configuration for EquipmentSouq
 *
 * Optimized for:
 * - Saudi Arabia and Bahrain users (Middle East Edge regions)
 * - Heavy equipment images (large files, equipment photos)
 * - Bilingual content (Arabic RTL + English LTR)
 * - Cloudflare R2 + Vercel Edge Network
 */
const nextConfig: NextConfig = {
  // Turbopack configuration
  turbopack: {
    root: process.cwd(),
  },

  // ==========================================================================
  // IMAGE OPTIMIZATION
  // Optimized for heavy equipment photos stored in Cloudflare R2
  // ==========================================================================
  images: {
    // Allow images from R2 and common CDN domains
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    // Modern formats for best compression (AVIF first for supported browsers)
    formats: ["image/avif", "image/webp"],
    // Device sizes optimized for equipment detail pages
    // Includes larger sizes for equipment gallery views
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for thumbnails and cards
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 30 days cache - equipment photos rarely change
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Use sharp for better image quality
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // ==========================================================================
  // PERFORMANCE SETTINGS
  // ==========================================================================
  compress: true,
  poweredByHeader: false,

  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Experimental features for better performance
  experimental: {
    // Enable partial prerendering for faster initial loads (when stable)
    // ppr: true,
  },

  // ==========================================================================
  // HTTP HEADERS
  // Security headers + CDN caching directives
  // ==========================================================================
  async headers() {
    // Base security headers applied to all routes
    const securityHeaders = [
      {
        key: "X-DNS-Prefetch-Control",
        value: "on",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "X-XSS-Protection",
        value: "1; mode=block",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "Permissions-Policy",
        value: [
          "camera=()",
          "microphone=()",
          "geolocation=(self)",
          "payment=(self)",
          "accelerometer=()",
          "gyroscope=()",
          "magnetometer=()",
          "usb=()",
        ].join(", "),
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https: blob:",
          "font-src 'self' data:",
          "connect-src 'self' https://api.anthropic.com https://generativelanguage.googleapis.com https://vitals.vercel-insights.com https://*.sentry.io https://*.ingest.sentry.io wss:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "upgrade-insecure-requests",
        ].join("; "),
      },
    ];

    return [
      // ========================================
      // Global security headers
      // ========================================
      {
        source: "/:path*",
        headers: securityHeaders,
      },

      // ========================================
      // Static assets - aggressive caching
      // Immutable files served from CDN edge
      // ========================================
      {
        source: "/(.*)\\.(ico|png|jpg|jpeg|gif|webp|avif|svg|woff|woff2|ttf|eot)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            // Hint to CDN to serve from nearest edge
            key: "CDN-Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },

      // ========================================
      // Next.js static files - immutable
      // ========================================
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },

      // ========================================
      // API: Categories - heavily cached
      // Categories rarely change, cache at edge
      // ========================================
      {
        source: "/api/categories",
        headers: [
          {
            key: "Cache-Control",
            // 1 hour cache, 24 hour stale-while-revalidate
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
          {
            // Vary by Accept-Language for bilingual content
            key: "Vary",
            value: "Accept-Language",
          },
        ],
      },

      // ========================================
      // API: Equipment list - short cache with SWR
      // Fresh enough for new listings, cached for performance
      // ========================================
      {
        source: "/api/equipment",
        headers: [
          {
            key: "Cache-Control",
            // 60 seconds cache, 5 minute stale-while-revalidate
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
          {
            key: "Vary",
            value: "Accept-Language, Accept-Encoding",
          },
        ],
      },

      // ========================================
      // API: Equipment detail - moderate cache
      // Individual listings don't change often
      // ========================================
      {
        source: "/api/equipment/:id",
        headers: [
          {
            key: "Cache-Control",
            // 5 minute cache, 1 hour stale-while-revalidate
            value: "public, s-maxage=300, stale-while-revalidate=3600",
          },
          {
            key: "Vary",
            value: "Accept-Language",
          },
        ],
      },

      // ========================================
      // API: Recent transactions - short cache
      // Updates frequently but can tolerate slight staleness
      // ========================================
      {
        source: "/api/equipment/recent-transactions",
        headers: [
          {
            key: "Cache-Control",
            // 5 minute cache, 30 minute stale-while-revalidate
            value: "public, s-maxage=300, stale-while-revalidate=1800",
          },
        ],
      },

      // ========================================
      // Search pages - edge cached with geo-variance
      // ========================================
      {
        source: "/search",
        headers: [
          {
            key: "Cache-Control",
            // 1 minute cache, 5 minute stale-while-revalidate
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
          {
            // Vary by country for localized results
            key: "Vary",
            value: "Accept-Language, Accept-Encoding",
          },
        ],
      },

      // ========================================
      // Homepage - moderate cache for dynamic content
      // ========================================
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            // 5 minute cache, 1 hour stale-while-revalidate
            value: "public, s-maxage=300, stale-while-revalidate=3600",
          },
          {
            key: "Vary",
            value: "Accept-Language",
          },
        ],
      },

      // ========================================
      // Equipment detail pages - moderate cache
      // ========================================
      {
        source: "/equipment/:id",
        headers: [
          {
            key: "Cache-Control",
            // 5 minute cache, 1 hour stale-while-revalidate
            value: "public, s-maxage=300, stale-while-revalidate=3600",
          },
          {
            key: "Vary",
            value: "Accept-Language",
          },
        ],
      },

      // ========================================
      // Auth/Dashboard routes - no caching
      // Private/personalized content
      // ========================================
      {
        source: "/api/auth/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/api/leads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/api/booking-requests/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/api/business-profile/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/api/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },

  // ==========================================================================
  // REDIRECTS
  // SEO-friendly redirects for common patterns
  // ==========================================================================
  async redirects() {
    return [
      // Redirect www to non-www (assuming non-www is canonical)
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.equipmentsouq.com",
          },
        ],
        destination: "https://equipmentsouq.com/:path*",
        permanent: true,
      },
    ];
  },
};

// ==========================================================================
// SENTRY CONFIGURATION
// Error tracking and performance monitoring
// ==========================================================================
const sentryWebpackPluginOptions = {
  // Organization and project slugs from Sentry dashboard
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps (set in Vercel env vars)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only upload source maps in production builds
  silent: process.env.NODE_ENV !== "production",

  // Upload source maps for better stack traces
  widenClientFileUpload: true,

  // Hide source map files from production bundles
  hideSourceMaps: true,

  // Disable automatic instrumentation of Vercel Cron jobs (handled manually)
  automaticVercelMonitors: true,

  // Tunnel errors through our domain to avoid ad blockers
  tunnelRoute: "/monitoring",

  // Disable logger for cleaner build output
  disableLogger: true,

  // React component annotations for better stack traces
  reactComponentAnnotation: {
    enabled: true,
  },
};

// Apply plugins: Sentry wraps bundle analyzer wraps next-intl
const configWithPlugins = withBundleAnalyzer(withNextIntl(nextConfig));

export default withSentryConfig(configWithPlugins, sentryWebpackPluginOptions);
