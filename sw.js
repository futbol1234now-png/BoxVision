// 🔖 Sube este número cada vez que hagas cambios al SW
const CACHE = 'boxvision-v4';

// 📦 Archivos críticos que se guardan en caché desde el primer uso
const CORE = [
  './',
  './index.html',
  './app.html',
  './manifest.json',
  './icons/logo.png',
  './icons/icon-192.png'
];

// 🚫 URLs que NUNCA se cachean (siempre necesitan internet)
const SKIP = [
  /firebaseio\.com/,
  /googleapis\.com/,
  /firestore\.googleapis\.com/,
  /identitytoolkit\.googleapis\.com/,
  /securetoken\.googleapis\.com/,
  /groq\.com/,
  /cloudflare/,
  /jsonbin\.io/,
  /\/v1\//,
  /__\/auth/,
  /api\.anthropic\.com/,
];

// ⚙️ INSTALL — Guarda archivos críticos (falla suave si alguno no existe)
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(CORE.map(url => c.add(url).catch(() => {})))
    )
  );
});

// 🧹 ACTIVATE — Elimina cachés de versiones anteriores
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// 🌐 FETCH — Estrategia inteligente por tipo de recurso
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Nunca interceptar estas URLs
  if (SKIP.some(r => r.test(url.href))) return;

  // config.json — siempre red primero (para detectar fin de mantenimiento)
  if (url.pathname.endsWith('config.json')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Todo lo demás — caché primero, red en segundo plano (stale-while-revalidate)
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(res => {
          if (res && res.status === 200 && res.type !== 'opaque') {
            cache.put(e.request, res.clone());
          }
          return res;
        }).catch(() => cached);

        // Si hay caché devolver inmediato y actualizar en fondo
        // Si no hay caché, esperar la red
        return cached || fetchPromise;
      })
    )
  );
});
