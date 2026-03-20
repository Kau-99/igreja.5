const CACHE_NAME = 'advic-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/sobre.html',
  '/eventos.html',
  '/contato.html',
  '/privacidade.html',
  '/style.css',
  '/script.js',
  '/eventos.json',
  '/imagens/logo.png'
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Intercepta as requisições 
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {

      return fetch(event.request).catch(() => cachedResponse);
    })
  );
});