/**
 * BoxVision — Service Worker v2.1
 * ================================
 * Maneja:
 *  - Cache offline (cache-first para assets, network-first para HTML)
 *  - Timers de notificaciones vía postMessage (SmartPush legacy + WebPush v2)
 *  - Persistencia de recordatorios en IndexedDB para sobrevivir reinicios del SW
 *  - Detección de actualizaciones via ETag (sistema BVU)
 *  - notificationclick → abrir app y notificar al cliente
 *
 * ⚠️  LIMITACIÓN IMPORTANTE:
 *  Los Service Workers pueden ser terminados por el navegador en cualquier
 *  momento (especialmente en mobile). Los setTimeout() programados AQUÍ
 *  se pierden si el SW es destruido antes de que disparen.
 *  La solución robusta requeriría un servidor Push (VAPID), que esta app no tiene.
 *  Como mitigación, los recordatorios pendientes se guardan en IndexedDB y se
 *  re-chequean cada vez que el SW se reactiva (fetch, message, etc.).
 */

'use strict';

/* ─── Constantes ─────────────────────────────────────────────────────────── */

const CACHE_NAME      = 'boxvision-v3';
const STATIC_CACHE    = 'boxvision-static-v3';
const HTML_CACHE      = 'boxvision-html-v3';

const APP_HTML        = './app_top_features_v3.html';
const ICON_PATH       = './icons/logo.png';

// Assets de CDN que vale la pena cachear
const CDN_ORIGINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'www.gstatic.com',          // Firebase
  'firebaseapp.com',
];

/* ─── Estado en memoria del SW ───────────────────────────────────────────── */

/**
 * Map<tag, timeoutId>  — timers activos en esta instancia del SW.
 * Se pierden si el SW es terminado. IndexedDB compensa esto al re-activarse.
 */
const activeTimers = new Map();

/**
 * ETag conocido del HTML (se actualiza vía mensaje BVU_REGISTER_ETAG
 * y también desde la primera respuesta de red).
 */
let knownEtag = null;

/* ─── IndexedDB helpers ───────────────────────────────────────────────────── */

const DB_NAME    = 'boxvision-sw';
const DB_VERSION = 1;
const STORE_NAME = 'pending-reminders';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // La clave primaria es el tag de la notificación
        db.createObjectStore(STORE_NAME, { keyPath: 'tag' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function saveReminder(reminder) {
  // reminder = { tag, title, body, icon, data, fireAt (timestamp ms) }
  const db    = await openDB();
  const tx    = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.put(reminder);
  return new Promise((res, rej) => {
    tx.oncomplete = res;
    tx.onerror    = (e) => rej(e.target.error);
  });
}

async function deleteReminder(tag) {
  const db    = await openDB();
  const tx    = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.delete(tag);
  return new Promise((res, rej) => {
    tx.oncomplete = res;
    tx.onerror    = (e) => rej(e.target.error);
  });
}

async function getAllReminders() {
  const db    = await openDB();
  const tx    = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const req   = store.getAll();
  return new Promise((res, rej) => {
    req.onsuccess = (e) => res(e.target.result || []);
    req.onerror   = (e) => rej(e.target.error);
  });
}

/* ─── Helpers de notificación ────────────────────────────────────────────── */

/**
 * Muestra la notificación y notifica al cliente que el recordatorio fue disparado.
 * También elimina el recordatorio de IndexedDB.
 */
async function fireNotification(reminder) {
  const { tag, title, body, icon, data } = reminder;

  try {
    await self.registration.showNotification(title, {
      body,
      icon:    icon || ICON_PATH,
      tag,
      badge:   ICON_PATH,
      vibrate: [200, 100, 200],
      data:    data || {},
    });
  } catch (err) {
    console.warn('[SW] showNotification error:', err);
  }

  // Eliminar de IndexedDB una vez disparado
  try { await deleteReminder(tag); } catch (_) {}

  // Notificar al cliente para que limpie el recordatorio
  notifyClients({
    type:  'WP_NOTIF_FIRED',
    remId: data && data.remId ? data.remId : tag,
  });
  // Legacy SmartPush
  notifyClients({
    type:  'NOTIF_FIRED',
    remId: data && data.remId ? data.remId : tag,
  });
}

/**
 * Programa un timer en memoria. Si delayMs ≤ 0 dispara inmediatamente.
 * Guarda el recordatorio en IndexedDB para recuperarlo si el SW reinicia.
 */
async function scheduleReminder(payload) {
  const {
    id,
    title,
    body,
    icon,
    tag,
    delayMs,
    data,
  } = payload;

  const resolvedTag = tag || ('bv-rem-' + id);
  const fireAt      = Date.now() + Math.max(0, delayMs || 0);

  const reminder = { tag: resolvedTag, title, body, icon, data, fireAt };

  // Guardar en IndexedDB (persistencia entre reinicios del SW)
  try { await saveReminder(reminder); } catch (_) {}

  // Cancelar timer anterior con el mismo tag si existe
  cancelTimer(resolvedTag);

  const delay = Math.max(0, fireAt - Date.now());

  if (delay === 0) {
    // Disparar de inmediato en el próximo tick
    setTimeout(() => fireNotification(reminder), 0);
  } else {
    const timerId = setTimeout(() => {
      activeTimers.delete(resolvedTag);
      fireNotification(reminder);
    }, delay);
    activeTimers.set(resolvedTag, timerId);
  }
}

/**
 * Cancela un timer activo por tag.
 */
function cancelTimer(tag) {
  if (activeTimers.has(tag)) {
    clearTimeout(activeTimers.get(tag));
    activeTimers.delete(tag);
  }
}

/**
 * Cancela recordatorio: timer en memoria + IndexedDB.
 */
async function cancelReminder(tag) {
  cancelTimer(tag);
  try { await deleteReminder(tag); } catch (_) {}
}

/**
 * Al re-activarse el SW, revisa IndexedDB y dispara o reprograma recordatorios
 * que pudieran haber quedado pendientes mientras el SW estaba inactivo.
 */
async function recoverPendingReminders() {
  let reminders;
  try {
    reminders = await getAllReminders();
  } catch (_) {
    return;
  }

  const now = Date.now();
  for (const reminder of reminders) {
    if (!reminder.fireAt) continue;

    if (reminder.fireAt <= now) {
      // Ya debería haber disparado — hacerlo ahora
      fireNotification(reminder);
    } else {
      // Reprogramar el timer
      const delay   = reminder.fireAt - now;
      const timerId = setTimeout(() => {
        activeTimers.delete(reminder.tag);
        fireNotification(reminder);
      }, delay);
      activeTimers.set(reminder.tag, timerId);
    }
  }
}

/* ─── Helpers de clientes ────────────────────────────────────────────────── */

/**
 * Envía un mensaje a todos los clientes controlados por este SW.
 */
async function notifyClients(msg) {
  const clientList = await self.clients.matchAll({ includeUncontrolled: false });
  for (const client of clientList) {
    try { client.postMessage(msg); } catch (_) {}
  }
}

/* ─── install ────────────────────────────────────────────────────────────── */

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // Pre-cachear el HTML principal y el ícono
      const htmlCache   = await caches.open(HTML_CACHE);
      const staticCache = await caches.open(STATIC_CACHE);

      try {
        await htmlCache.add(APP_HTML);
      } catch (err) {
        console.warn('[SW] No se pudo pre-cachear el HTML:', err);
      }

      try {
        await staticCache.add(ICON_PATH);
      } catch (err) {
        console.warn('[SW] No se pudo pre-cachear el ícono:', err);
      }

      // Activar de inmediato sin esperar a que los clientes actuales cierren
      await self.skipWaiting();
    })()
  );
});

/* ─── activate ───────────────────────────────────────────────────────────── */

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Eliminar caches obsoletos (de versiones anteriores del SW)
      const cacheNames = await caches.keys();
      const validCaches = new Set([CACHE_NAME, STATIC_CACHE, HTML_CACHE]);
      await Promise.all(
        cacheNames
          .filter((name) => !validCaches.has(name))
          .map((name) => caches.delete(name))
      );

      // Tomar control de todos los clientes abiertos sin recargar
      await self.clients.claim();

      // Notificar a los clientes que el SW está activo
      await notifyClients({ type: 'SW_ACTIVATED' });

      // Recuperar recordatorios que pudieron haberse perdido
      await recoverPendingReminders();
    })()
  );
});

/* ─── message ────────────────────────────────────────────────────────────── */

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {

    /* ── WebPush v2: programar recordatorio ── */
    case 'WP_SCHEDULE':
      event.waitUntil(scheduleReminder(payload));
      break;

    /* ── SmartPush legacy: programar recordatorio ── */
    case 'SCHEDULE_NOTIFICATION':
      event.waitUntil(scheduleReminder(payload));
      break;

    /* ── WebPush v2: cancelar recordatorio ── */
    case 'WP_CANCEL': {
      const tag = payload && payload.tag;
      if (tag) event.waitUntil(cancelReminder(tag));
      break;
    }

    /* ── SmartPush legacy: cancelar recordatorio ── */
    case 'CANCEL_NOTIFICATION': {
      // Puede venir como payload.tag o payload.id
      const tag = (payload && (payload.tag || ('bv-rem-' + payload.id)));
      if (tag) event.waitUntil(cancelReminder(tag));
      break;
    }

    /* ── BVU: registrar ETag conocido ── */
    case 'BVU_REGISTER_ETAG':
      if (payload && payload.etag) {
        knownEtag = payload.etag;
      }
      break;

    default:
      // Ignorar mensajes desconocidos silenciosamente
      break;
  }
});

/* ─── notificationclick ──────────────────────────────────────────────────── */

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const boxId     = notifData.boxId  || null;
  const remId     = notifData.remId  || event.notification.tag || null;

  event.waitUntil(
    (async () => {
      // Buscar ventana ya abierta de la app
      const clientList = await self.clients.matchAll({
        type:                'window',
        includeUncontrolled: false,
      });

      let targetClient = null;

      for (const client of clientList) {
        if (client.url.includes('app_top_features_v3') || client.url.includes(self.registration.scope)) {
          targetClient = client;
          break;
        }
      }

      if (targetClient) {
        // Enfocar la ventana existente
        await targetClient.focus();
      } else {
        // Abrir una nueva ventana
        targetClient = await self.clients.openWindow(APP_HTML);
        // Esperar un momento para que la app cargue antes de enviar el mensaje
        await new Promise((r) => setTimeout(r, 800));
      }

      // Notificar al cliente qué caja abrir (WebPush v2 + legacy)
      const sendMsg = async (client) => {
        if (!client) return;
        if (boxId) {
          try { client.postMessage({ type: 'WP_NOTIF_CLICKED', boxId }); } catch (_) {}
          try { client.postMessage({ type: 'NOTIF_CLICKED',    boxId }); } catch (_) {}
        }
        if (remId) {
          try { client.postMessage({ type: 'WP_NOTIF_FIRED', remId }); } catch (_) {}
          try { client.postMessage({ type: 'NOTIF_FIRED',    remId }); } catch (_) {}
        }
      };

      await sendMsg(targetClient);
    })()
  );
});

/* ─── notificationclose ──────────────────────────────────────────────────── */

self.addEventListener('notificationclose', (_event) => {
  // Nada por hacer; el recordatorio en IndexedDB ya fue eliminado al disparar.
});

/* ─── fetch ──────────────────────────────────────────────────────────────── */

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url         = new URL(request.url);

  // Ignorar peticiones que no son GET
  if (request.method !== 'GET') return;

  // Ignorar peticiones de extensiones del navegador
  if (!url.protocol.startsWith('http')) return;

  // ── 1. HTML principal: network-first + detección BVU ─────────────────── //
  if (isAppHtml(url)) {
    event.respondWith(networkFirstHtml(request));
    return;
  }

  // ── 2. Assets de CDN: cache-first ─────────────────────────────────────── //
  if (isCdnAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // ── 3. Assets locales estáticos (íconos, manifest): cache-first ─────── //
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // ── 4. Firebase / APIs externas: siempre red, sin interceptar ─────────── //
  // (no cachear respuestas de Firestore/Auth)
});

/* ─── Helpers de fetch ───────────────────────────────────────────────────── */

function isAppHtml(url) {
  return (
    url.pathname.endsWith('app_top_features_v3.html') ||
    url.pathname === '/' ||
    url.pathname === '/index.html'
  );
}

function isCdnAsset(url) {
  return CDN_ORIGINS.some((origin) => url.hostname.includes(origin));
}

function isStaticAsset(url) {
  const { pathname } = url;
  return (
    pathname.startsWith('/icons/') ||
    pathname.endsWith('.png')      ||
    pathname.endsWith('.jpg')      ||
    pathname.endsWith('.svg')      ||
    pathname.endsWith('.ico')      ||
    pathname.endsWith('.webp')     ||
    pathname.endsWith('manifest.json')
  );
}

/**
 * Network-first para el HTML principal.
 * Si hay conexión, devuelve la respuesta de red y actualiza el cache.
 * Compara ETags para detectar nuevas versiones (sistema BVU).
 * Si no hay conexión, sirve desde cache.
 */
async function networkFirstHtml(request) {
  let networkResponse;

  try {
    networkResponse = await fetch(request.clone());
  } catch (_) {
    // Sin red → servir desde cache
    return serveFromCache(request, HTML_CACHE);
  }

  if (networkResponse && networkResponse.ok) {
    // Detectar cambio de versión via ETag
    const newEtag = networkResponse.headers.get('ETag') ||
                    networkResponse.headers.get('etag');

    if (newEtag && knownEtag && newEtag !== knownEtag) {
      // Nueva versión disponible — notificar a los clientes
      notifyClients({ type: 'BVU_UPDATE_AVAILABLE', etag: newEtag });
      knownEtag = newEtag;
    } else if (newEtag && !knownEtag) {
      knownEtag = newEtag;
    }

    // Actualizar cache con la respuesta fresca
    const cache = await caches.open(HTML_CACHE);
    cache.put(request, networkResponse.clone());
  }

  return networkResponse || serveFromCache(request, HTML_CACHE);
}

/**
 * Cache-first: devuelve desde cache si existe, si no va a red y cachea.
 */
async function cacheFirst(request, cacheName) {
  const cache    = await caches.open(cacheName);
  const cached   = await cache.match(request);
  if (cached) return cached;

  let networkResponse;
  try {
    networkResponse = await fetch(request.clone());
  } catch (_) {
    // Sin red y sin cache → respuesta vacía con error
    return new Response('Sin conexión', { status: 503 });
  }

  if (networkResponse && networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }

  return networkResponse;
}

/**
 * Sirve desde cache; si no hay entrada retorna un 503.
 */
async function serveFromCache(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  return new Response(
    '<h1>BoxVision — Sin conexión</h1><p>Conecta a internet para continuar.</p>',
    {
      status:  503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

/* ─── Background Sync (workaround para recordatorios perdidos) ───────────── */
/**
 * Si el navegador soporta Background Sync, intentamos registrar un sync
 * cada vez que el SW recibe un mensaje de schedule.
 * El evento 'sync' es manejado abajo para re-chequear recordatorios pendientes.
 *
 * ⚠️  Background Sync no garantiza ejecución en todos los navegadores/OS.
 *     Es un best-effort para mejorar la fiabilidad sin un servidor push.
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'bv-check-reminders') {
    event.waitUntil(recoverPendingReminders());
  }
});
