const CACHE_NAME = 'piu-reservas-v5';
const urlsToCache = [
  './',
  './index.html',
  './cliente.html',
  './style.css',
  './app.js',
  './cliente.js',
  './firebase-config.js',
  './manifest.json',
  './manifest-cliente.json',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Fuerza al Service Worker a activarse inmediatamente
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    Promise.all([
      // Limpia cachés antiguos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Toma el control de los clientes (pestañas) inmediatamente
      self.clients.claim()
    ])
  );
});
