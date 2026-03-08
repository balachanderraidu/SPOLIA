// ──────────────────────────────────────────────────────────────────
// service-worker.js  —  Spolia PWA Service Worker
// Implements: Cache-first strategy for static assets,
//             Network-first for API calls
// ──────────────────────────────────────────────────────────────────

const CACHE_NAME = "spolia-v4";
const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/styles.css",
    "/app.js",
    "/manifest.json",
    "/firebase-config.js",
    "/components/radar.js",
    "/components/scanner.js",
    "/components/impact.js",
    "/components/vendors.js",
    "/components/tools.js",
    "/components/profile.js",
    "/components/material-detail.js",
    "/components/logistics.js",
    "/components/dispute.js"
];


// Install: Pre-cache static assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[SW] Pre-caching static assets");
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch: Cache-first for static, network-first for API
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Network-first for Firebase/API calls
    if (
        url.hostname.includes("firebaseapp.com") ||
        url.hostname.includes("googleapis.com") ||
        url.hostname.includes("firebase.google.com")
    ) {
        event.respondWith(
            fetch(request).catch(() => caches.match(request))
        );
        return;
    }

    // Cache-first for static assets
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

// Background sync for offline actions (bond submissions, dispute reports)
self.addEventListener("sync", (event) => {
    if (event.tag === "sync-bonds") {
        event.waitUntil(syncPendingBonds());
    }
    if (event.tag === "sync-disputes") {
        event.waitUntil(syncPendingDisputes());
    }
});

async function syncPendingBonds() {
    console.log("[SW] Syncing pending bond transactions...");
    // TODO: Read from IndexedDB and push to Firestore
}

async function syncPendingDisputes() {
    console.log("[SW] Syncing pending dispute reports...");
    // TODO: Read from IndexedDB and push to Firestore
}

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
