(function(){
  // ── Service Worker (registro único) ─────────────────────────────────────
  // El registro principal está más abajo junto al sistema de notificación.
  // Este bloque solo gestiona el detector online/offline.

  // ── Detector online/offline ───────────────────────────────────────────────
  // Se define aquí (al final del body) para que showToast, saveToFirestore
  // y currentUser ya estén disponibles cuando se disparen los eventos.
  var _wasOffline = !navigator.onLine;

  // Crear indicador offline en topbar
  function _setOfflineBanner(show){
    let banner = document.getElementById('bv-offline-banner');
    if(show){
      if(!banner){
        banner = document.createElement('div');
        banner.id = 'bv-offline-banner';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#FF9500;color:#fff;text-align:center;font-size:12px;font-weight:600;padding:6px 16px;letter-spacing:.3px;pointer-events:none;';
        banner.textContent = '📵 Sin internet — los cambios se guardarán cuando vuelva la conexión';
        document.body.appendChild(banner);
      }
    } else {
      if(banner) banner.remove();
    }
  }

  // Mostrar banner si arranca offline
  if(!navigator.onLine) _setOfflineBanner(true);

  window.addEventListener('online', function(){
    if(!_wasOffline) return;
    _wasOffline = false;
    _setOfflineBanner(false);
    if(typeof showToast === 'function'){
      showToast('🌐 Conexión restaurada — sincronizando...', '#34C759');
    }
    setTimeout(function(){
      if(typeof saveToFirestore === 'function' && typeof currentUser !== 'undefined' && currentUser){
        saveToFirestore();
      }
    }, 1200);
  });

  window.addEventListener('offline', function(){
    _wasOffline = true;
    _setOfflineBanner(true);
    if(typeof showToast === 'function'){
      showToast('📵 Sin internet — funcionando offline', '#FF9500');
    }
  });
})();