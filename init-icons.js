window._tablerLoaded = false;
  window._tablerFallbackAttempts = 0;
  
  function loadTablerFallback(primaryLink) {
    window._tablerFallbackAttempts++;
    console.warn('⚠️ Tabler icons fallback attempt #' + window._tablerFallbackAttempts);
    
    if(window._tablerFallbackAttempts === 1) {
      // Intento 1: unpkg
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css';
      link.onerror = function() { loadTablerFallback(this); };
      link.onload = function() { window._tablerLoaded = true; console.log('✓ Tabler icons cargó desde unpkg'); };
      document.head.appendChild(link);
    } else if(window._tablerFallbackAttempts === 2) {
      // Intento 2: cdnjs
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/@tabler/icons-webfont@3.44.0/dist/tabler-icons.min.css';
      link.onerror = function() { loadTablerFallback(this); };
      link.onload = function() { window._tablerLoaded = true; console.log('✓ Tabler icons cargó desde cdnjs'); };
      document.head.appendChild(link);
    } else {
      // Fallback final: usar emojis/símbolos
      console.warn('❌ Tabler icons no disponible, usando fallback');
      document.documentElement.setAttribute('data-no-icons', '1');
      window._tablerFailed = true;
    }
  }
  
  // Verificar carga después de documento listo
  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ verifyTablerIcons(); });
  } else {
    verifyTablerIcons();
  }
  
  function verifyTablerIcons() {
    setTimeout(function() {
      if(!window._tablerLoaded && document.querySelector('i.ti')) {
        var styles = window.getComputedStyle(document.querySelector('i.ti'));
        var ff = styles.fontFamily.toLowerCase();
        if(ff.indexOf('tabler') === -1) {
          console.warn('⚠️ Icons verificación falló, aplicando fallback CSS');
          document.documentElement.setAttribute('data-icons-verified-fail', '1');
        }
      }
    }, 2000);
  }