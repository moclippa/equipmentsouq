"use client";

/**
 * Web Vitals Provider for EquipmentSouq
 *
 * This component tracks Core Web Vitals metrics and reports them to:
 * 1. Sentry for correlation with errors
 * 2. Our custom monitoring endpoint for historical analysis
 * 3. Vercel Analytics (if enabled)
 *
 * Core Web Vitals tracked:
 * - LCP (Largest Contentful Paint): Loading performance
 * - FID (First Input Delay): Interactivity (replaced by INP)
 * - INP (Interaction to Next Paint): Responsiveness
 * - CLS (Cumulative Layout Shift): Visual stability
 * - TTFB (Time to First Byte): Server response time
 * - FCP (First Contentful Paint): First render time
 *
 * @see https://web.dev/vitals/
 */

import { useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import * as Sentry from "@sentry/nextjs";

// =============================================================================
// TYPES
// =============================================================================

interface WebVitalMetric {
  id: string;
  name: "LCP" | "FID" | "CLS" | "TTFB" | "INP" | "FCP";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  entries: PerformanceEntry[];
  navigationType: string;
}

interface ReportedMetrics {
  name: string;
  value: number;
  rating: string;
  path: string;
  timestamp: number;
}

// =============================================================================
// THRESHOLDS (per Google's recommendations)
// =============================================================================

const WEB_VITAL_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // milliseconds
  FID: { good: 100, poor: 300 }, // milliseconds
  INP: { good: 200, poor: 500 }, // milliseconds
  CLS: { good: 0.1, poor: 0.25 }, // unitless
  TTFB: { good: 800, poor: 1800 }, // milliseconds
  FCP: { good: 1800, poor: 3000 }, // milliseconds
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get rating based on value and thresholds
 */
function getRating(
  name: WebVitalMetric["name"],
  value: number
): "good" | "needs-improvement" | "poor" {
  const threshold = WEB_VITAL_THRESHOLDS[name];
  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs-improvement";
  return "poor";
}

/**
 * Generate a session ID for tracking
 */
function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = sessionStorage.getItem("web_vitals_session");
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem("web_vitals_session", sessionId);
  }
  return sessionId;
}

/**
 * Get user ID from localStorage (set by auth)
 */
function getUserId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem("user_id") || undefined;
}

// =============================================================================
// COMPONENT
// =============================================================================

interface WebVitalsProviderProps {
  children: React.ReactNode;
  /**
   * Enable debug logging to console
   * @default false
   */
  debug?: boolean;
  /**
   * Custom endpoint for reporting metrics
   * @default "/api/analytics"
   */
  reportEndpoint?: string;
  /**
   * Batch report interval in milliseconds
   * @default 5000
   */
  reportInterval?: number;
}

export function WebVitalsProvider({
  children,
  debug = false,
  reportEndpoint = "/api/analytics",
  reportInterval = 5000,
}: WebVitalsProviderProps) {
  const pathname = usePathname();
  const metricsQueueRef = useRef<ReportedMetrics[]>([]);
  const reportedRef = useRef<Set<string>>(new Set());
  const lastReportRef = useRef<number>(0);

  /**
   * Send metrics to the analytics endpoint
   */
  const reportMetrics = useCallback(
    async (force = false) => {
      const queue = metricsQueueRef.current;

      // Don't report if queue is empty
      if (queue.length === 0) return;

      // Don't report too frequently unless forced
      const now = Date.now();
      if (!force && now - lastReportRef.current < reportInterval) return;

      lastReportRef.current = now;

      // Get and clear the queue
      const metrics = [...queue];
      metricsQueueRef.current = [];

      try {
        // Report to custom endpoint
        await fetch(reportEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            events: metrics.map((metric) => ({
              eventType: `web_vital_${metric.name.toLowerCase()}`,
              sessionId: getSessionId(),
              userId: getUserId(),
              data: {
                name: metric.name,
                value: metric.value,
                rating: metric.rating,
                path: metric.path,
              },
            })),
          }),
          // Use keepalive to ensure data is sent even if page is closing
          keepalive: true,
        });

        if (debug) {
          console.log("[WebVitals] Reported metrics:", metrics);
        }
      } catch (error) {
        console.error("[WebVitals] Failed to report metrics:", error);
        // Re-queue failed metrics for retry
        metricsQueueRef.current.push(...metrics);
      }
    },
    [reportEndpoint, reportInterval, debug]
  );

  /**
   * Handle individual metric
   */
  const handleMetric = useCallback(
    (metric: WebVitalMetric) => {
      const { name, value, id } = metric;

      // Avoid duplicate reports
      const reportKey = `${name}-${id}`;
      if (reportedRef.current.has(reportKey)) return;
      reportedRef.current.add(reportKey);

      const rating = getRating(name, value);

      if (debug) {
        console.log(
          `[WebVitals] ${name}:`,
          value.toFixed(name === "CLS" ? 4 : 0),
          `(${rating})`
        );
      }

      // Send to Sentry as a measurement
      Sentry.setMeasurement(
        `web_vitals.${name.toLowerCase()}`,
        value,
        name === "CLS" ? "none" : "millisecond"
      );

      // Add Sentry breadcrumb
      Sentry.addBreadcrumb({
        category: "web_vitals",
        message: `${name}: ${value.toFixed(name === "CLS" ? 4 : 0)}`,
        level: rating === "poor" ? "warning" : "info",
        data: {
          rating,
          path: pathname,
        },
      });

      // Alert Sentry on poor metrics
      if (rating === "poor") {
        Sentry.captureMessage(`Poor Web Vital: ${name}`, {
          level: "warning",
          tags: {
            vital: name,
            rating,
            path: pathname,
          },
          extra: {
            value,
            threshold: WEB_VITAL_THRESHOLDS[name],
          },
        });
      }

      // Queue for batch reporting
      metricsQueueRef.current.push({
        name,
        value,
        rating,
        path: pathname,
        timestamp: Date.now(),
      });
    },
    [pathname, debug]
  );

  // Use Next.js built-in Web Vitals hook
  useReportWebVitals((metric) => {
    handleMetric(metric as WebVitalMetric);
  });

  // Set up periodic reporting
  useEffect(() => {
    const intervalId = setInterval(() => {
      reportMetrics();
    }, reportInterval);

    return () => {
      clearInterval(intervalId);
      // Force report on unmount
      reportMetrics(true);
    };
  }, [reportMetrics, reportInterval]);

  // Report before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      reportMetrics(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        reportMetrics(true);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [reportMetrics]);

  // Clear reported metrics on route change
  useEffect(() => {
    reportedRef.current.clear();
  }, [pathname]);

  return <>{children}</>;
}

// =============================================================================
// STANDALONE WEB VITALS HOOK
// =============================================================================

/**
 * Hook for manually tracking custom performance metrics
 */
export function useWebVitals() {
  const pathname = usePathname();

  const trackCustomMetric = useCallback(
    (
      name: string,
      value: number,
      unit: "millisecond" | "none" = "millisecond"
    ) => {
      // Send to Sentry
      Sentry.setMeasurement(`custom.${name}`, value, unit);

      // Log in development
      if (process.env.NODE_ENV === "development") {
        console.log(`[Custom Metric] ${name}:`, value);
      }

      // Report to analytics
      fetch("/api/analytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          events: [
            {
              eventType: `custom_metric_${name}`,
              sessionId: getSessionId(),
              userId: getUserId(),
              data: {
                name,
                value,
                unit,
                path: pathname,
              },
            },
          ],
        }),
        keepalive: true,
      }).catch(console.error);
    },
    [pathname]
  );

  const startTimer = useCallback(
    (name: string): (() => void) => {
      const startTime = performance.now();

      return () => {
        const duration = performance.now() - startTime;
        trackCustomMetric(name, duration);
      };
    },
    [trackCustomMetric]
  );

  return {
    trackCustomMetric,
    startTimer,
  };
}

// =============================================================================
// WEB VITALS DISPLAY COMPONENT (for debugging)
// =============================================================================

interface WebVitalsDebugProps {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export function WebVitalsDebug({
  position = "bottom-right",
}: WebVitalsDebugProps) {
  const metricsRef = useRef<Map<string, { value: number; rating: string }>>(
    new Map()
  );

  useReportWebVitals((metric) => {
    const rating = getRating(
      metric.name as WebVitalMetric["name"],
      metric.value
    );
    metricsRef.current.set(metric.name, { value: metric.value, rating });
  });

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const positionStyles = {
    "top-left": { top: 8, left: 8 },
    "top-right": { top: 8, right: 8 },
    "bottom-left": { bottom: 8, left: 8 },
    "bottom-right": { bottom: 8, right: 8 },
  };

  const ratingColors = {
    good: "#0cce6b",
    "needs-improvement": "#ffa400",
    poor: "#ff4e42",
  };

  return (
    <div
      style={{
        position: "fixed",
        ...positionStyles[position],
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        color: "white",
        padding: "8px 12px",
        borderRadius: 8,
        fontSize: 11,
        fontFamily: "monospace",
        minWidth: 150,
      }}
    >
      <div
        style={{ fontWeight: "bold", marginBottom: 4, borderBottom: "1px solid #444", paddingBottom: 4 }}
      >
        Web Vitals
      </div>
      {Array.from(metricsRef.current.entries()).map(
        ([name, { value, rating }]) => (
          <div
            key={name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 2,
            }}
          >
            <span>{name}:</span>
            <span style={{ color: ratingColors[rating as keyof typeof ratingColors] }}>
              {name === "CLS" ? value.toFixed(4) : `${value.toFixed(0)}ms`}
            </span>
          </div>
        )
      )}
    </div>
  );
}

export default WebVitalsProvider;
