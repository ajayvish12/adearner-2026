const CACHE_NAME = 'adearner-2026-v11';
const RUNTIME_CACHE = 'adearner-2026-runtime-v11';

// Assets to cache on install - using the new verified favicon as primary icon
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/favicon-verified.dim_32x32.png',
  '/assets/generated/ad-earnings-coins-transparent.dim_128x128.png',
  '/assets/generated/wallet-icon-transparent.dim_64x64.png',
  '/assets/generated/youtube-logo-transparent.dim_64x64.png',
  '/assets/generated/youtube-play-icon-transparent.dim_64x64.png',
  '/assets/generated/ad-icon-transparent.dim_64x64.png',
  '/assets/generated/admin-icon-transparent.dim_64x64.png',
  '/assets/generated/advertiser-icon-transparent.dim_64x64.png',
  '/assets/generated/approval-icon-transparent.dim_64x64.png',
  '/assets/generated/budget-icon-transparent.dim_64x64.png',
  '/assets/generated/campaign-icon-transparent.dim_64x64.png',
  '/assets/generated/creator-icon-transparent.dim_64x64.png',
  '/assets/generated/upload-icon-transparent.dim_64x64.png',
  '/assets/generated/play-button-icon-transparent.dim_64x64.png',
  '/assets/generated/reward-coins-transparent.dim_128x128.png',
  '/assets/generated/paypal-icon-transparent.dim_64x64.png',
  '/assets/Screenshot_20260130_012859_Chrome.jpg',
  '/assets/Screenshot_20260130_014218_Chrome.jpg',
  '/assets/Screenshot_20260130_020057_Chrome.jpg',
  '/assets/Screenshot_20260130_024648_Chrome.jpg',
  '/assets/Screenshot_20260130_113131_Chrome.jpg',
  '/assets/Screenshot_20260130_114401_Chrome.jpg'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((error) => {
        console.error('Failed to cache assets during install:', error);
        // Continue installation even if some assets fail to cache
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first for API, cache first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API calls - network first with cache fallback
  if (url.pathname.includes('/api/') || url.pathname.includes('?canisterId=')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response before caching
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Static assets - cache first with network fallback
  if (
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/assets/generated/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/Screenshot_')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          // Cache the fetched resource
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML pages - network first with cache fallback
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Default - try network first, then cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
