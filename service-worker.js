const CACHE_NAME = 'field-survey-tool-cache-v1';
const urlsToCache = [
  '/',
  'index.html',
  'style.css',
  'script.js',
  // CDN assets
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf-autotable.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Using { mode: 'no-cors' } for CDN requests to avoid CORB/CORS issues,
        // which would otherwise prevent caching.
        const requests = urlsToCache.map(url => {
          if (url.startsWith('http')) {
            return new Request(url, { mode: 'no-cors' });
          }
          return url;
        });
        return cache.addAll(requests);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Not in cache - fetch from network, and cache it
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response to cache
            if (!networkResponse || networkResponse.status !== 200) {
               // Don't cache error responses or opaque responses from no-cors requests for non-cdn resources
               if (networkResponse.type !== 'opaque') {
                   return networkResponse;
               }
            }
            
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        ).catch(error => {
            console.error('Fetching failed:', error);
            // You could return a custom offline page here if you had one cached
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});