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
