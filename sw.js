// Offline support. App code comes from the network when it can (so updates show up right away)
// and from the cache when offline. Big, rarely changing files are served from the cache first.
const CACHE = 'plate-v16';
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
  './js/weight.js',
  './js/charts.js',
  './js/coach.js',
  './js/demo.js',
  './js/supporter.js',
  './js/lib/db.js',
  './js/views/today.js',
  './js/views/add.js',
  './js/views/scan.js',
  './js/views/nutrients.js',
  './js/views/profile.js',
  './js/views/coach.js',
  './js/views/water.js',
  './js/views/supplements.js',
  './js/views/builder.js',
  './js/views/credit.js',
  './js/mascot.js',
  './js/views/mascot.js',
  './js/views/costs.js',
  './js/views/supporter.js',
  './demo/',
  './beta/',
  './js/views/settings.js',
  './js/views/onboarding.js',
  './js/vendor/preact.js',
  './data/foods.json',
  './icons/icon-192.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.svg',
  './icons/supporter/grove.svg',
  './icons/supporter/tide.svg',
  './icons/supporter/harvest.svg',
  './icons/supporter/sunrise.svg',
  './icons/supporter/lavender.svg',
  './icons/supporter/ink.svg',
  './icons/supporter/neon.svg',
  './icons/supporter/confetti.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
    const heavy = /\/(data|icons|js\/vendor)\//.test(url.pathname);
    e.respondWith(heavy ? staleWhileRevalidate(req, false) : networkFirst(req, req.mode === 'navigate'));
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

async function networkFirst(req, isNav) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetchWithin(req, 4000);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    return (await cache.match(req, { ignoreSearch: true })) || (isNav ? await cache.match('./index.html') : Response.error());
  }
}

// A slow connection shouldn't make the app hang: fall back to the cache after a few seconds.
function fetchWithin(req, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    // no-cache: always check with the server, so old and new files never mix after an update.
    // (A page navigation can't be copied with new options, so it's re-requested by URL.)
    fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-cache' }).then((r) => { clearTimeout(timer); resolve(r); }, (e) => { clearTimeout(timer); reject(e); });
  });
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
