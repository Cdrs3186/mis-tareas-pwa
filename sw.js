// Le cambiamos el nombre a v2 para que el navegador sepa que es nuevo
const CACHE_NAME = 'tareas-offline-v2'; 
const ARCHIVOS_A_GUARDAR = [
    'app.html',
    'index.html',
    'manifest.json'
];

self.addEventListener('install', e => {
    // 1. ¡Toma el control inmediatamente! (Sin esperar)
    self.skipWaiting(); 
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('¡Bóveda v2 cargada y lista!');
                return cache.addAll(ARCHIVOS_A_GUARDAR);
            }).catch(err => console.error('Error en caché:', err))
    );
});

self.addEventListener('activate', e => {
    // 2. ¡Reclama todas las pestañas abiertas a la fuerza!
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
    e.respondWith(
        // 3. ignoreSearch: true hace que ignore si la URL tiene un "?status=success"
        caches.match(e.request, { ignoreSearch: true })
            .then(respuesta => {
                return respuesta || fetch(e.request);
            })
    );
});