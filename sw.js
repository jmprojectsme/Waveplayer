// WavePlayer sw.js — v6
// Fixed: removed icon.png from assets (was breaking cache install)
// Fixed: added clients.claim() for immediate activation  
// Fixed: offline fallback so app loads without internet

const cacheName = 'wave-v6';
const assets = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll(assets))
      .catch(err => console.warn('Cache install failed:', err))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== cacheName) return caches.delete(key);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Skip non-GET and chrome-extension requests
  if (e.request.method !== 'GET') return;
  if (e.request.url.startsWith('chrome-extension://')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request)
        .then(response => {
          // Cache new valid responses
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(cacheName).then(cache => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback — serve index.html
          return caches.match('./index.html');
        });
    })
  );
});
