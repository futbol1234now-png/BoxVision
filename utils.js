/* BoxVision — Utilidades globales, constantes y helpers */

/* BoxVision — JavaScript principal */

// Sync PIN dots on pw modal input
function syncPwDots(val){
  for(var i=0;i<4;i++){
    var d=document.getElementById('pwd'+i);
    if(d) d.classList.toggle('filled', i < val.length);
  }
}

const COLORS=["#FF3B30","#FF9500","#FFCC00","#34C759","#00C7BE","#007AFF","#5856D6","#AF52DE","#FF2D55","#636366"];
const PRI={red:"🔴",yellow:"🟡",green:"🟢"};
let boxes=[],rooms=[],settings={brand:""},dark=0;
let currentBoxId=null,editingBoxId=null,formMode="new";
let currentTags=[],selectedColor=COLORS[5],selectedPri="yellow";
let torchStream=null,torchOn=false,speaking=false,deferredInstall=null;

// loadAll: versión completa para modo sin Firebase
function loadAll(){
  try{
    const uid=currentUser?.uid;
    const key=uid?"cb-boxes-"+uid:"cb-boxes";
    boxes=JSON.parse(localStorage.getItem(key)||"[]");
    restoreThumbs && restoreThumbs();
  }catch(e){boxes=[];}
  try{
    const rk=currentUser?"cb-rooms-"+currentUser.uid:"cb-rooms";
    rooms=JSON.parse(localStorage.getItem(rk)||"[]");
  }catch(e){rooms=[];}
  loadSettingsOnly();
}

// loadSettingsOnly: solo carga settings y dark — NO toca boxes ni rooms
function loadSettingsOnly(){
  try{settings=JSON.parse(localStorage.getItem("cb-settings")||'{"brand":""}');}catch(e){settings={brand:""};}
  dark=localStorage.getItem("cb-dark")==="0"?0:1;
  document.body.setAttribute("data-dark",dark?"1":"");
  applyDark();
}
window.loadSettingsOnly = loadSettingsOnly;
function saveData(){
  // Actualizar timestamp de modificación en la caja activa (si hay una abierta)
  if(currentBoxId){
    const _b=boxes.find(b=>b.id===currentBoxId);
    if(_b) _b.lastModified=Date.now();
  }
  scheduleSave();
}
// FIX A: ID único — Date.now() en base36 + 4 chars aleatorios evita colisiones en doble-tap
function genId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
// FIX #3: hash simple para evitar colisiones de keys de thumbs con prefijos iguales
function _thumbKey(boxId, itemText){
  let h=5381;for(let i=0;i<itemText.length;i++) h=(h*33^itemText.charCodeAt(i))>>>0;
  return "cb-thumb-"+boxId+"-"+h.toString(36);
}
function saveRooms(){
  const key=currentUser?"cb-rooms-"+currentUser.uid:"cb-rooms";
  localStorage.setItem(key,JSON.stringify(rooms));
  // Solo subir a Firestore si no estamos en plena carga inicial
  if(currentUser && db && !(typeof _firestoreLoading!=="undefined" && _firestoreLoading)){
    db.collection("users").doc(currentUser.uid).set({rooms:rooms},{merge:true})
      .catch(e=>console.warn("saveRooms Firestore error:",e));
  }
}
function saveSettings(){localStorage.setItem("cb-settings",JSON.stringify(settings));}
function applyDark(){
  document.body.setAttribute("data-dark",dark?"1":"");
  const t=document.getElementById("darkToggleWrap");
  if(t){t.classList.toggle("on",!!dark);}
  const dkb=document.getElementById("darkBtn");
  if(dkb) dkb.innerHTML=dark
    ?'<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5" aria-hidden="true"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg></i>'
    :'<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" aria-hidden="true"/></svg></i>';
}

function toggleSortMenu(){
  const m=document.getElementById("sortMenu"); if(!m) return;
  m.classList.toggle("hidden");
  const isOpen=!m.classList.contains("hidden");
  const btn=document.getElementById("sortBtn");
  if(btn){
    btn.style.background=isOpen?"linear-gradient(135deg,#0A84FF,#5E5CE6)":"";
    btn.style.border=isOpen?"none":"";
    btn.style.color=isOpen?"#fff":"";
  }
}

function setSort(s){
  activeSort=s;
  document.querySelectorAll("[id^='sort-']").forEach(b=>b.classList.remove("active"));
  const el=document.getElementById("sort-"+s); if(el) el.classList.add("active");
  renderGrid();
}

function sortBoxes(arr){
  const priOrder={red:0,yellow:1,green:2};
  switch(activeSort){
    case "priority": return [...arr].sort((a,b)=>(priOrder[a.priority||"yellow"]||1)-(priOrder[b.priority||"yellow"]||1));
    case "location": return [...arr].sort((a,b)=>(a.location||"zzz").localeCompare(b.location||"zzz"));
    case "date": return [...arr].sort((a,b)=>(b.lastUsed||0)-(a.lastUsed||0));
    case "name": return [...arr].sort((a,b)=>a.name.localeCompare(b.name));
    case "count": return [...arr].sort((a,b)=>b.items.length-a.items.length);
    default: return arr;
  }
}



// ── Variables globales de módulos tardíos ──
// Declaradas aquí para que estén disponibles desde el inicio
let voiceRecog = null;
let _viewerItems = [];
let _noteTimer = null;
let aiOpen = false;
let aiHistory = [];
let aiStreaming = false;

// ── Variables de rooms.js ──
var ROOM_EMOJIS = ['🛏','🛋','🍳','🚿','📚','🚗','🌿','🏋','💼','👶','🎮','🎨','🧺','🔧','🍽','🪴','🛠','📦','🎵','🌟'];
var ROOM_COLORS = ['#0A84FF','#5856D6','#34C759','#FF9500','#FF3B30','#AF52DE','#FF2D55','#30B0C7','#FF6B35','#00C7BE'];
var _roomModalMode   = null;
var _roomModalId     = null;
var _roomModalEmoji  = '🏠';
var _roomDetailId    = null;

// ── Variables de tutorial.js ──
var tutStep = 0;
var TUT_TOTAL = 7;

// ── Variables de feedback.js ──
var _feedbackCat = 'bug';

// ── Variables de i18n.js ──
var _currentLang = localStorage.getItem('cb-lang') || 'es';

// ── Variables de ai-chat.js ──
var AI_INTRO = "¡Hola! 👋 Soy <b>Box IA</b>, tu asistente inteligente de mudanzas.<br><br>Puedo buscar objetos en tus cajas, analizar tu progreso, darte recomendaciones para organizar mejor, y responder cualquier pregunta sobre tu mudanza. ¿En qué te ayudo?";


// ════ Funciones helper movidas aquí para carga temprana ════

// ── hexToRgba (movida a utils para carga temprana) ──
function hexToRgba(hex, alpha){
  if(!hex||!hex.startsWith('#')) return hex||'#007AFF';
  const h=hex.replace('#','');
  const r=parseInt(h.length===3?h[0]+h[0]:h.slice(0,2),16);
  const g=parseInt(h.length===3?h[1]+h[1]:h.slice(2,4),16);
  const b=parseInt(h.length===3?h[2]+h[2]:h.slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── toggleFavId (movida a utils para carga temprana) ──
function toggleFavId(id){const box=boxes.find(b=>b.id===id);if(box){box.fav=!box.fav;saveData();renderGrid();}}

// ── showToast (movida a utils para carga temprana) ──
function showToast(msg, color){
  const t=document.createElement("div");
  t.style.cssText=`position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:${color||"#1C1C1E"};color:#fff;padding:13px 22px;border-radius:16px;font-size:14px;font-weight:600;z-index:9999;max-width:300px;width:max-content;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.35),0 1px 0 rgba(255,255,255,.1) inset;animation:toastSpring .4s var(--ease-spring,cubic-bezier(.175,.885,.32,1.275)) both;letter-spacing:-.1px;backdrop-filter:blur(16px)`;
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity="0";t.style.transition="opacity .3s";setTimeout(()=>t.remove(),300);},3500);
}

const ANIMO_MSGS=["¡Uno menos! 💪","¡Vas genial! 🚀","¡Qué crack! ✨","¡Sigue así! 🔥","¡Casi! 🎯","¡Imparable! ⚡","¡Boom! 💥","¡Eso es! 👊","¡Top! 🏆","¡La rompes! 🎸"];

// ── showToastUndo (movida a utils para carga temprana) ──
function showToastUndo(msg, onUndo){
  // Eliminar toast anterior si existe
  document.getElementById("toastUndo")?.remove();
  const t=document.createElement("div");
  t.id="toastUndo";
  t.style.cssText=`position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#1C1C1E;color:#fff;padding:12px 8px 12px 18px;border-radius:16px;font-size:14px;font-weight:600;z-index:9999;max-width:320px;width:max-content;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,.35),0 1px 0 rgba(255,255,255,.1) inset;animation:toastSpring .4s cubic-bezier(.175,.885,.32,1.275) both;backdrop-filter:blur(16px)`;
  const span=document.createElement("span");span.textContent=msg;
  const btn=document.createElement("button");
  btn.textContent="Deshacer";
  btn.style.cssText="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:10px;padding:6px 12px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit;flex-shrink:0";
  let undone=false;
  btn.onclick=()=>{if(!undone){undone=true;onUndo();t.remove();}};
  t.appendChild(span);t.appendChild(btn);
  document.body.appendChild(t);
  const timer=setTimeout(()=>{t.style.opacity="0";t.style.transition="opacity .3s";setTimeout(()=>t.remove(),300);},4000);
  btn.addEventListener("click",()=>clearTimeout(timer));
}

// ── animoToast (movida a utils para carga temprana) ──
function animoToast(){const m=ANIMO_MSGS[Math.floor(Math.random()*ANIMO_MSGS.length)];showToast(m,"#34C759");}

// ── renderGlobalProgress (movida a utils para carga temprana) ──
function renderGlobalProgress(){
  let el=document.getElementById("globalProgressBar");
  const totalObj=boxes.reduce((s,b)=>s+b.items.length,0);
  const doneObj=boxes.reduce((s,b)=>s+b.items.filter(i=>i.done).length,0);
  if(!totalObj){if(el)el.remove();return;}
  const pct=Math.round(doneObj/totalObj*100);
  if(!el){
    el=document.createElement("div");el.id="globalProgressBar";
    el.style.cssText="position:sticky;top:57px;z-index:99;padding:7px 14px 5px;background:var(--bg)";
    // Insertar justo antes del search-wrap
    const sw=document.querySelector(".search-wrap");
    if(sw) sw.parentNode.insertBefore(el,sw);
  }
  el.innerHTML=`<div style="display:flex;align-items:center;gap:9px">
    <div style="flex:1;height:5px;background:var(--border);border-radius:99px;overflow:hidden">
      <div style="height:100%;width:${pct}%;background:${pct>=100?"#34C759":pct>=60?"#0A84FF":"#FF9500"};border-radius:99px;transition:width .5s cubic-bezier(.4,0,.2,1)"></div>
    </div>
    <span style="font-size:11px;font-weight:700;color:var(--muted);white-space:nowrap;letter-spacing:.2px">${doneObj}/${totalObj} sacados · ${pct}%</span>
  </div>`;
}

// ── t() traducción (movida a utils) ──
function t(key, ...args){
  const dict = I18N[_currentLang] || I18N['es'];
  const val = dict[key] ?? (I18N['es'][key] ?? key);
  return typeof val === 'function' ? val(...args) : val;
}
