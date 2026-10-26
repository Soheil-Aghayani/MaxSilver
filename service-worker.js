'use strict';

// Every release changes VERSION and the ?v= stamp on the pages. Assets that carry ?v= are matched exactly,
// so a page can never be combined with CSS/JS from another release.
const VERSION = 'v3-20261493';
const CACHE_NAME = 'maxsilver-portal-' + VERSION;
const SCOPE = self.registration.scope;
const PAGES = ['', 'index.html', 'ceo-dashboard.html', 'sales-analysis.html', 'customers.html', 'planner.html', 'events.html', 'fairs.html', 'competitors.html', 'backup.html', 'features.html', 'roadmap.html', 'assistant.html', 'permissions.html', 'warehouse.html', 'banks.html', 'track.html', 'prices.html', 'crm.html', 'legal.html', 'product-catalog.html', 'sales-process.html', 'brand-books.html', 'panel.html', 'contact.html', 'advertising.html', 'blog-halloween.html', 'backend.html', 'academy.html', 'install.html'];
const STATIC_ASSETS = [
  'manifest.webmanifest',
  'assets/vendor/qrcode-generator-1.4.4.js',
  'assets/fonts/Estedad-VF.woff2',
  'assets/maxsilver-dashboard-icon.svg',
  'assets/branding/maxsilver-logo.svg',
  'assets/branding/wintora-logo.png',
  'assets/branding/wintora-logo-white.png',
  'assets/branding/chefmarket-logo.png',
  'assets/branding/turbomax-logo.png',
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
        // files people download on purpose (PDF, Excel, CSV...) are not part of the app shell; fetching them at install made download managers (IDM) pop up
        for (const match of html.matchAll(/(?:href|src)="(\.\/[^"#]+)"/g)) if (!/\.(pdf|csv|xlsx?|docx?|pptx?|zip|rar)(\?|$)/i.test(match[1])) wanted.add(new URL(match[1], abs(page)).href);
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
    // Pages: the saved copy opens at once and a fresh one is fetched behind it for the next visit (stale-while-revalidate).
    // Safe because a saved page and the versioned files it uses (?v=) were saved together; a new release arrives through
    // the service worker update, which shows the «new version» bar. Nothing saved yet: ask the server, as before.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, { ignoreSearch: true });
      const refresh = fetch(request, { cache: 'no-cache' }).then((response) => {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      });
      if (cached) {
        event.waitUntil(refresh.catch(() => null));
        return cached;
      }
      try {
        return await refresh;
      } catch (error) {
        return (await cache.match(abs('index.html'))) ||
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

// a notification shown by notify.js: tapping it brings the app to the front (or opens it) at the right place
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './panel.html', SCOPE).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) { c.navigate(target).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});
