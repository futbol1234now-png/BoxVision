/* BoxVision — PWA setup, routing, splash screen y reloj */

function setupPWA(){
  window.addEventListener("beforeinstallprompt",e=>{
    e.preventDefault();deferredInstall=e;
    const b=document.getElementById("installBanner");
    if(b) b.classList.remove("hidden");
  });
  const installBtn=document.getElementById("installBtn");
  if(installBtn) installBtn.onclick=()=>{
    if(deferredInstall){
      deferredInstall.prompt();
      deferredInstall.userChoice.then(()=>{
        deferredInstall=null;
        const b=document.getElementById("installBanner");
        if(b) b.classList.add("hidden");
      });
    }
  };
}

function route(){
  const hash=location.hash;
  if(hash.startsWith("#view/")){try{showViewer(JSON.parse(decodeURIComponent(atob(hash.slice(6)))));}catch(e){showViewer(null);}return;}
  // FIX: si ya hay sesion activa (Firebase o local), ir directo a main, no al landing
  if(currentUser || !window._authEnabled){
    // limpiar hash para que el boton atras no pueda volver
    history.replaceState(null, "", location.pathname + location.search);
    goMain(); return;
  }
  loadAll();setupPWA();initTutorial();showSplash();
}

function showScreen(id){
  // Restaurar scroll al salir del splash
  if(id !== "splash"){
    document.body.style.overflow="";
    document.body.style.height="";
  }
  // Detener el reloj al salir de splash y main (no tiene sentido en detail/settings/rooms)
  if(id !== "splash" && id !== "mainScreen"){
    _stopClock();
  }
  // Stop TTS if leaving viewer
  if(id!=="viewer"&&window.speechSynthesis&&speaking){
    window.speechSynthesis.cancel();speaking=false;
    const tb=document.getElementById("ttsBtn");if(tb) tb.classList.remove("on");
  }
  // Cancel voice recognition if active
  if(voiceRecog){try{voiceRecog.abort();}catch(e){}voiceRecog=null;
    const mb=document.getElementById("micBtn");if(mb){mb.classList.remove("recording");}
  }
  // MOSTRAR primero la nueva pantalla para evitar flash negro entre transiciones
  const el=document.getElementById(id);
  if(el){el.classList.remove("hidden");el.classList.add("active");el.style.display="";}
  // Luego ocultar las demás
  document.querySelectorAll("#splash,#loginScreen,#mainScreen,#detailScreen,#roomScreen,#settingsScreen,#viewer").forEach(el=>{
    if(el.id!==id){el.classList.add("hidden");el.classList.remove("active");el.style.display="";}
  });
  // Manejar FAB de Box IA
  const _fab=document.getElementById("aiFab");
  if(_fab){
    if(id==="viewer"||id==="splash"||id==="loginScreen"){
      _fab.classList.add("hidden");
    } else {
      _fab.classList.remove("hidden");
      _fab.style.display="flex";
      _fab.style.opacity="1";
    }
  }
}

function applySplashGradient(){
  const h=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Lima'})).getHours();
  let grad;
  if(h>=5&&h<9)       grad='linear-gradient(160deg,#C0392B 0%,#FF6B35 40%,#007AFF 100%)';
  else if(h>=9&&h<13) grad='linear-gradient(160deg,#0051D4 0%,#007AFF 60%,#5856D6 100%)';
  else if(h>=13&&h<17)grad='linear-gradient(160deg,#4B0082 0%,#5856D6 50%,#007AFF 100%)';
  else if(h>=17&&h<20)grad='linear-gradient(160deg,#FF6B35 0%,#FF3B30 40%,#5856D6 100%)';
  else                grad='linear-gradient(160deg,#1C1C2E 0%,#16213E 50%,#0F3460 100%)';
  const sp=document.getElementById('splash');
  if(sp) sp.style.setProperty('background',grad,'important');
}

// Anima un número contando desde 0
function _animateCount(el, target, duration){
  if(!el) return;
  if(target === 0){ el.textContent = '0'; el.classList.remove('popped'); void el.offsetWidth; el.classList.add('popped'); return; }
  const start = Date.now();
  const from = 0;
  function tick(){
    const p = Math.min(1, (Date.now()-start)/duration);
    const ease = 1 - Math.pow(1-p, 3);
    el.textContent = Math.round(from + (target-from)*ease);
    if(p < 1) requestAnimationFrame(tick);
    else { el.textContent = target; el.classList.remove('popped'); void el.offsetWidth; el.classList.add('popped'); }
  }
  requestAnimationFrame(tick);
}
// Anima una barra mini
function _animateBar(id, pct, delay){
  setTimeout(function(){
    const el = document.getElementById(id);
    if(el) el.style.width = Math.min(100, pct)+'%';
  }, delay||0);
}
// Actualiza stats del splash con animaciones
function _renderSplashStats(animate){
  const total = boxes.reduce((s,b)=>s+b.items.length, 0);
  const favs  = boxes.filter(b=>b.fav).length;
  const nBoxes = boxes.length;
  if(animate){
    _animateCount(document.getElementById('sp-c'), nBoxes, 600);
    _animateCount(document.getElementById('sp-o'), total,  750);
    _animateCount(document.getElementById('sp-f'), favs,   650);
    // Barras: relativas al máximo entre los tres valores
    const mx = Math.max(nBoxes, total, favs, 1);
    _animateBar('sp-bar-c', (nBoxes/mx)*100, 300);
    _animateBar('sp-bar-o', (total /mx)*100, 380);
    _animateBar('sp-bar-f', (favs  /mx)*100, 460);
  } else {
    document.getElementById('sp-c').textContent = nBoxes;
    document.getElementById('sp-o').textContent = total;
    document.getElementById('sp-f').textContent = favs;
  }
}
// Actualiza solo los contadores del splash sin redibujar toda la pantalla
function updateSplashCounters(){
  if(!document.getElementById('sp-c')) return;
  _renderSplashStats(false);
}

// ── Reloj local ──────────────────────────────────────────────────────────
var _clockInterval = null;
function _tickClock(){
  var now = new Date();
  var h = now.getHours().toString().padStart(2,'0');
  var m = now.getMinutes().toString().padStart(2,'0');
  var timeStr = h + ':' + m;
  // Actualizar reloj del splash
  var timeEl = document.getElementById('spClockTime');
  if(timeEl) timeEl.textContent = timeStr;
  // Actualizar reloj del topbar de main (siempre, esté visible o no)
  var mainClockEl = document.getElementById('mainClockTime');
  if(mainClockEl) mainClockEl.textContent = timeStr;
  // Zona horaria corta (ej: "PET", "CST", "GMT+5")
  var zoneEl = document.getElementById('spClockZone');
  if(zoneEl){
    try{
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      // Extraer la parte corta de la zona (ej: "America/Lima" → "Lima")
      var short = tz.split('/').pop().replace(/_/g,' ');
      // También mostrar el offset
      var off = -now.getTimezoneOffset();
      var sign = off >= 0 ? '+' : '-';
      var offH = Math.abs(Math.floor(off/60));
      var offM = Math.abs(off%60);
      var offsetStr = 'GMT'+sign+offH+(offM?':'+offM.toString().padStart(2,'0'):'');
      zoneEl.textContent = short + ' ' + offsetStr;
    } catch(e){
      zoneEl.textContent = '';
    }
  }
}
function _startClock(){
  _tickClock();
  if(_clockInterval) clearInterval(_clockInterval);
  _clockInterval = setInterval(_tickClock, 1000);
}
function _stopClock(){
  if(_clockInterval){ clearInterval(_clockInterval); _clockInterval = null; }
}

function showSplash(){
  showScreen('splash');
  document.body.style.overflow='hidden';
  document.body.style.height='100vh';
  applySplashGradient();
  const _fab=document.getElementById('aiFab');if(_fab){_fab.style.display='flex';_fab.style.opacity='1';}
  const brand=settings.brand;const be=document.getElementById('splashBrand');
  if(brand){be.textContent='de '+brand;be.style.display='block';}else be.style.display='none';
  _startClock();
  setTimeout(function(){ _renderSplashStats(true); }, 120);
}
function goSplash(){showSplash();}
