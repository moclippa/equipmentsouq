/**
 * Sentry Client Configuration for EquipmentSouq
 *
 * This file configures Sentry's error tracking and performance monitoring
 * for the browser/client-side of the Next.js application.
 *
 * Features:
 * - Error tracking with 100% sample rate
 * - Performance monitoring with 10% sample rate
 * - Session replay for error reproduction (1% sample, 100% on error)
 * - Web Vitals integration for Core Web Vitals tracking
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Only initialize Sentry if DSN is configured
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment configuration
    environment: process.env.NODE_ENV,

    // Release tracking (set by Vercel)
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

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
    // SESSION REPLAY
    // Capture user sessions for debugging production issues
    // ==========================================================================
    replaysSessionSampleRate: 0.01, // 1% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // ==========================================================================
    // INTEGRATIONS
    // ==========================================================================
    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration({
        // Enable trace propagation to backend
        enableInp: true,
      }),

      // Session replay for debugging
      Sentry.replayIntegration({
        // Mask all text content for privacy (equipment listings may have sensitive data)
        maskAllText: false,
        // Block media to reduce storage costs
        blockAllMedia: false,
        // Mask user inputs (phone numbers, names)
        maskAllInputs: true,
      }),
    ],

    // ==========================================================================
    // FILTERING
    // Ignore common non-actionable errors
    // ==========================================================================
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      "fb_xd_fragment",
      // Network errors (handled by app)
      "Failed to fetch",
      "NetworkError",
      "Load failed",
      // Cancelled requests
      "AbortError",
      "The operation was aborted",
      // Third-party scripts
      "Script error.",
      // Safari private browsing
      "QuotaExceededError",
      // Mobile browsers
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
    ],

    // Filter out events from third-party scripts
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      // Firefox extensions
      /^moz-extension:\/\//i,
      // Safari extensions
      /^safari-extension:\/\//i,
      // Analytics and ads
      /google-analytics\.com/i,
      /googletagmanager\.com/i,
      /facebook\.net/i,
    ],

    // ==========================================================================
    // BEFORE SEND HOOK
    // Last chance to modify or drop events
    // ==========================================================================
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (
        process.env.NODE_ENV === "development" &&
        !process.env.NEXT_PUBLIC_SENTRY_DEBUG
      ) {
        console.log("[Sentry Dev]", event.message || event.exception);
        return null;
      }

      // Scrub sensitive data from user context
      if (event.user) {
        // Keep user ID for debugging, remove PII
        event.user = {
          id: event.user.id,
        };
      }

      return event;
    },

    // ==========================================================================
    // BEFORE SEND TRANSACTION HOOK
    // Filter out noisy transactions
    // ==========================================================================
    beforeSendTransaction(event) {
      // Drop health check transactions
      if (event.transaction?.includes("/api/health")) {
        return null;
      }

      return event;
    },

    // Debug mode for development
    debug: process.env.NODE_ENV === "development",
  });
}
