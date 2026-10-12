'use strict';

// Every release changes VERSION and the ?v= stamp on the pages. Assets that carry ?v= are matched exactly,
// so a page can never be combined with CSS/JS from another release.
const VERSION = 'v3-20261024';
const CACHE_NAME = 'maxsilver-portal-' + VERSION;
const SCOPE = self.registration.scope;
const PAGES = ['', 'index.html', 'ceo-dashboard.html', 'sales-analysis.html', 'product-catalog.html', 'sales-process.html'];
const STATIC_ASSETS = [
  'manifest.webmanifest',
  'assets/vendor/qrcode-generator-1.4.4.js',
  'assets/fonts/Estedad-VF.ttf',
  'assets/maxsilver-dashboard-icon.svg',
  'assets/branding/maxsilver-logo.svg',
  'assets/branding/maxsilver-pwa-192.png',
  'assets/branding/maxsilver-pwa-512.png'
];
const abs = (p) => new URL(p, SCOPE).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const wanted = new Set(STATIC_ASSETS.map(abs));
    // pages first, then exactly the asset URLs those pages reference (with their ?v=)
    for (const page of PAGES) {
      try {
        const response = await fetch(new Request(abs(page), { cache: 'reload' }));
        if (!response.ok) continue;
        await cache.put(abs(page), response.clone());
        const html = await response.text();
        for (const match of html.matchAll(/(?:href|src)="(\.\/[^"#]+)"/g)) wanted.add(new URL(match[1], abs(page)).href);
      } catch (error) { /* offline install: pages are cached on first visit instead */ }
    }
    await Promise.all([...wanted].map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => null)));
    await self.skipWaiting();
  })());
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
    // Pages: always ask the server (GitHub Pages sends max-age=600); the cache is only for offline.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch (error) {
        return (await cache.match(request, { ignoreSearch: true })) ||
               (await cache.match(abs('index.html'))) ||
               new Response('برای استفادهٔ آفلاین، یک‌بار صفحه را آنلاین باز کنید.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request); // exact URL, query included
    if (url.searchParams.has('v')) {
      // versioned asset: immutable for this release
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    }
    // unversioned (fonts, images, libraries): serve fast, refresh in the background
    const refresh = fetch(request).then((response) => { if (response && response.ok) cache.put(request, response.clone()); return response; }).catch(() => cached);
    return cached || refresh;
  })());
});