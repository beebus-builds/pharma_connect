/* PharmaConnect service worker — SPECS 3A (offline catalog).
 *
 * Strategy
 *  - App shell + static build output: cache-first (immutable, hashed assets).
 *  - Medicine catalog / storefront GETs: stale-while-revalidate so a flaky
 *    connection still shows the last known stock.
 *  - Navigations: network-first, fall back to the cached shell, then /offline.
 *  - Auth, admin, payments and any non-GET request: never cached.
 */

const VERSION = "v3";
const SHELL_CACHE = `pc-shell-${VERSION}`;
const DATA_CACHE = `pc-data-${VERSION}`;
const IMAGE_CACHE = `pc-img-${VERSION}`;
const CATALOG_CACHE = `pc-catalog-${VERSION}`;

const SHELL_ASSETS = [
  "/offline",
  "/medicines",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.webmanifest",
];

const NEVER_CACHE = ["/api/auth", "/api/admin", "/api/payments", "/api/user", "/api/reports", "/api/requests"];

/**
 * Prune cached catalog payloads. A stale in-stock answer is worse than no
 * answer when someone is hunting for a medicine, so entries expire quickly and
 * the cap stops an unbounded cache on long-lived installs.
 */
const CATALOG_MAX_ENTRIES = 60;

/** Catalog answers go stale fast — a shelf that sold out an hour ago is a wasted trip. */
const CATALOG_MAX_AGE_MS = 6 * 60 * 60 * 1000;

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  for (const key of keys.slice(0, keys.length - maxEntries)) {
    await cache.delete(key);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS.map((url) => new Request(url, { cache: "reload" }))))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const keep = [SHELL_CACHE, DATA_CACHE, IMAGE_CACHE, CATALOG_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isImage(url) {
  return url.pathname.startsWith("/icons/") || /\.(png|jpe?g|webp|avif|svg)$/i.test(url.pathname);
}

/**
 * Medicine catalog and public storefronts: safe to replay offline because the
 * answer does not depend on the reader's position.
 *
 * `/api/pharmacies/nearby` is deliberately excluded — it is location-scoped, so
 * a cached copy would report the wrong distance and wrong shops for a reader who
 * has since moved. Live location results stay network-only.
 */
function isCatalog(url) {
  if (url.pathname === "/api/pharmacies/nearby") return false;
  if (url.pathname.startsWith("/api/pharmacies/stock")) return false;
  return (
    url.pathname === "/api/medicines" ||
    url.pathname === "/api/medicines/search" ||
    /^\/api\/pharmacies\/[^/]+$/.test(url.pathname) ||
    url.pathname.startsWith("/medicines")
  );
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
        if (maxEntries) await trimCache(cacheName, maxEntries);
      }
      return response;
    })
    .catch(() => null);
  return cached || network || Response.error();
}

/**
 * Same as above, but a fresh copy is preferred over a stale one. An expired copy
 * is still used as the last-resort offline answer, since a stale stock listing
 * with a visible "updated" timestamp beats a dead page.
 */
async function staleWhileRevalidateWithAge(request, cacheName, maxEntries, maxAgeMs) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const storedAt = cached ? Date.parse(cached.headers.get("date") || "") : NaN;
  const age = Number.isFinite(storedAt) ? Date.now() - storedAt : NaN;
  const fresh = cached && Number.isFinite(age) && age < maxAgeMs ? cached : null;
  const network = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
        if (maxEntries) await trimCache(cacheName, maxEntries);
      }
      return response;
    })
    .catch(() => null);
  return fresh || network || cached || Response.error();
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const shell = (await cache.match(request)) || (await cache.match("/"));
    if (shell) return shell;
    const offline = await cache.match("/offline");
    if (offline) return offline;
    return new Response(
      "<!doctype html><meta charset=\"utf-8\"><title>Offline</title><p style=\"font:16px system-ui;padding:2rem\">You are offline. Reconnect to load this page.</p>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.some((prefix) => url.pathname.startsWith(prefix))) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE).catch(() => fetch(request)));
    return;
  }

  if (isImage(url)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, 40));
    return;
  }

  if (isCatalog(url)) {
    event.respondWith(
      staleWhileRevalidateWithAge(request, CATALOG_CACHE, CATALOG_MAX_ENTRIES, CATALOG_MAX_AGE_MS)
    );
  }
});

// Allow the page to trigger an immediate update after a deploy.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
