const CACHE = "ghadir-v1";

// Pages to pre-cache on install
const SHELL = ["/", "/dashboard", "/redeem", "/leaderboard"];

// ── Install: pre-cache app shell ────────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: remove old caches ─────────────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for navigation, cache-first for assets ─────────────
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Never intercept: non-GET, API routes, external origins
  if (
    e.request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Navigation (HTML pages): network-first, fall back to cached "/"
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/"))
    );
    return;
  }

  // Static assets: cache-first, update cache in background
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res.ok) {
          caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
        }
        return res;
      });
      return cached || network;
    })
  );
});

// ── Push notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {
    title: "Ghadir Waqf",
    body: "Don't forget to log your Salawat today 🌙",
    url: "/",
  };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-96.png",
      tag: "ghadir-push",
      renotify: true,
      data: { url: data.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        const existing = list.find((c) => c.url.includes(self.location.origin));
        if (existing) return existing.focus();
        return clients.openWindow(e.notification.data?.url ?? "/");
      })
  );
});
