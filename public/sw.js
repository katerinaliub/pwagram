self.addEventListener('install', function (event) {
    console.log('[SW] Installing SW ...', event);
});

self.addEventListener('activate', function (event) {
    console.log('[SW] Activating SW ...', event);
    return self.clients.claim();
});

self.addEventListener('fetch', function (event) {
    console.log('[SW] Fetching something ...', event);
    event.respondWith(fetch(event.request));
});