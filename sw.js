// ── OneSignal SDK (descomente após configurar o App ID em components.js) ──
// importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_NAME = "advic-v7";

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

// Só armazena em cache respostas válidas e não opacas
const safePut = (cache, request, response) => {
  if (response.ok && response.type !== "opaque") {
    cache.put(request, response.clone()).catch(() => { /* quota */ });
  }
};

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url     = new URL(request.url);

  if (request.method !== "GET") return;

  // Ignora requisições externas ao domínio (CDNs, YouTube, etc.) — sem caching
  if (url.origin !== self.location.origin) return;

  // HTML → Network-First com fallback offline
  if ((request.headers.get("Accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          caches.open(CACHE_NAME).then((cache) => safePut(cache, request, response));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/offline.html"))
        ),
    );
    return;
  }

  // JSON → Network-First (conteúdo dinâmico via CMS)
  if (url.pathname.endsWith(".json")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          caches.open(CACHE_NAME).then((cache) => safePut(cache, request, response));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Assets estáticos → Cache-First
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then((response) => {
        caches.open(CACHE_NAME).then((cache) => safePut(cache, request, response));
        return response;
      });
    }),
  );
});
