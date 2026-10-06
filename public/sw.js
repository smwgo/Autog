const CACHE_NAME = 'autopro-cache-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        // Add more static assets here
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for cache
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Return offline page if offline
        return caches.match(OFFLINE_URL);
      });
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-operations') {
    // Need to trigger the IndexedDB sync processing
    // In a real SW, we could use IndexedDB directly here to sync data
    // Or postMessage to client to process it.
    console.log('Background sync triggered');
  }
});
