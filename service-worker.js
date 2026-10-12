'use strict';

// Bump VERSION whenever a page or asset changes; old caches are removed on activate.
const VERSION = 'v2-20261012';
const CACHE_NAME = 'maxsilver-portal-' + VERSION;
const SCOPE = self.registration.scope;
const PAGES = ['', 'index.html', 'ceo-dashboard.html', 'sales-analysis.html', 'sales-process.html'];
const ASSETS = [
  'manifest.webmanifest',
  'assets/site-shell.css', 'assets/home.css', 'assets/ceo-dashboard.css', 'assets/sales-analysis.css', 'assets/sales-process.css',
  'assets/ceo-dashboard.js', 'assets/map-gestures.js', 'assets/pwa.js', 'assets/sw-register.js',
  'assets/sales-analysis.js', 'assets/sales-data.js', 'assets/workbook-import.js',
  'assets/vendor/qrcode-generator-1.4.4.js',
  'assets/fonts/Estedad-VF.ttf',
  'assets/maxsilver-dashboard-icon.svg',
  'assets/branding/maxsilver-logo-source.png', 'assets/branding/maxsilver-pwa-192.png', 'assets/branding/maxsilver-pwa-512.png'
];
const PRECACHE = PAGES.concat(ASSETS).map((p) => new URL(p, SCOPE).href);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n.startsWith('maxsilver-') && n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return;
  if (url.pathname.includes('/data/')) return; // user data never goes through the cache

  if (request.mode === 'navigate') {
    // Pages: network first so a new release shows immediately, cache when offline.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch (error) {
        return (await cache.match(request, { ignoreSearch: true })) ||
               (await cache.match(new URL('index.html', SCOPE).href)) ||
               new Response('برای استفادهٔ آفلاین، یک‌بار صفحه را آنلاین باز کنید.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  // Static assets: stale-while-revalidate, ignoring the ?v= cache-buster.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });
    const refresh = fetch(request).then((response) => { if (response && response.ok) cache.put(request, response.clone()); return response; }).catch(() => cached);
    return cached || refresh;
  })());
});