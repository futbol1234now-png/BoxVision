// BoxVision Service Worker v2.1
// ✓ Cachea archivos para funcionamiento offline
// ✓ Detecta actualizaciones y muestra el banner al usuario
// ✓ NO se activa solo — espera que el usuario toque "Actualizar"
// ✓ Al activarse avisa a la app para mostrar el modal de novedades

const CACHE_NAME = 'boxvision-v1.1.0';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './app.html',
  './manifest.json',
  './config.json',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css'
];

// 1. INSTALACIÓN: Cachear archivos y ESPERAR — no tomar control todavía
self.addEventListener('install', function(event){
  console.log('[SW] Instalando v2.1...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(URLS_TO_CACHE).catch(function(err){
        console.log('[SW] Algunos archivos no se pudieron cachear:', err);
      });
    })
    // ❌ SIN skipWaiting() aquí — así el banner aparece y el usuario decide cuándo actualizar
  );
});

// 2. ACTIVACIÓN: Limpiar caches viejos y avisar a la app
self.addEventListener('activate', function(event){
  console.log('[SW] Activando v2.1...');
  event.waitUntil(
    caches.keys().then(function(cacheNames){
      return Promise.all(
        cacheNames.map(function(cacheName){
          if(cacheName !== CACHE_NAME){
            console.log('[SW] Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function(){
      return self.clients.claim();
    }).then(function(){
      // Avisar a la app que el SW nuevo ya está activo
      // La app usa esto para abrir el modal de novedades
      return self.clients.matchAll({ includeUncontrolled: true });
    }).then(function(clients){
      clients.forEach(function(client){
        client.postMessage({ type: 'SW_ACTIVATED' });
      });
    })
  );
});

// 3. FETCH: Estrategia de cache inteligente
self.addEventListener('fetch', function(event){
  var url = event.request.url;
  var isHtml = event.request.headers.get('accept') &&
               event.request.headers.get('accept').includes('text/html');

  // Solo cachear GET
  if(event.request.method !== 'GET') return;

  // No cachear estas URLs
  if(url.includes('chrome-extension') || url.includes('moz-extension') ||
     url.includes('firestore.googleapis.com') || url.includes('firebase') ||
     url.includes('googleapis.com')) return;

  // config.json: siempre de red para detectar versiones nuevas
  if(url.includes('config.json')){
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(function(){
          return caches.match(event.request);
        })
    );
    return;
  }

  // HTML: network first (siempre intenta traer la versión más nueva)
  if(isHtml){
    event.respondWith(
      fetch(event.request)
        .then(function(response){
          if(response.ok){
            var cacheCopy = response.clone();
            caches.open(CACHE_NAME).then(function(cache){
              cache.put(event.request, cacheCopy);
            });
          }
          return response;
        })
        .catch(function(){
          return caches.match(event.request);
        })
    );
    return;
  }

  // Assets (CSS, imágenes, fuentes): cache first
  event.respondWith(
    caches.match(event.request).then(function(response){
      return response || fetch(event.request)
        .then(function(fetchResponse){
          if(!fetchResponse || fetchResponse.status !== 200) return fetchResponse;
          var cacheCopy = fetchResponse.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(event.request, cacheCopy);
          });
          return fetchResponse;
        })
        .catch(function(){
          return new Response('Offline - archivo no disponible', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
    })
  );
});

// 4. MENSAJE: Escuchar comandos desde la app
self.addEventListener('message', function(event){
  if(event.data && event.data.type === 'SKIP_WAITING'){
    console.log('[SW] Usuario confirmó actualización, tomando control...');
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker v2.1 cargado');
