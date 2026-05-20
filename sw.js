// BoxVision Service Worker v2.0
// Este SW:
// ✓ Cachea archivos para funcionamiento offline
// ✓ Detecta actualizaciones sin borrar localStorage
// ✓ Solo borra el cache cuando hay una nueva versión
// ✓ Soporta skip_waiting para actualizaciones controladas

const CACHE_NAME = 'boxvision-v1.0.0';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './app.html',
  './manifest.json',
  './config.json',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css'
];

// 1. INSTALACIÓN: Cachear archivos básicos
self.addEventListener('install', function(event){
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(URLS_TO_CACHE).catch(function(err){
        console.log('[SW] Algunos archivos no se pudieron cachear:', err);
      });
    }).then(function(){
      self.skipWaiting(); // Tomar control inmediatamente
    })
  );
});

// 2. ACTIVACIÓN: Limpiar caches viejos (si cambió la versión)
self.addEventListener('activate', function(event){
  console.log('[SW] Activando...');
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
      self.clients.claim(); // Controlar todos los clientes
      // Notificar a la app que fue actualizada
      return self.clients.matchAll();
    }).then(function(clients){
      clients.forEach(function(client){
        client.postMessage({type: 'SW_ACTIVATED'});
      });
    })
  );
});

// 3. FETCH: Estrategia de cache inteligente
self.addEventListener('fetch', function(event){
  var url = event.request.url;
  var isHtml = event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html');

  // Solo cachear GET — POST, HEAD y otros métodos no son cacheables
  if(event.request.method !== 'GET'){
    return;
  }

  // No cachear algunas URLs
  if(url.includes('chrome-extension') || url.includes('moz-extension') ||
     url.includes('firestore.googleapis.com') || url.includes('firebase') ||
     url.includes('googleapis.com')){
    return;
  }

  // Para HTML: network first (siempre trata de actualizar)
  if(isHtml){
    event.respondWith(
      fetch(event.request)
        .then(function(response){
          if(response.ok){
            // Guardar en cache si es exitoso
            var cacheCopy = response.clone();
            caches.open(CACHE_NAME).then(function(cache){
              cache.put(event.request, cacheCopy);
            });
          }
          return response;
        })
        .catch(function(){
          // Si falla, usar cache
          return caches.match(event.request);
        })
    );
  } 
  // Para assets (CSS, JS, imágenes): cache first
  else {
    event.respondWith(
      caches.match(event.request)
        .then(function(response){
          return response || fetch(event.request)
            .then(function(fetchResponse){
              if(!fetchResponse || fetchResponse.status !== 200){
                return fetchResponse;
              }
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
  }
});

// 4. MENSAJE: Escuchar comandos desde la app
self.addEventListener('message', function(event){
  if(event.data && event.data.type === 'SKIP_WAITING'){
    console.log('[SW] SKIP_WAITING recibido, tomando control...');
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker cargado y listo');
