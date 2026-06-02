/* ═══════════════════════════════════════════════════════════════
   BoxVision — Service Worker v4
   Estrategia: Cache-first para assets estáticos,
               Network-first para HTML (siempre trae la versión más reciente),
               Fallback offline para todo lo demás.
   v4: Integración con sistema de actualización automática (BVU).
       — Detecta cuando hay una nueva versión de app.html en red
         y notifica a todos los clientes vía postMessage.
       — Las peticiones con ?_bvu= nunca se interceptan:
         pasan directo a la red para comparar ETags correctamente.
   ═══════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'boxvision-v4';

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

/* ── Guarda el ETag/Last-Modified más reciente visto de app.html ──
   Se comparte entre el SW y la app a través de mensajes. */
var _knownAppEtag = null;

/* ── Install: pre-cachear el shell ── */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.allSettled(
        PRECACHE_ASSETS.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('[SW] No se pudo cachear:', url, err.message);
          });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ── Activate: limpiar caches viejos y notificar clientes ── */
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
      return self.clients.matchAll({ includeUncontrolled: true });
    }).then(function (clients) {
      clients.forEach(function (client) {
        /* Notificar activación — la app puede mostrar el sheet si corresponde */
        client.postMessage({ type: 'SW_ACTIVATED' });
      });
      return self.clients.claim();
    })
  );
});

/* ══════════════════════════════════════════════════════════════
   Fetch: estrategia por tipo de recurso
   ══════════════════════════════════════════════════════════════ */
self.addEventListener('fetch', function (event) {
  var req = event.request;
  var url = new URL(req.url);

  /* Ignorar requests que no son GET */
  if (req.method !== 'GET') return;

  /* ── CRÍTICO: dejar pasar las peticiones del verificador BVU ──
     Las peticiones HEAD con ?_bvu= vienen del sistema de actualización
     automática (bvUpdateChecker). Nunca deben interceptarse: necesitan
     llegar a la red real para comparar el ETag del servidor. */
  if (url.searchParams.has('_bvu')) return;

  /* Ignorar Firebase, EmailJS y otros servicios de API */
  var ignoreHosts = [
    'firestore.googleapis.com',
    'firebase.googleapis.com',
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'api.emailjs.com',
    'googleapis.com',
    'api.anthropic.com',
    'api.groq.com',
  ];
  if (ignoreHosts.some(function (h) { return url.hostname.includes(h); })) return;

  /* Ignorar chrome-extension y blob */
  if (url.protocol === 'chrome-extension:' || url.protocol === 'blob:') return;

  /* ── Estrategia 1: HTML propio → Network-first ──
     Siempre intentar red primero para tener la versión más reciente.
     Si no hay red, servir desde cache.
     BONUS: al obtener app.html de la red, comparar ETag con el conocido
     y notificar a la app si hay una versión nueva. */
  var isOwnHTML = url.origin === self.location.origin &&
    (url.pathname.endsWith('.html') || url.pathname.endsWith('/'));

  if (isOwnHTML) {
    event.respondWith(
      fetch(req).then(function (response) {
        if (response && response.status === 200) {
          /* Detectar cambio de versión comparando ETag */
          var etag = response.headers.get('ETag') || response.headers.get('Last-Modified') || '';
          var isAppHtml = url.pathname.endsWith('app.html') || url.pathname.endsWith('/');

          if (isAppHtml && etag && _knownAppEtag && etag !== _knownAppEtag) {
            /* Notificar a todos los clientes: hay actualización disponible */
            self.clients.matchAll({ includeUncontrolled: true }).then(function (clients) {
              clients.forEach(function (client) {
                client.postMessage({
                  type: 'BVU_UPDATE_AVAILABLE',
                  etag: etag,
                  prevEtag: _knownAppEtag
                });
              });
            });
          }
          if (isAppHtml && etag) _knownAppEtag = etag;

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

  /* ── Estrategia 2: Assets externos conocidos → Stale-while-revalidate ── */
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
          if (req.destination === 'document') {
            return caches.match('./app.html');
          }
        });
      })
    );
    return;
  }
});

/* ═══════════════════════════════════════════════════════════════
   Mensajes desde la app
   ═══════════════════════════════════════════════════════════════ */
self.addEventListener('message', function (event) {
  var data = event.data || {};

  /* La app pide saltar la espera y activar el nuevo SW */
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  /* La app informa su ETag conocido al SW al arrancar */
  if (data.type === 'BVU_REGISTER_ETAG' && data.etag) {
    _knownAppEtag = data.etag;
    return;
  }

  /* La app pide al SW que verifique si hay actualización ahora mismo */
  if (data.type === 'BVU_CHECK_NOW') {
    var checkUrl = self.registration.scope + 'app.html?_bvusw=' + Date.now();
    fetch(checkUrl, { method: 'HEAD', cache: 'no-store' })
      .then(function (res) {
        var etag = res.headers.get('ETag') || res.headers.get('Last-Modified') || '';
        if (etag && _knownAppEtag && etag !== _knownAppEtag) {
          /* Notificar a todos los clientes */
          self.clients.matchAll({ includeUncontrolled: true }).then(function (clients) {
            clients.forEach(function (c) {
              c.postMessage({ type: 'BVU_UPDATE_AVAILABLE', etag: etag, prevEtag: _knownAppEtag });
            });
          });
        } else if (etag && !_knownAppEtag) {
          _knownAppEtag = etag;
        }
      })
      .catch(function () { /* offline, ignorar */ });
    return;
  }
});
