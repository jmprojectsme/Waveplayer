// WavePlayer sw.js — v1.0.5
// Updated cache name to trigger update installation
// Added auto-activation for seamless v1.0.5 deployment

const cacheName = 'wave-v2.0.0'; 
const assets = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  // skipWaiting ensures the new Service Worker takes over immediately
  self.skipWaiting();
  e.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll(assets))
      .catch(err => console.warn('Cache install failed:', err))
  );
});

self.addEventListener('activate', e => {
  // Clean up old caches to save space and ensure clean installation
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== cacheName) return caches.delete(key);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.startsWith('chrome-extension://')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(cacheName).then(cache => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('./index.html');
        });
    })
  );
});
