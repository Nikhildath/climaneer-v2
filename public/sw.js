const CACHE = "climaneer-v1";
const PRECACHE_URLS = ["/", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && request.url.startsWith(self.location.origin)) {
        const clone = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, clone));
      }
      return response;
    }).catch(() => {
      if (request.mode === "navigate") return caches.match("/");
      return new Response("Offline", { status: 503 });
    }))
  );
});
