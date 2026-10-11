// Thornwild service worker: lets the game load offline and start fast once installed.
// Pages are fetched network-first (so updates arrive), everything else cache-first.
const CACHE = 'thornwild-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './manifest.webmanifest', './icon-192.png']).catch(() => {}))); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (!/^https?:$/.test(url.protocol)) return;
  const fresh = (r) => { if (r && (r.ok || r.type === 'opaque')) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; };
  if (req.mode === 'navigate') { e.respondWith(fetch(req).then(fresh).catch(() => caches.match(req).then((r) => r || caches.match('./')))); return; }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(fresh)));
});
