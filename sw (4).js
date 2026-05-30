/* ═══════════════════════════════════════════════════════════════
   BoxVision — Service Worker v3
   Estrategia: Cache-first para assets estáticos,
               Network-first para HTML (siempre trae la versión más reciente),
               Fallback offline para todo lo demás.
   ═══════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'boxvision-v3';

/* Archivos que se cachean en la instalación (shell de la app) */
const PRECACHE_ASSETS = [
  './app.html',
  './viewer.html',
  './404.html',
  './icons/logo.png',
];

/* Dominios externos que se cachean con stale-while-revalidate */
const CACHE_EXTERNAL_HOSTS = [
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
  'www.gstatic.com',
];

/* ── Install: pre-cachear el shell ── */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      /* addAll falla si algún recurso no existe; usamos add individual con try/catch */
      return Promise.allSettled(
        PRECACHE_ASSETS.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('[SW] No se pudo cachear:', url, err.message);
          });
        })
      );
    }).then(function () {
      /* Activar de inmediato sin esperar que cierren otras pestañas */
      return self.skipWaiting();
    })
  );
});

/* ── Activate: limpiar caches viejos ── */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) {
            console.log('[SW] Eliminando cache viejo:', key);
            return caches.delete(key);
          })
      );
    }).then(function () {
      /* Tomar control de todas las pestañas abiertas */
      self.clients.matchAll({ includeUncontrolled: true }).then(function (clients) {
        clients.forEach(function (client) {
          client.postMessage({ type: 'SW_ACTIVATED' });
        });
      });
      return self.clients.claim();
    })
  );
});

/* ── Fetch: estrategia por tipo de recurso ── */
self.addEventListener('fetch', function (event) {
  var req = event.request;
  var url = new URL(req.url);

  /* Ignorar requests que no son GET */
  if (req.method !== 'GET') return;

  /* Ignorar Firebase, EmailJS y otros servicios de API */
  var ignoreHosts = [
    'firestore.googleapis.com',
    'firebase.googleapis.com',
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'api.emailjs.com',
    'googleapis.com',
  ];
  if (ignoreHosts.some(function (h) { return url.hostname.includes(h); })) return;

  /* Ignorar chrome-extension y blob */
  if (url.protocol === 'chrome-extension:' || url.protocol === 'blob:') return;

  /* ── Estrategia 1: HTML propio → Network-first ──
     Siempre intentar red primero para tener la versión más reciente.
     Si no hay red, servir desde cache. */
  var isOwnHTML = url.origin === self.location.origin &&
    (url.pathname.endsWith('.html') || url.pathname.endsWith('/'));

  if (isOwnHTML) {
    event.respondWith(
      fetch(req).then(function (response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
        }
        return response;
      }).catch(function () {
        return caches.match(req).then(function (cached) {
          return cached || caches.match('./app.html');
        });
      })
    );
    return;
  }

  /* ── Estrategia 2: Assets externos conocidos → Stale-while-revalidate ──
     Servir desde cache inmediatamente y actualizar en background. */
  var isExternal = CACHE_EXTERNAL_HOSTS.some(function (h) {
    return url.hostname.includes(h);
  });

  if (isExternal) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(req).then(function (cached) {
          var fetchPromise = fetch(req).then(function (response) {
            if (response && response.status === 200) {
              cache.put(req, response.clone());
            }
            return response;
          }).catch(function () { return cached; });

          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  /* ── Estrategia 3: Assets propios (iconos, js, css) → Cache-first ── */
  var isOwnAsset = url.origin === self.location.origin;
  if (isOwnAsset) {
    event.respondWith(
      caches.match(req).then(function (cached) {
        if (cached) return cached;
        return fetch(req).then(function (response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
          }
          return response;
        }).catch(function () {
          /* Fallback offline: devolver app.html para rutas desconocidas */
          if (req.destination === 'document') {
            return caches.match('./app.html');
          }
        });
      })
    );
    return;
  }
});

/* ── Mensaje desde la app: forzar actualización ── */
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
