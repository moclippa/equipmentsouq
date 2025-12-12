/**
 * Sentry Edge Configuration for EquipmentSouq
 *
 * This file configures Sentry's error tracking and performance monitoring
 * for Edge runtime functions (middleware, edge API routes).
 *
 * Edge runtime has limited APIs compared to Node.js, so this config
 * is more minimal than the server config.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

// Only initialize Sentry if DSN is configured
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment configuration
    environment: process.env.NODE_ENV,

    // Release tracking (set by Vercel)
    release: process.env.VERCEL_GIT_COMMIT_SHA,

    // ==========================================================================
    // ERROR SAMPLING
    // Capture 100% of errors in production
    // ==========================================================================
    sampleRate: 1.0,

    // ==========================================================================
    // PERFORMANCE MONITORING
    // Sample 10% of transactions for performance data
    // Edge functions are typically fast, so lower sampling is acceptable
    // ==========================================================================
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // ==========================================================================
    // FILTERING
    // Ignore common non-actionable errors
    // ==========================================================================
    ignoreErrors: [
      // Expected auth/navigation errors
      "NEXT_REDIRECT",
      "NEXT_NOT_FOUND",
      // Rate limiting responses
      "Too many requests",
    ],

    // ==========================================================================
    // BEFORE SEND HOOK
    // ==========================================================================
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Don't send expected Next.js navigation errors
      if (
        error &&
        typeof error === "object" &&
        "digest" in error &&
        typeof (error as Record<string, unknown>).digest === "string"
      ) {
        const digest = (error as Record<string, unknown>).digest as string;
        if (
          digest.includes("NEXT_REDIRECT") ||
          digest.includes("NEXT_NOT_FOUND")
        ) {
          return null;
        }
      }

      // Scrub sensitive headers from edge requests
      if (event.request?.headers) {
        const sensitiveHeaders = [
          "authorization",
          "cookie",
          "x-api-key",
          "x-auth-token",
        ];
        for (const header of sensitiveHeaders) {
          if (event.request.headers[header]) {
            event.request.headers[header] = "[REDACTED]";
          }
        }
      }

      return event;
    },

    // ==========================================================================
    // BEFORE SEND TRANSACTION HOOK
    // ==========================================================================
    beforeSendTransaction(event) {
      // Drop static asset requests
      if (
        event.transaction &&
        (event.transaction.includes("/_next/") ||
          event.transaction.includes("/favicon.ico"))
      ) {
        return null;
      }

      return event;
    },

    // Debug mode for development
    debug: process.env.NODE_ENV === "development",
  });
}
