const CACHE = 'art-offline-v3';
const ICONS = ['/icon.svg', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest'];
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('art-offline-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.has('rsc')) return;
  const asset = url.pathname.startsWith('/paintings/') || url.pathname.startsWith('/_next/static/') || ICONS.includes(url.pathname);
  if (!asset && request.mode !== 'navigate') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (asset && cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      if (cached) return cached;
      if (request.mode === 'navigate') { const home = await cache.match('/'); if (home) return home; }
      throw error;
    }
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'SAVE_OFFLINE' || !Array.isArray(event.data.urls) || !event.ports[0]) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const urls = event.data.urls.filter(value => { try { const url = new URL(value, self.location.origin); return url.origin === self.location.origin && (url.pathname === '/' || url.pathname.startsWith('/paintings/') || url.pathname.startsWith('/_next/static/') || ICONS.includes(url.pathname)); } catch { return false; } });
    let done = 0, failed = 0;
    const tasks = [...urls];
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (tasks.length) {
        const url = tasks.shift();
        try { const response = await fetch(url, { cache: 'reload' }); if (!response.ok) throw Error('Unavailable'); await cache.put(url, response); } catch { failed++; }
        event.ports[0].postMessage({ progress: ++done });
      }
    }));
    event.ports[0].postMessage({ done: true, failed });
  })());
});
