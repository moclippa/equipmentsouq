/**
 * Sentry Server Configuration for EquipmentSouq
 *
 * This file configures Sentry's error tracking and performance monitoring
 * for the server-side of the Next.js application (API routes, SSR, etc.).
 *
 * Features:
 * - Error tracking with 100% sample rate
 * - Performance monitoring with 10% sample rate
 * - Database query tracking via Prisma
 * - HTTP request/response tracking
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
    // Adjust based on traffic volume and Sentry quota
    // ==========================================================================
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // ==========================================================================
    // PROFILING (Optional - requires Sentry Profiling add-on)
    // Provides CPU profiling data for performance analysis
    // ==========================================================================
    // profilesSampleRate: 0.1,

    // ==========================================================================
    // INTEGRATIONS
    // ==========================================================================
    integrations: [
      // HTTP integration for request/response tracking
      Sentry.httpIntegration(),

      // Prisma integration for database query tracking
      Sentry.prismaIntegration(),
    ],

    // ==========================================================================
    // FILTERING
    // Ignore common non-actionable errors
    // ==========================================================================
    ignoreErrors: [
      // Expected auth errors
      "NEXT_REDIRECT",
      "NEXT_NOT_FOUND",
      // Rate limiting
      "Too many requests",
      // Network timeouts (handled by retry logic)
      "ETIMEDOUT",
      "ECONNRESET",
      "ECONNREFUSED",
    ],

    // ==========================================================================
    // BEFORE SEND HOOK
    // Last chance to modify or drop events
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

      // Scrub sensitive data from request body
      if (event.request?.data) {
        const sensitiveFields = [
          "password",
          "token",
          "otp",
          "secret",
          "apiKey",
          "bankAccount",
          "iban",
        ];
        const data =
          typeof event.request.data === "string"
            ? JSON.parse(event.request.data)
            : event.request.data;

        for (const field of sensitiveFields) {
          if (data[field]) {
            data[field] = "[REDACTED]";
          }
        }

        event.request.data = JSON.stringify(data);
      }

      // Scrub sensitive headers
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
    // Filter out noisy transactions
    // ==========================================================================
    beforeSendTransaction(event) {
      // Drop health check and internal transactions
      const ignoredTransactions = [
        "/api/health",
        "/_next/",
        "/favicon.ico",
        "/__nextjs_original-stack-frame",
      ];

      if (
        event.transaction &&
        ignoredTransactions.some((t) => event.transaction?.includes(t))
      ) {
        return null;
      }

      return event;
    },

    // Debug mode for development
    debug: process.env.NODE_ENV === "development",
  });
}
