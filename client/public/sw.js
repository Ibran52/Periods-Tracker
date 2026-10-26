const CACHE_NAME = "veyora-static-v1";
const STATIC_ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.png",
  "/veyora-icon.png"
];

// Install: Cache only safe static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
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

// Fetch: NEVER cache private authenticated health API responses (/api/...)
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Health and data APIs must always bypass browser service worker cache
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        })
      );
    })
  );
});

// Web Push event listener
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.body || "New cycle update available",
      icon: "/veyora-icon.png",
      badge: "/favicon.png",
      tag: data.tag || "veyora-reminder",
      data: { url: data.url || "/" }
    };
    event.waitUntil(
      self.registration.showNotification(data.title || "Veyora", options)
    );
  } catch (err) {
    console.error("Failed to parse push event payload:", err);
  }
});

// Notification click listener
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
