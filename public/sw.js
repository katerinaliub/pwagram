importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

var CACHE_STATIC_NAME = 'static-v33';
var CACHE_DYNAMIC_NAME = 'dynamic-v5';
var STATIC_FILES = [
    '/',
    '/index.html',
    '/offline.html',
    '/src/js/app.js',
    '/src/js/feed.js',
    '/src/js/idb.js',
    '/src/js/material.min.js',
    '/src/css/app.css',
    '/src/css/feed.css',
    '/src/images/main-image.jpg',
    'https://fonts.googleapis.com/css?family=Roboto:400,700',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
];

// function trimCache(cacheName, maxItems) {
//     caches.open(cacheName)
//         .then(function (cache) {
//            return cache.keys()
//                .then(function (keys) {
//                    if (keys.length > maxItems) {
//                        cache.delete(keys[0])
//                            .then(trimCache(cacheName, maxItems));
//                    }
//                });
//         });
// }

self.addEventListener('install', function (event) {
    console.log('[SW] Installing SW ...', event);
    event.waitUntil(
        caches.open(CACHE_STATIC_NAME)
            .then(function (cache) {
                console.log('[SW] Precaching App Shell');
                cache.addAll(STATIC_FILES);
            })
    );
});


self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys()
            .then(function (keyList) {
                return Promise.all(keyList.map(function (key) {
                    if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
                        console.log('[SW] removing old cache', key);
                        return caches.delete(key);
                    }
                }))
            })
    );
    return self.clients.claim();
});

function isInArray(string, array) {
    var cachePath;
    if (string.indexOf(self.origin) === 0) { // request targets domain where we serve the page from (i.e. NOT a CDN)
        console.log('matched ', string);
        cachePath = string.substring(self.origin.length); // take the part of the URL AFTER the domain (e.g. after localhost:8080)
    } else {
        cachePath = string; // store the full request (for CDNs)
    }
    return array.indexOf(cachePath) > -1;
}

self.addEventListener('fetch', function (event) {
    var url = 'https://pwagram-64b75.firebaseio.com/posts';

    if (event.request.url.indexOf(url) > -1) {
        event.respondWith(fetch(event.request)
            .then(function (res) {
                var clonedRes = res.clone();
                clearAllData('posts')
                    .then(function () {
                        return clonedRes.json();
                    })
                    .then(function (data) {
                        for (var key in data) {
                            writeData('posts', data[key]);
                        }
                    });
                return res;
            })
        );
    } else if (isInArray(event.request.url, STATIC_FILES)) {
        event.respondWith(
            caches.match(event.request)
        );
    } else {
        event.respondWith(
            caches.match(event.request)
                .then(function (response) {
                    if (response) {
                        return response;
                    } else {
                        return fetch(event.request)
                            .then(function (res) {
                                return caches.open(CACHE_DYNAMIC_NAME)
                                    .then(function (cache) {
                                        // trimCache(CACHE_DYNAMIC_NAME, 3); // 10 - 20 ...
                                        cache.put(event.request.url, res.clone());
                                        return res;
                                    })
                            })
                            .catch(function (err) {
                                return caches.open(CACHE_STATIC_NAME)
                                    .then(function (cache) {
                                        if (event.request.headers.get('accept').includes('text/html')) {
                                            return cache.match('/offline.html')
                                        }
                                    });
                            })
                    }
                })
        );
    }
});

// self.addEventListener('fetch', function (event) {
//     event.respondWith(
//         caches.match(event.request)
//             .then(function (response) {
//                 if (response) {
//                     return response;
//                 } else {
//                     return fetch(event.request)
//                         .then(function (res) {
//                             return caches.open(CACHE_DYNAMIC_NAME)
//                                 .then(function (cache) {
//                                     cache.put(event.request.url, res.clone());
//                                     return res;
//                                 })
//                         })
//                         .catch(function (err) {
//                             return caches.open(CACHE_STATIC_NAME)
//                                 .then(function (cache) {
//                                     return cache.match('/offline.html')
//                                 });
//                         })
//                 }
//             })
//     );
// });


//Network with Cache Fallback strategy
// self.addEventListener('fetch', function (event) {
//     event.respondWith(
//         fetch(event.request)
//             .then(function (res) {
//                 return caches.open(CACHE_DYNAMIC_NAME)
//                     .then(function (cache) {
//                         cache.put(event.request.url, res.clone());
//                         return res;
//                     })
//             })
//             .catch(function (err) {
//                 return caches.match(event.request);
//             })
//     );
// });


//Cache only strategy
// self.addEventListener('fetch', function (event) {
//     event.respondWith(
//         caches.match(event.request)
//     );
// });

//Network only strategy
// self.addEventListener('fetch', function (event) {
//     event.respondWith(
//         fetch(event.request)
//     );
// });

self.addEventListener('sync', function (event) {
    console.log('[SW] background syncing', event);
    if (event.tag === 'sync-new-post') {
        console.log('[SW] Syncing new post');
        event.waitUntil(
            readAllData('sync-posts')
                .then(function (data) {
                    for (var dt of data) {
                        fetch('https://us-central1-pwagram-64b75.cloudfunctions.net/storePostData', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({
                                id: dt.id,
                                title: dt.title,
                                location: dt.location,
                                image: "https://firebasestorage.googleapis.com/v0/b/pwagram-64b75.appspot.com/o/sf-boat.jpg?alt=media&token=2caa6d2a-1788-4f2a-a978-4962ea20712b"
                            })
                        })
                        .then(function (res) {
                            console.log('Sent Data: ', res);
                            if (res.ok) {
                                res.json()
                                    .then(function (resData) {
                                        deleteItemFromData('sync-posts', resData.id);
                                    })
                            }
                        })
                        .catch(function (err) {
                            console.log('Error while sending data', err);
                        })
                    }

                })
        );
    }
});