(function(){
  var banner = document.getElementById('offlineBanner');
  var dot    = document.getElementById('offlineDot');
  var msg    = document.getElementById('offlineMsg');
  var _hideTimer = null;

  function showBanner(online){
    if(!banner) return;
    clearTimeout(_hideTimer);
    banner.style.display = 'flex';
    banner.style.opacity = '0';
    banner.style.transform = 'translateX(-50%) translateY(8px)';
    requestAnimationFrame(function(){
      banner.style.transition = 'opacity .35s, transform .35s';
      banner.style.opacity = '1';
      banner.style.transform = 'translateX(-50%) translateY(0)';
    });
    if(online){
      dot.style.background = '#34C759';
      msg.textContent = 'Conexión restaurada';
      _hideTimer = setTimeout(hideBanner, 2800);
    } else {
      dot.style.background = '#FF3B30';
      msg.textContent = 'Sin conexión — modo local activo';
      // Se queda visible hasta que haya internet
    }
  }
  function hideBanner(){
    if(!banner) return;
    banner.style.opacity = '0';
    banner.style.transform = 'translateX(-50%) translateY(8px)';
    setTimeout(function(){ banner.style.display = 'none'; }, 350);
  }

  window.addEventListener('offline', function(){ showBanner(false); });
  window.addEventListener('online',  function(){ showBanner(true);  });

  // Al cargar: si ya estamos offline, mostrar banner
  if(!navigator.onLine){
    document.addEventListener('DOMContentLoaded', function(){
      setTimeout(function(){ showBanner(false); }, 600);
    });
  }
})();