// Offline support: serve the app from cache, refresh it in the background.
const CACHE = 'plate-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/store.js',
  './js/nutrients.js',
  './js/foods.js',
  './js/off.js',
  './js/ai.js',
  './js/ui.js',
  './js/lib/db.js',
  './js/views/today.js',
  './js/views/add.js',
  './js/views/scan.js',
  './js/views/nutrients.js',
  './js/views/settings.js',
  './js/views/onboarding.js',
  './js/vendor/preact.js',
  './data/foods.json',
  './icons/icon-192.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    e.respondWith(staleWhileRevalidate(req, req.mode === 'navigate'));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(req));
  }
  // Everything else (Open Food Facts, Anthropic API) goes straight to the network.
});

async function staleWhileRevalidate(req, isNav) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req, { ignoreSearch: true }) || (isNav ? await cache.match('./index.html') : null);
  const network = fetch(req)
    .then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
    .catch(() => cached);
  return cached || network;
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
    return res;
  } catch (err) {
    return Response.error();
  }
}
