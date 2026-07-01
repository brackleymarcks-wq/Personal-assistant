const CACHE_NAME = 'antigravity-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles/main.css',
  './styles/bento.css',
  './styles/modals.css',
  './js/app.js',
  './js/config.js',
  './js/db.js',
  './js/gemini.js',
  './js/quickActions.js',
  './js/chatWidget.js',
  './js/commandPalette.js',
  './js/peekView.js',
  './js/pages/analytics.js',
  './js/pages/archive.js',
  './js/pages/finances.js',
  './js/pages/health.js',
  './js/pages/knowledge.js',
  './js/pages/notes.js',
  './js/pages/projects.js',
  './js/pages/tasks.js',
  './js/pages/tutoring.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and ignore Supabase API requests
  if (event.request.method !== 'GET' || event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Otherwise, fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Cache the dynamically fetched assets (optional)
        // return caches.open(CACHE_NAME).then((cache) => {
        //   cache.put(event.request, networkResponse.clone());
        //   return networkResponse;
        // });
        return networkResponse;
      }).catch(() => {
        // Fallback for offline (optional)
      });
    })
  );
});
