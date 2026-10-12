'use strict';

const CACHE_NAME = 'maxsilver-ceo-shell-v1';
const APP_SCOPE = self.registration.scope;
const CEO_URL = new URL('ceo-dashboard.html', APP_SCOPE);
const SHELL_PATHS = [
  'ceo-dashboard.html',
  'manifest.webmanifest',
  'assets/map-gestures.js',
  'assets/pwa.js',
  'assets/site-shell.css',
  'assets/site-shell.js',
  'assets/vendor/qrcode-generator-1.4.4.js',
  'assets/fonts/Estedad-VF.ttf',
  'assets/fonts/Estedad-export-font.js',
  'assets/maxsilver-dashboard-icon.svg',
  'assets/branding/maxsilver-mark.png',
  'assets/branding/maxsilver-logo-source.png',
  'assets/branding/maxsilver-pwa-192.png',
  'assets/branding/maxsilver-pwa-512.png'
];
const SHELL_URLS = SHELL_PATHS.map((path) => new URL(path, APP_SCOPE).href);
const SHELL_URL_BY_PATH = new Map(SHELL_URLS.map((url) => [new URL(url).pathname, url]));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith('maxsilver-ceo-shell-') && name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  const isDashboardNavigation = request.mode === 'navigate' && requestUrl.pathname === CEO_URL.pathname;
  const shellAssetUrl = SHELL_URL_BY_PATH.get(requestUrl.pathname);
  if (!isDashboardNavigation && !shellAssetUrl) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response.ok) {
        try { await cache.put(shellAssetUrl || CEO_URL.href, response.clone()); }
        catch (error) { console.warn('The app shell could not update its offline copy.', error); }
      }
      return response;
    } catch {
      const cached = await cache.match(request, { ignoreSearch: true }) || await cache.match(shellAssetUrl || CEO_URL.href);
      if (cached) return cached;
      return new Response('برای بازکردن داشبورد، یک‌بار در حالت آنلاین آن را بارگذاری کنید.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
