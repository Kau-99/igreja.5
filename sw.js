// ── OneSignal SDK (descomente após configurar o App ID em components.js) ──
// importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_NAME = "advic-v6";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/sobre.html",
  "/eventos.html",
  "/contato.html",
  "/privacidade.html",
  "/offline.html",
  "/404.html",
  "/style.css",
  "/script.js",
  "/components.js",
  "/site.webmanifest",
  "/inicio.json",
  "/eventos.json",
  "/sermoes.json",
  "/contatos.json",
  "/sobre.json",
  "/imagens/logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
    }),
  );
  self.clients.claim();
});

// ─── WEB PUSH NOTIFICATIONS ───────────────────────────────────────────────
self.addEventListener("push", (event) => {
  const data    = event.data?.json() ?? {};
  const title   = data.title   || "ADVIC";
  const options = {
    body:  data.body  || "Nova notificação da ADVIC.",
    icon:  "/imagens/logo.png",
    badge: "/imagens/logo.png",
    data:  { url: data.url || "/" },
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url === url && "focus" in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  if ((request.headers.get("Accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request) || caches.match("/offline.html")),
    );
    return;
  }

  if (request.url.includes(".json")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
      );
    }),
  );
});
