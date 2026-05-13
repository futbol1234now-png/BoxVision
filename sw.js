// 🔖 Sube este número cada vez que hagas cambios al SW
const CACHE = 'boxvision-v3';

// 📦 Archivos críticos que se guardan en caché desde el primer uso
const CORE = [
  './',
  './index.html',
  './app.html',
  './manifest.json',
  './icons/logo.png',
  './icons/icon-192.png'
];

// ⚙️ INSTALL — Guarda todos los archivos críticos al instalar
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
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

// 🌐 FETCH — Sirve desde caché primero, actualiza en segundo plano
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
