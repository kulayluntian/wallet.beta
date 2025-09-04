// sw.js - Service Worker (Definitive Version)

const CACHE_NAME = 'zoeywallet-cache-v3'; // Increment the version

// All files needed for the app to run offline
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

// On install, cache the app shell
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching app shell');
            return cache.addAll(CACHE_FILES);
        })
    );
    self.skipWaiting(); // Force activation of new worker
});

// On activate, clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activate');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim(); // Take control of open pages
});

// On fetch, use a cache-first strategy
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((response) => {
            // Return from cache, or fetch from network if not in cache
            return response || fetch(event.request);
        })
    );
});