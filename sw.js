/* Service worker: network-first + olvida caches viejos al publicar una versión nueva.
 * Subí CACHE_VERSION (o cualquier cambio en este archivo) en cada deploy para forzar update. */
const CACHE_VERSION = 'v6';
const CACHE_NAME = `juegos-didacticos-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './version.json',
  './css/base.css',
  './css/menu.css',
  './css/reading.css',
  './css/math.css',
  './css/celebration.css',
  './fonts/lexend-400.woff2',
  './fonts/lexend-700.woff2',
  './fonts/opendyslexic-400.woff2',
  './fonts/opendyslexic-700.woff2',
  './js/main.js',
  './js/pwa.js',
  './js/whats-new.js',
  './js/app.js',
  './js/config.js',
  './js/speech.js',
  './js/dificultad-mat.js',
  './js/numeros-es.js',
  './js/data/palabras.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('teclado-magico-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request, { cache: 'no-store' });
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    if (request.mode === 'navigate') {
      const fallback = await cache.match('./index.html');
      if (fallback) return fallback;
    }
    throw new Error('Sin red y sin cache para ' + request.url);
  }
}
