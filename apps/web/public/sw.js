/* Offline shell. Static files are cached as they are used; the game server (another origin) is never touched. */
const CACHE = 'gameroom-shell-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/icon.svg', '/manifest.webmanifest'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Single-page app: network first so updates arrive, cached shell when offline.
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); void caches.open(CACHE).then((c) => c.put('/', copy)); return res; }).catch(() => caches.match('/')));
    return;
  }
  // Hashed build assets and fonts never change under the same name: cache first.
  e.respondWith(
    caches.match(req).then((hit) => hit ?? fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); void caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })),
  );
});
