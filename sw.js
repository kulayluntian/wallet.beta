// sw.js - Service Worker (Robust Version)

// [FIX] Increment the cache name. This is crucial for forcing an update.
const CACHE_NAME = 'zoeywallet-cache-v2';

// List of files to cache for the app shell to work offline.
const CACHE_FILES = [
    '/',
    'index.html',
    'style.css',
    'app.js',
    'transaction.js',
    'settings.js',
    'wallet.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900&display=swap'
];

// The install event: fires when the service worker is first installed.
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching app shell');
            return cache.addAll(CACHE_FILES);
        })
    );
    // [FIX] Force the new service worker to become active immediately.
    // This prevents the "waiting to activate" state that causes update issues.
    self.skipWaiting();
});

// The activate event: fires after installation. Cleans up old caches.
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activate');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                // If the cache key is not our current cache, delete it.
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    // [FIX] Take immediate control of all open clients (tabs).
    return self.clients.claim();
});

// The fetch event: fires for every network request.
// We use a "Cache first, then network fallback" strategy.
self.addEventListener('fetch', (event) => {
    // We only want to handle GET requests.
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            // If the request is in the cache, return the cached version.
            if (response) {
                return response;
            }
            // If it's not in the cache, fetch it from the network.
            return fetch(event.request);
        })
    );
});