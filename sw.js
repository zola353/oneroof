// ዋን ሩፍ ንግድ፡ ሪልስቴት እና አፓርትመንት - Service Worker
// Caches the app shell so the icon/site can be added to the home screen and
// still open (with a cached fallback) even with a weak connection. Firebase,
// fonts, and CDN scripts are left to the network as usual — this only
// shields the local app shell.

const CACHE_NAME = 'oneroof-shell-v2';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                // Cache each file independently instead of caches.addAll(),
                // which fails (and aborts the WHOLE install) if even one
                // file 404s. This way, one missing/renamed file can never
                // again break the entire service worker like it did before.
                return Promise.all(
                    APP_SHELL.map((url) =>
                        cache.add(url).catch((err) => console.log('SW: skipping', url, err))
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Only manage same-origin GET requests for the app shell itself.
    // Everything else (Firebase reads/writes, Google Fonts, CDN libraries)
    // is left completely alone and goes straight to the network.
    if (event.request.method !== 'GET') return;

    let url;
    try { url = new URL(event.request.url); } catch (e) { return; }
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                return response;
            })
            .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
});
