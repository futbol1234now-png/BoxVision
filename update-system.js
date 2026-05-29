(function () {
  'use strict';

  /* ── Referencias DOM ── */
  var notification  = document.getElementById('updateNotification');
  var updateBtn     = document.getElementById('updateNow');
  var dismissBtn    = document.getElementById('updateDismiss');
  var notifTitle    = notification ? notification.querySelector('.update-notification-title') : null;
  var notifSub      = notification ? notification.querySelector('.update-notification-subtitle') : null;
  var progressBar   = notification ? notification.querySelector('.update-progress') : null;

  var pendingWorker = null;
  var swReg         = null;
  var updating      = false;

  /* ── Pasos con delay progresivo (sin recarga real) ── */
  var STEPS = [
    { msg: 'Preparando actualización…',   sub: 'Verificando archivos',        pct: 15,  ms: 800  },
    { msg: 'Descargando nueva versión…',  sub: 'Obteniendo recursos',         pct: 40,  ms: 1200 },
    { msg: 'Instalando cambios…',         sub: 'Aplicando mejoras',           pct: 65,  ms: 1000 },
    { msg: 'Activando nueva versión…',    sub: 'Casi listo',                  pct: 85,  ms: 900  },
    { msg: '¡Actualización completa! ✅', sub: 'BoxVision al día',            pct: 100, ms: 1000 },
  ];

  /* ── Registro del Service Worker ── */
  if ('serviceWorker' in navigator && location.protocol !== 'blob:') {
    window.addEventListener('load', function () {
      fetch(location.pathname.replace(/[^/]*$/, '') + 'sw.js', { method: 'HEAD' })
        .then(function (r) {
          if (!r.ok) { console.info('[BV] sw.js no encontrado'); return; }
          navigator.serviceWorker.register('./sw.js', { scope: './' })
            .then(function (reg) {
              swReg = reg;
              console.log('✅ SW registrado');

              // Chequear inmediatamente si hay versión nueva en el servidor
              reg.update().catch(function(){});

              // Chequear cada 2 min si hay nueva versión
              setInterval(function () {
                if (navigator.onLine) reg.update().catch(function(){});
              }, 2 * 60 * 1000);

              reg.addEventListener('updatefound', function () {
                var nw = reg.installing;
                if (!nw) return;
                nw.addEventListener('statechange', function () {
                  if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                    pendingWorker = nw;
                    showUpdateNotification();
                  }
                });
              });
            })
            .catch(function (e) { console.log('❌ SW error:', e); });
        })
        .catch(function () { console.info('[BV] SW no disponible'); });
    });

    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'SW_ACTIVATED') {
        // El SW nuevo ya está activo = actualización completada
        // Mostrar modal de novedades en vez del banner de actualizar
        setTimeout(function(){
          if(typeof window.openChangelog === 'function') window.openChangelog();
        }, 600);
      }
    });
  }

  /* ── Mostrar / ocultar banner ── */
  function showUpdateNotification() {
    if (!notification || updating) return;
    notification.classList.add('show');
    // Sincronizar estado del botón en Ajustes
    _syncSettingsUpdateBtn('Actualizar ahora', false);
  }

  function hideUpdateNotification(animated) {
    if (!notification) return;
    if (animated) {
      notification.classList.add('hide');
      setTimeout(function () {
        notification.classList.remove('show', 'hide');
      }, 300);
    } else {
      notification.classList.remove('show', 'hide');
    }
  }

  /* ── Aplicar actualización con pasos visuales (sin recarga brusca) ── */
  function applyUpdate() {
    if (updating) return;
    updating = true;

    // Bloquear botones
    if (updateBtn)  { updateBtn.disabled = true; }
    if (dismissBtn) { dismissBtn.style.display = 'none'; }

    // Señalizar al SW que tome el control
    if (pendingWorker) {
      try { pendingWorker.postMessage({ type: 'SKIP_WAITING' }); } catch(e){}
    }

    var step = 0;

    function runStep() {
      if (step >= STEPS.length) {
        // Actualización completada: ocultar banner y mostrar modal de novedades
        setTimeout(function () {
          hideUpdateNotification(true);
          updating = false;
          _syncSettingsUpdateBtn('App actualizada ✅', true);
          _softRefreshAppState();
          // Mostrar modal de novedades tras un breve delay (para que el banner salga primero)
          setTimeout(function(){
            if(typeof window.showChangelog === 'function') window.showChangelog();
          }, 400);
        }, 600);
        return;
      }

      var s = STEPS[step];
      if (notifTitle)   notifTitle.textContent = s.msg;
      if (notifSub)     notifSub.textContent   = s.sub;
      if (progressBar)  progressBar.style.cssText =
        'width:' + s.pct + '%;transition:width ' + (s.ms * 0.8) + 'ms ease;height:2px;' +
        'background:var(--accent);position:absolute;bottom:0;left:0;';

      step++;
      setTimeout(runStep, s.ms);
    }

    runStep();
  }

  /* ── Refrescar estado de la app sin recargar la página ── */
  function _softRefreshAppState() {
    // Limpiar caches de íconos/datos en memoria para que la próxima carga use los nuevos
    if (window._iconAICache)  { for (var k in window._iconAICache) delete window._iconAICache[k]; }
    if (window._iconFailed)   { window._iconFailed.clear(); }
    // Si hay listener de controllerchange, se activa automáticamente el nuevo SW
    navigator.serviceWorker && navigator.serviceWorker.addEventListener('controllerchange', function onCC(){
      navigator.serviceWorker.removeEventListener('controllerchange', onCC);
      console.log('✅ Nuevo SW activo, estado refrescado');
    });
  }

  /* ── Sincronizar botón en Ajustes ── */
  function _syncSettingsUpdateBtn(label, done) {
    var sub  = document.getElementById('settingsUpdateSub');
    var chev = document.getElementById('settingsUpdateChevron');
    var row  = document.getElementById('settingsUpdateRow');
    if (sub)  sub.textContent  = label;
    if (chev) chev.textContent = done ? '✅' : '›';
    if (row && done) row.style.pointerEvents = 'none';
  }

  /* ── Función global: "Actualizar" desde Ajustes ── */
  window.bvCheckUpdate = function () {
    var sub  = document.getElementById('settingsUpdateSub');
    var chev = document.getElementById('settingsUpdateChevron');

    if (updating) return;

    if (pendingWorker) {
      // Ya hay una versión lista → aplicar directo
      showUpdateNotification();
      setTimeout(applyUpdate, 400);
      return;
    }

    // Sin versión pendiente → buscar activamente
    if (sub)  sub.textContent  = 'Buscando actualización…';
    if (chev) chev.textContent = '⏳';

    if (!swReg || !navigator.onLine) {
      setTimeout(function () {
        if (sub)  sub.textContent  = navigator.onLine ? 'No hay actualizaciones' : 'Sin conexión';
        if (chev) chev.textContent = '›';
      }, 1500);
      return;
    }

    swReg.update()
      .then(function () {
        setTimeout(function () {
          if (!pendingWorker) {
            if (sub)  sub.textContent  = 'Ya tenés la última versión ✅';
            if (chev) chev.textContent = '✅';
            setTimeout(function () {
              if (sub)  sub.textContent  = 'Buscar la versión más reciente';
              if (chev) chev.textContent = '›';
            }, 3000);
          }
        }, 2000);
      })
      .catch(function () {
        if (sub)  sub.textContent  = 'Error al buscar actualización';
        if (chev) chev.textContent = '›';
      });
  };

  /* ── Listeners de botones del banner ── */
  if (updateBtn) {
    updateBtn.addEventListener('click', applyUpdate);
  }

  if (dismissBtn) {
    dismissBtn.addEventListener('click', function () {
      if (!updating) hideUpdateNotification(true);
    });
  }

  console.log('🚀 Sistema de actualizaciones v3 iniciado');
})();