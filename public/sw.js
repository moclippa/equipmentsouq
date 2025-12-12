/**
 * EquipmentSouq Service Worker
 * Provides offline caching for static assets and API responses
 *
 * Cache Strategies:
 * - Static assets (JS, CSS, fonts): Cache-first with network fallback
 * - Images: Cache-first with network fallback, longer TTL
 * - API responses: Network-first with cache fallback (stale-while-revalidate)
 * - Pages: Network-first with cache fallback
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE_NAME = `equipmentsouq-static-${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `equipmentsouq-images-${CACHE_VERSION}`;
const API_CACHE_NAME = `equipmentsouq-api-${CACHE_VERSION}`;

// Static assets to precache on install
const PRECACHE_ASSETS = [
  "/",
  "/search",
  "/login",
  "/register",
];

// Cache limits
const IMAGE_CACHE_LIMIT = 100;
const API_CACHE_LIMIT = 50;

// API routes that should be cached (GET only)
const CACHEABLE_API_ROUTES = [
  "/api/categories",
  "/api/equipment",
  "/api/equipment/recent-transactions",
];

/**
 * Install event - precache critical assets
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      // Precache critical routes, but don't fail if some are unavailable
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Failed to precache ${url}:`, err);
          })
        )
      );
    })
  );
  // Take control immediately
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete old version caches
            return (
              name.startsWith("equipmentsouq-") &&
              !name.endsWith(CACHE_VERSION)
            );
          })
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all clients
  self.clients.claim();
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip auth and mutation endpoints
  if (
    url.pathname.startsWith("/api/auth") ||
    url.pathname.startsWith("/api/leads") ||
    url.pathname.startsWith("/api/booking-requests") ||
    url.pathname.startsWith("/api/admin") ||
    url.pathname.startsWith("/api/business-profile")
  ) {
    return;
  }

  // Route to appropriate cache strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
  } else if (isImage(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE_NAME, IMAGE_CACHE_LIMIT));
  } else if (isCacheableAPI(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE_NAME, API_CACHE_LIMIT));
  } else if (isPage(url.pathname)) {
    event.respondWith(networkFirst(request, STATIC_CACHE_NAME));
  }
});

/**
 * Check if URL is a static asset
 */
function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".woff") ||
    pathname.endsWith(".woff2")
  );
}

/**
 * Check if URL is an image
 */
function isImage(pathname) {
  return (
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".gif") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".avif") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico") ||
    pathname.startsWith("/_next/image")
  );
}

/**
 * Check if URL is a cacheable API route
 */
function isCacheableAPI(pathname) {
  return CACHEABLE_API_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if URL is a page (HTML)
 */
function isPage(pathname) {
  return (
    pathname === "/" ||
    pathname === "/search" ||
    pathname.startsWith("/equipment/") ||
    pathname === "/login" ||
    pathname === "/register"
  );
}

/**
 * Check if a response is safe to cache
 * Respects Cache-Control headers and avoids caching sensitive responses
 */
function isCacheable(response) {
  // Don't cache if server explicitly forbids it
  const cacheControl = response.headers.get("Cache-Control");
  if (cacheControl) {
    if (cacheControl.includes("no-store") || cacheControl.includes("private")) {
      return false;
    }
  }

  // Don't cache responses with Set-Cookie (potential session data)
  if (response.headers.has("Set-Cookie")) {
    return false;
  }

  // Only cache successful responses
  return response.ok;
}

/**
 * Cache-first strategy
 * Try cache first, fall back to network
 * Respects Cache-Control headers to prevent cache poisoning
 */
async function cacheFirst(request, cacheName, limit = null) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    // Only cache if response is safe to cache
    if (isCacheable(networkResponse)) {
      // Clone response before caching
      const responseToCache = networkResponse.clone();

      // Cache in background
      cache.put(request, responseToCache).then(() => {
        if (limit) trimCache(cacheName, limit);
      });
    }

    return networkResponse;
  } catch (error) {
    console.error(`[SW] Fetch failed for ${request.url}:`, error);
    // Return offline fallback if available
    return new Response("Offline", { status: 503 });
  }
}

/**
 * Network-first strategy
 * Try network first, fall back to cache
 * Respects Cache-Control headers to prevent cache poisoning
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);

    // Only cache if response is safe to cache
    if (isCacheable(networkResponse)) {
      // Cache successful responses
      const responseToCache = networkResponse.clone();
      cache.put(request, responseToCache);
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    console.error(`[SW] Network failed and no cache for ${request.url}:`, error);
    return new Response("Offline", { status: 503 });
  }
}

/**
 * Stale-while-revalidate strategy
 * Return cache immediately, update in background
 * Respects Cache-Control headers to prevent cache poisoning
 */
async function staleWhileRevalidate(request, cacheName, limit = null) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Fetch from network in background
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      // Only cache if response is safe to cache
      if (isCacheable(networkResponse)) {
        const responseToCache = networkResponse.clone();
        cache.put(request, responseToCache).then(() => {
          if (limit) trimCache(cacheName, limit);
        });
      }
      return networkResponse;
    })
    .catch((error) => {
      console.warn(`[SW] Background fetch failed for ${request.url}:`, error);
      return null;
    });

  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // Wait for network response if no cache
  const networkResponse = await fetchPromise;
  return networkResponse || new Response("Offline", { status: 503 });
}

/**
 * Trim cache to specified limit (FIFO)
 */
async function trimCache(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > limit) {
    const keysToDelete = keys.slice(0, keys.length - limit);
    await Promise.all(keysToDelete.map((key) => cache.delete(key)));
  }
}
