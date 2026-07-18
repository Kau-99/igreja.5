// Descomente após configurar ONESIGNAL_APP_ID em components.js
// importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_NAME = "advic-v15"; // v15: fotos reais na página de missões

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/sobre.html",
  "/missoes.html",
  "/galeria.html",
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
    caches.open(CACHE_NAME).then((cache) =>
      // cache: "reload" ignora o cache HTTP do navegador — garante que cada
      // nova versão do SW pré-carregue os arquivos REALMENTE atuais da rede
      cache.addAll(STATIC_ASSETS.map((url) => new Request(url, { cache: "reload" }))),
    ),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim()),
  );
});

// ─── WEB PUSH NOTIFICATIONS ───────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() ?? {}; } catch { /* payload não é JSON — usa defaults */ }
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

// Respostas opacas (cross-origin sem CORS) não têm status confiável — excluo para não inflar a quota.
// Recebe um clone já feito de forma síncrona: clonar depois que a página começou a
// consumir o corpo dispara "Response body is already used".
const safePut = (cache, request, responseClone) => {
  if (responseClone.ok && responseClone.type !== "opaque") {
    cache.put(request, responseClone).catch(() => { /* quota */ });
  }
};

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url     = new URL(request.url);

  if (request.method !== "GET") return;

  // Deixo CDNs e APIs externas sem cache — o browser e os próprios CDNs já tratam isso
  if (url.origin !== self.location.origin) return;

  // Functions (feed do YouTube, status ao vivo, galeria do Drive) são dados
  // vivos — nunca podem ficar presos no cache-first
  if (url.pathname.startsWith("/.netlify/")) return;

  // HTML sempre vai à rede primeiro — garanto que o usuário não veja conteúdo obsoleto
  if ((request.headers.get("Accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone(); // clone síncrono, antes de entregar à página
          caches.open(CACHE_NAME).then((cache) => safePut(cache, request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/offline.html"))
        ),
    );
    return;
  }

  // JSON via CMS pode mudar a qualquer momento — prefiro a rede mas sirvo o cache em falha
  if (url.pathname.endsWith(".json")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => safePut(cache, request, copy));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // CSS, JS e imagens mudam junto com o deploy — Cache-First melhora o LCP e funciona offline
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => safePut(cache, request, copy));
        return response;
      });
    }),
  );
});
