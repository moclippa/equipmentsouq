"use client";

import { useEffect } from "react";

/**
 * Service Worker Provider
 *
 * Registers the service worker on mount for production environments.
 * The service worker provides:
 * - Static asset caching (JS, CSS, fonts)
 * - Image caching with size limits
 * - API response caching with stale-while-revalidate
 * - Offline page fallbacks
 */
export function ServiceWorkerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Only register in production or when explicitly enabled
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none", // Always fetch fresh SW from network
        });

        // Check for updates periodically (every hour)
        setInterval(() => {
          registration.update().catch((err) => {
            console.warn("[SW] Update check failed:", err);
          });
        }, 60 * 60 * 1000);

        // Handle updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;

          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New version available - could show update prompt here
                console.log("[SW] New version available");
              }
            });
          }
        });

        console.log("[SW] Registered successfully");
      } catch (error) {
        console.error("[SW] Registration failed:", error);
      }
    };

    // Delay registration to not block initial page load
    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
      return () => window.removeEventListener("load", registerSW);
    }
  }, []);

  return <>{children}</>;
}
