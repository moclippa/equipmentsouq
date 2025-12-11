import { useCallback } from "react";

type EventType =
  | "WHATSAPP_CLICK"
  | "CALL_CLICK"
  | "EQUIPMENT_VIEW"
  | "LEAD_SUBMIT"
  | "SHARE_CLICK"
  | "FAVORITE_CLICK"
  | "SEARCH"
  | string;

interface TrackEventData {
  equipmentId?: string;
  categoryId?: string;
  searchQuery?: string;
  [key: string]: unknown;
}

/**
 * Hook for tracking analytics events
 * Uses fire-and-forget pattern for non-blocking tracking
 */
export function useAnalytics() {
  const trackEvent = useCallback(
    (eventType: EventType, data: TrackEventData = {}) => {
      // Use sendBeacon for fire-and-forget (works even on page navigation)
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/analytics",
          JSON.stringify({ eventType, data })
        );
      } else {
        // Fallback to fetch for older browsers
        fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType, data }),
          keepalive: true,
        }).catch(() => {
          // Silently fail - analytics should never block UX
        });
      }
    },
    []
  );

  return { trackEvent };
}

/**
 * Standalone function for tracking events outside of React components
 */
export function trackEvent(eventType: EventType, data: TrackEventData = {}) {
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/analytics",
      JSON.stringify({ eventType, data })
    );
  } else if (typeof fetch !== "undefined") {
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, data }),
      keepalive: true,
    }).catch(() => {});
  }
}
