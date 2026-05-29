/* ══════════════════════════════════════════════════════════
   BoxVision — Sistema de Auto-Mantenimiento v2
   Detecta y redirige al 404 automáticamente en:
   1. Errores JS críticos repetidos (SyntaxError, undefined, etc.)
   2. Login fallido varias veces seguidas
   3. App congelada / no carga en tiempo razonable
   4. Firebase SDK bloqueado o caído
   5. Firestore inaccesible repetidamente
   6. Promesas rechazadas sin manejar (app rota silenciosa)
   7. Pantalla en blanco (body vacío mucho tiempo)
   ══════════════════════════════════════════════════════════ */
(function(){
  var REDIRECT      = './404.html';
  var MAX_JS_ERRORS = 999;  // temporal: desactivado durante migración
  var MAX_LOGINS    = 12;   // ⬆️ AUMENTADO: 5→12 (usuario puede reintentar varias veces)
  var MAX_FIRESTORE = 20;   // ⬆️ AUMENTADO: 8→20 (conexión inestable permitida)
  var MAX_PROMISE   = 999;  // temporal: desactivado durante migración
  var LOAD_TIMEOUT  = 50000;// ⬆️ AUMENTADO: 25000→50000 (espera mucho más tiempo)
  var RESET_MS      = 30000; // 30s: limpia rápido durante desarrollo

  var LS = {
    js:   'bv_ec_js',
    lg:   'bv_ec_lg',
    fs:   'bv_ec_fs',
    pr:   'bv_ec_pr',
    time: 'bv_ec_t',
    why:  'bv_maint_reason'
  };

  // Limpiar si pasaron más de 2 min (evitar bloqueo permanente por error puntual)
  var lastT = parseInt(localStorage.getItem(LS.time)||'0');
  if(Date.now() - lastT > RESET_MS){
    [LS.js, LS.lg, LS.fs, LS.pr].forEach(function(k){ localStorage.removeItem(k); });
  }

  function bump(key, max, label){
    var n = parseInt(localStorage.getItem(key)||'0') + 1;
    localStorage.setItem(key, n);
    localStorage.setItem(LS.time, Date.now());
    if(n >= max){
      [LS.js, LS.lg, LS.fs, LS.pr].forEach(function(k){ localStorage.removeItem(k); });
      go(label + ' (x'+n+')');
    }
  }

  function go(reason){
    console.warn('[BoxVision] Auto-mantenimiento:', reason);
    try{ localStorage.setItem(LS.why, reason); }catch(e){}
    window.location.replace(REDIRECT);
  }

  // ── 1. Errores JS críticos globales ──────────────────────
  var CRITICAL_MSGS = [
    'illegal return','is not defined','is not a function',
    'cannot read prop','unexpected token','syntaxerror',
    'cannot set prop','maximum call stack'
  ];
  var IGNORE_MSGS = [
    'slow network','intervention','tabler','woff','font',
    'favicon','cross-origin','coop','blocked the window'
  ];
  window.addEventListener('error', function(e){
    // Solo errores de JS, no de recursos (img, css, etc.)
    if(e.target && e.target !== window && e.target.tagName) return;
    var msg = (e.message||e.type||'').toLowerCase();
    for(var i=0;i<IGNORE_MSGS.length;i++) if(msg.indexOf(IGNORE_MSGS[i])>=0) return;
    for(var j=0;j<CRITICAL_MSGS.length;j++){
      if(msg.indexOf(CRITICAL_MSGS[j])>=0){
        bump(LS.js, MAX_JS_ERRORS, 'error JS: '+msg.slice(0,60));
        return;
      }
    }
  }, true);

  // ── 2. Promesas rechazadas sin manejar ───────────────────
  window.addEventListener('unhandledrejection', function(e){
    var msg = '';
    try{ msg = (e.reason && (e.reason.message||String(e.reason))||'').toLowerCase(); }catch(x){}
    // Ignorar errores de red normales y COOP
    var netIgnore = ['failed to fetch','networkerror','network error',
                     'load failed','cors','cross-origin','coop','blocked'];
    for(var i=0;i<netIgnore.length;i++) if(msg.indexOf(netIgnore[i])>=0) return;
    // Solo contar si parece error de código, no de red
    if(msg.indexOf('is not')>=0 || msg.indexOf('undefined')>=0 ||
       msg.indexOf('null')>=0   || msg.indexOf('syntaxerror')>=0){
      bump(LS.pr, MAX_PROMISE, 'promesa: '+msg.slice(0,60));
    }
  });

  // ── 3. Fallos de login (llamado desde launchApp) ─────────
  window._bvLoginFail = function(reason){
    bump(LS.lg, MAX_LOGINS, 'login: '+(reason||'').slice(0,60));
  };

  // ── 4. Fallos de Firestore (llamado desde loadFromFirestore) ──
  window._bvFirestoreFail = function(reason){
    bump(LS.fs, MAX_FIRESTORE, 'firestore: '+(reason||'').slice(0,60));
  };

  // ── 5. Timeout: app no carga en LOAD_TIMEOUT ms ──────────
  var _loadTimer = setTimeout(function(){
    var login  = document.getElementById('loginScreen');
    var main   = document.getElementById('mainScreen');
    var splash = document.getElementById('splash');
    var loginVisible  = login  && !login.classList.contains('hidden') && login.style.display !== 'none';
    var mainVisible   = main   && !main.classList.contains('hidden');
    var splashVisible = splash && splash.classList.contains('active');
    if(!loginVisible && !mainVisible && !splashVisible){
      go('pantalla en blanco '+LOAD_TIMEOUT+'ms');
    }
  }, LOAD_TIMEOUT);

  // ── 6. App cargó bien: limpiar todo ──────────────────────
  window._bvAppLoaded = function(){
    clearTimeout(_loadTimer);
    [LS.js, LS.lg, LS.fs, LS.pr].forEach(function(k){ localStorage.removeItem(k); });
  };
})();