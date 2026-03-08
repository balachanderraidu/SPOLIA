// ──────────────────────────────────────────────────────────────────
// service-worker.js  —  Spolia PWA Service Worker
// Strategy: Network-first for JS/HTML (code updates always fresh)
//           Cache-first only for images/fonts (truly static)
// ──────────────────────────────────────────────────────────────────

const CACHE_NAME = "spolia-v7";

// Only cache truly static binary assets — NOT JS or HTML
const STATIC_ASSETS = [
    "/assets/icons/icon-192.png",
    "/assets/icons/icon-512.png",
    "/manifest.json"
];

// Install: Pre-cache only icons/manifest
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[SW] Pre-caching static assets (icons only)");
            return cache.addAll(STATIC_ASSETS).catch(() => {});
        })
    );
    self.skipWaiting();
});

// Activate: Clean ALL old caches immediately
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.map((key) => caches.delete(key)))
        ).then(() => {
            console.log("[SW] All old caches cleared");
        })
    );
    self.clients.claim();
});

// Fetch strategy:
//   JS, HTML, CSS → NETWORK ONLY (always fresh, never from cache)
//   Firebase/APIs  → NETWORK ONLY (never cache)
//   Images/icons   → Cache-first (unchanged binary assets)
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Never intercept external APIs
    if (
        url.hostname.includes("firebaseapp.com") ||
        url.hostname.includes("googleapis.com") ||
        url.hostname.includes("firebase.google.com") ||
        url.hostname.includes("gstatic.com") ||
        url.hostname.includes("google.com")
    ) {
        event.respondWith(fetch(request));
        return;
    }

    // JS and HTML files: ALWAYS fetch from network (code must be fresh)
    if (
        url.pathname.endsWith(".js") ||
        url.pathname.endsWith(".html") ||
        url.pathname === "/" ||
        url.pathname.endsWith(".css")
    ) {
        event.respondWith(
            fetch(request).catch(() => {
                // Offline fallback: try cache if network is unavailable
                return caches.match(request);
            })
        );
        return;
    }

    // Images and icons: Cache-first (truly static)
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                }
                return response;
            });
        })
    );
});

// Push notifications for bond status updates
self.addEventListener("push", (event) => {
    const data = event.data?.json() || {};
    event.waitUntil(
        self.registration.showNotification(data.title || "Spolia", {
            body: data.body || "You have a new update.",
            icon: "/assets/icons/icon-192.png",
            badge: "/assets/icons/badge-72.png",
            data: { url: data.url || "/" },
            actions: [{ action: "view", title: "View" }]
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});
