// ── Detectar si Tabler Icons cargó; si no, inyectar fallback emoji ──────
(function(){
  function _tablerLoaded(){
    // Comprueba si la fuente tabler-icons está disponible
    try{
      var t = document.createElement('span');
      t.className = 'ti ti-x';
      t.style.cssText = 'position:fixed;left:-9999px;font-family:tabler-icons';
      document.body.appendChild(t);
      var w = t.offsetWidth;
      document.body.removeChild(t);
      return w > 0;
    }catch(e){ return false; }
  }
  // Mapa ícono → emoji/símbolo unicode
  var _map = {
    'ti-x':'✕','ti-plus':'+','ti-check':'✓','ti-chevron-left':'‹','ti-chevron-right':'›',
    'ti-search':'⌕','ti-settings':'⚙','ti-star':'★','ti-pencil':'✏','ti-trash':'🗑',
    'ti-box':'▦','ti-package':'📦','ti-camera':'📷','ti-microphone':'🎤','ti-qrcode':'▦',
    'ti-history':'↺','ti-notes':'📝','ti-photo':'🖼','ti-link':'🔗','ti-copy':'⎘',
    'ti-copy-plus':'⎘+','ti-brand-whatsapp':'💬','ti-layout-grid':'⊞','ti-list':'≡',
    'ti-arrows-sort':'⇅','ti-sun':'☀','ti-moon':'☽','ti-robot':'🤖','ti-loader':'↻',
    'ti-lock':'🔒','ti-lock-password':'🔑','ti-eye':'👁','ti-eye-off':'🚫',
    'ti-map-pin':'📍','ti-tag':'🏷','ti-hash':'#','ti-calendar':'📅','ti-chart-bar':'📊',
    'ti-cloud':'☁','ti-database-backup':'💾','ti-refresh':'↺','ti-rocket':'🚀',
    'ti-info-circle':'ℹ','ti-alert-circle':'⚠','ti-circle-check':'✅',
    'ti-arrow-right':'→','ti-sort-ascending-letters':'A↑','ti-palette':'🎨',
    'ti-microphone':'🎤','ti-volume':'🔊','ti-users':'👥','ti-device-mobile':'📱',
    'ti-printer':'🖨','ti-flashlight':'🔦','ti-moon':'🌙'
  };
  function _injectFallback(){
    var style = document.createElement('style');
    var rules = Object.keys(_map).map(function(cls){
      return '.ti.'+cls+'::before{content:"'+_map[cls]+'";font-family:inherit;font-style:normal}';
    }).join('\n');
    // Base: resetear font-family de .ti para que no intente cargar la fuente ausente
    style.textContent = '.ti{font-family:inherit!important;font-style:normal;speak:never}\n' + rules;
    document.head.appendChild(style);
    console.warn('[BoxVision] Tabler Icons offline — usando fallback emoji');
  }
  // Esperar a que el DOM cargue para comprobar
  window.addEventListener('load', function(){
    setTimeout(function(){
      var tablerOk = !window._tablerFailed;
      if(tablerOk){
        // Doble chequeo: ver si la hoja de estilos de tabler realmente cargó
        try{
          var sheets = document.styleSheets;
          tablerOk = false;
          for(var i=0;i<sheets.length;i++){
            var h = sheets[i].href||'';
            if(h.indexOf('tabler-icons')>-1){ tablerOk=true; break; }
          }
        }catch(e){ tablerOk = false; }
      }
      if(!tablerOk) _injectFallback();
    }, 800);
  });
  // También reaccionar inmediatamente si el link falló antes del load
  /* tablerCSS listener removed — elemento no existe */ document.getElementById('tabler-primary') && document.getElementById('tabler-primary').addEventListener('error', _injectFallback);
})();