/* BoxVision — JavaScript principal */

const COLORS=["#FF3B30","#FF9500","#FFCC00","#34C759","#00C7BE","#007AFF","#5856D6","#AF52DE","#FF2D55","#636366"];
const PRI={red:"🔴",yellow:"🟡",green:"🟢"};
let boxes=[],rooms=[],settings={brand:""},dark=0;
let currentBoxId=null,editingBoxId=null,formMode="new";
let currentTags=[],selectedColor=COLORS[5],selectedPri="yellow";
let torchStream=null,torchOn=false,speaking=false,deferredInstall=null;

function loadAll(){
  try{
    const uid=currentUser?.uid;
    const key=uid?"cb-boxes-"+uid:"cb-boxes";
    boxes=JSON.parse(localStorage.getItem(key)||"[]");
    // Restaurar thumbs
    boxes.forEach(b=>{
      b.items.forEach(it=>{
        if(!it.thumb){
          const k="cb-thumb-"+b.id+"-"+encodeURIComponent(it.text.slice(0,20));
          const t=localStorage.getItem(k);
          if(t) it.thumb=t;
        }
      });
    });
  }catch(e){boxes=[];}
  try{rooms=JSON.parse(localStorage.getItem("cb-rooms")||"[]");}catch(e){rooms=[];}
  try{settings=JSON.parse(localStorage.getItem("cb-settings")||'{"brand":""}');}catch(e){settings={brand:""};}
  dark=localStorage.getItem("cb-dark")==="0"?0:1;
  document.body.setAttribute("data-dark",dark?"1":"");
  applyDark();
}
function saveData(){
  try{
    const boxesLean = boxes.map(b=>{
      const bc = JSON.parse(JSON.stringify(b));
      bc.items = b.items.map(it=>({text:it.text, done:it.done}));
      return bc;
    });
    // Cache local
    if(currentUser) localStorage.setItem("cb-boxes-"+currentUser.uid, JSON.stringify(boxesLean));
    else localStorage.setItem("cb-boxes", JSON.stringify(boxesLean));
    // Guardar thumbs aparte
    boxes.forEach(b=>{
      b.items.forEach(it=>{
        if(it.thumb){
          const k="cb-thumb-"+b.id+"-"+encodeURIComponent(it.text.slice(0,20));
          try{localStorage.setItem(k,it.thumb);}catch(e){}
        }
      });
    });
    // Sync a Firestore (con debounce)
    if(typeof scheduleSave==="function") scheduleSave();
    let used=0;
    for(let k in localStorage) if(localStorage.hasOwnProperty(k)) used+=localStorage[k].length*2;
    if(used>4*1024*1024 && !window._storageWarnShown){
      window._storageWarnShown=true;
      setTimeout(()=>showToast("⚠️ Casi sin espacio — considera eliminar fotos","#FF9500"),300);
    }
  }catch(e){
    if(e.name==="QuotaExceededError"){
      showToast("❌ Sin espacio disponible — elimina fotos para poder guardar","#FF3B30");
    }
  }
}
function saveRooms(){localStorage.setItem("cb-rooms",JSON.stringify(rooms));}
function saveSettings(){localStorage.setItem("cb-settings",JSON.stringify(settings));}
function applyDark(){
  document.body.setAttribute("data-dark",dark?"1":"");
  const t=document.getElementById("darkToggleWrap");
  if(t){t.classList.toggle("on",!!dark);}
  const dkb=document.getElementById("darkBtn");
  if(dkb)dkb.textContent=dark?"☀️":"🌙";
}

function toggleSortMenu(){
  const m=document.getElementById("sortMenu"); if(!m) return;
  m.classList.toggle("hidden");
  const isOpen=!m.classList.contains("hidden");
  const btn=document.getElementById("sortBtn");
  if(btn){btn.style.background=isOpen?"var(--accent)":"var(--input)";btn.style.color=isOpen?"#fff":"var(--text)";}
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


const SUGGESTIONS_MAP = {
  camisa:["pantalón","cinturón","zapatos","corbata","calcetines","traje"],
  pantalon:["camisa","cinturón","zapatos","calcetines","polo"],
  zapato:["medias","calcetines","plantillas","cordones"],
  zapatilla:["medias","calcetines","ropa deportiva"],
  ropa:["percha","bolsa de ropa","cinta"],
  libro:["cuaderno","lapicero","marcador","regla"],
  plato:["vaso","cubierto","olla","sartén","taza","bowl"],
  olla:["sartén","tapa","cuchara","espátula","plato"],
  computadora:["cargador","mouse","teclado","audífonos","cable HDMI"],
  laptop:["cargador","mouse","pad mouse","audífonos","mochila"],
  celular:["cargador","cable","audífonos","case","protector"],
  tv:["control remoto","cable HDMI","soporte","cable de poder"],
  shampoo:["acondicionador","jabón","crema","esponja","toalla"],
  toalla:["jabón","shampoo","acondicionador"],
  cuchillo:["tenedor","cuchara","plato","tabla de cortar"],
  medicamento:["receta","termómetro","vendas","alcohol"],
  juguete:["pilas","cargador","manual","accesorios"],
  documento:["folder","archivador","lapicero","post-it"],
  foto:["álbum","marco","sobre"],
  silla:["mesa","cojín","tornillos"],
  cama:["sábanas","almohada","frazada","colchón"],
  almohada:["frazada","sábanas","cama"],
  colchon:["sábanas","almohada","frazada","cama"],
};

function showSuggestions(val){
  const wrap=document.getElementById("suggestionsWrap"); if(!wrap) return;
  const box=boxes.find(b=>b.id===currentBoxId);
  if(!val||!val.trim()||(box&&box.sealed)||!currentBoxId){wrap.classList.remove("show");return;}
  const q=val.toLowerCase().trim();
  // Find matching suggestions
  let sugs=[];
  for(const[key,vals] of Object.entries(SUGGESTIONS_MAP)){
    if(q.includes(key)||key.includes(q)){
      sugs=[...sugs,...vals];
    }
  }
  // Remove already added items
  const existing=new Set((box?.items||[]).map(i=>i.text.toLowerCase()));
  sugs=[...new Set(sugs)].filter(s=>!existing.has(s.toLowerCase())).slice(0,5);
  if(!sugs.length){wrap.classList.remove("show");return;}
  wrap.classList.add("show");
  wrap.innerHTML='<span class="sug-label">💡</span>'+
    sugs.map(s=>`<button class="sug-chip" onclick="addSuggestion('${s}')">${s}</button>`).join("");
}

function addSuggestion(text){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  box.items.push({text,done:false});
  addHistory(box,"Agregado: "+text);
  saveData();renderItems();renderProgress();generateQR(currentBoxId);
  showToast("➕ "+text+" agregado","#007AFF");
  // re-show suggestions
  const inp=document.getElementById("addItemInput");
  if(inp) showSuggestions(inp.value);
}

function toggleDark(){dark=dark?0:1;localStorage.setItem("cb-dark",dark?"1":"0");applyDark();}
function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function rgba(h,a){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return `rgba(${r},${g},${b},${a})`;}
function fmtDate(){return new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"short",year:"numeric"});}
function getIcon(n){
  n=(n||"").toLowerCase();
  const m=[
    [["adidas","nike","puma","ropa","camisa","camiseta","polo","chompa","casaca","abrigo","chaqueta","vestido","falda","blusa","pantalon","jean","short","pijama","boxer","toalla","sabana","tela"],"👕"],
    [["zapato","zapatilla","tenis","bota","sandalia","calzado","crocs","pantufla"],"👟"],
    [["libro","cuaderno","revista","comic","manga","novela","texto"],"📚"],
    [["juguete","lego","muñeca","peluche","juego","xbox","playstation","nintendo","videojuego"],"🧸"],
    [["cocina","olla","sarten","plato","vaso","taza","cubierto","cuchillo","tenedor","cuchara","bowl","tupper","licuadora","cafetera"],"🍳"],
    [["electronico","cable","cargador","celular","telefono","laptop","computadora","tablet","auricular","audifonos","parlante","camara","control"],"📱"],
    [["herramienta","martillo","destornillador","llave","taladro","clavo","tornillo","pintura","pincel","brocha"],"🔧"],
    [["deporte","pelota","balon","guante","casco","bicicleta","pesa","mancuerna","yoga"],"⚽"],
    [["documento","papel","factura","contrato","carpeta","archivo"],"📄"],
    [["medicamento","medicina","pastilla","farmacia","botiquin","salud"],"💊"],
    [["bano","shampoo","jabon","crema","perfume","desodorante","maquillaje","labial"],"🧴"],
    [["bebe","nene","niño","niña","pañal","biberon"],"🍼"],
    [["mascota","perro","gato","collar","correa"],"🐾"],
    [["joya","anillo","aretes","pulsera","reloj"],"💍"],
    [["bolso","cartera","mochila","maleta","bolsa","maletin"],"👜"],
    [["navidad","año nuevo","fiesta","cumpleaños","regalo"],"🎁"],
    [["arte","pintura","dibujo","lienzo"],"🎨"],
    [["musica","guitarra","piano","instrumento"],"🎸"],
  ];
  for(const[k,e] of m) if(k.some(w=>n.includes(w))) return e;
  return "📦";
}
function addHistory(box,text){if(!box.history)box.history=[];box.history.unshift({text,date:new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"short"})});if(box.history.length>20)box.history.pop();}

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
  loadAll();setupPWA();initTutorial();showSplash();
}

function showScreen(id){
  // Stop TTS if leaving viewer
  if(id!=="viewer"&&window.speechSynthesis&&speaking){
    window.speechSynthesis.cancel();speaking=false;
    const tb=document.getElementById("ttsBtn");if(tb) tb.classList.remove("on");
  }
  // Cancel voice recognition if active
  if(voiceRecog){try{voiceRecog.abort();}catch(e){}voiceRecog=null;
    const mb=document.getElementById("micBtn");if(mb){mb.textContent="🎤";mb.style.animation="";}
  }
  document.querySelectorAll("#splash,#mainScreen,#detailScreen,#roomScreen,#settingsScreen,#viewer").forEach(el=>{
    el.classList.add("hidden");el.classList.remove("active");el.style.display="";
  });
  const el=document.getElementById(id);
  if(el){el.classList.remove("hidden");el.classList.add("active");el.style.display="block";}
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

function showSplash(){
  showScreen("splash");
  applySplashGradient();
  const _fab=document.getElementById("aiFab");if(_fab) _fab.classList.remove("hidden");
  const total=boxes.reduce((s,b)=>s+b.items.length,0);
  document.getElementById("sp-c").textContent=boxes.length;
  document.getElementById("sp-o").textContent=total;
  document.getElementById("sp-f").textContent=boxes.filter(b=>b.fav).length;
  const brand=settings.brand;const be=document.getElementById("splashBrand");
  if(brand){be.textContent="de "+brand;be.style.display="block";}else be.style.display="none";
  const last=boxes.slice().sort((a,b)=>(b.lastUsed||0)-(a.lastUsed||0))[0];
  if(last){document.getElementById("spLast").style.display="block";document.getElementById("spLastIcon").textContent=getIcon(last.name);document.getElementById("spLastName").textContent=last.name;document.getElementById("spLastSub").textContent=last.items.length+" objeto"+(last.items.length!==1?"s":"")+(last.location?" · "+last.location:"");}
}
function goSplash(){showSplash();}

let activeFilter="todo"; let activeSort="default";
function goMain(){showScreen("mainScreen");renderMain();const f=document.getElementById("aiFab");if(f){f.classList.remove("hidden");}}
function renderMain(){
  const total=boxes.reduce((s,b)=>s+b.items.length,0);
  document.getElementById("mainSub").textContent=boxes.length+" caja"+(boxes.length!==1?"s":"")+" · "+total+" objetos";
  renderFilters();renderGrid();
}
function renderFilters(){
  const tags=new Set();boxes.forEach(b=>(b.tags||[]).forEach(t=>tags.add(t)));
  document.getElementById("filterRow").innerHTML=
    `<button class="pill${activeFilter==="todo"?" active":""}" onclick="setFilter('todo')">Todas</button>`+
    `<button class="pill${activeFilter==="fav"?" active":""}" onclick="setFilter('fav')">⭐ Favoritas</button>`+
    `<button class="pill${activeFilter==="red"?" active":""}" onclick="setFilter('red')">🔴 Urgentes</button>`+
    [...tags].map(t=>`<button class="pill${activeFilter===t?" active":""}" onclick="setFilter('${esc(t)}')">${esc(t)}</button>`).join("");
}
function setFilter(f){activeFilter=f;renderMain();}
function renderGrid(){
  let filtered=boxes;
  if(activeFilter==="fav") filtered=boxes.filter(b=>b.fav);
  else if(activeFilter==="red") filtered=boxes.filter(b=>b.priority==="red");
  else if(activeFilter!=="todo") filtered=boxes.filter(b=>(b.tags||[]).includes(activeFilter));
  filtered=sortBoxes(filtered);
  const favs=filtered.filter(b=>b.fav),rest=filtered.filter(b=>!b.fav);
  let html="";
  if(favs.length) html+=`<div class="sec-hdr">⭐ Favoritas</div><div class="boxes-grid">${favs.map(boxCard).join("")}</div>`;
  if(rest.length){if(favs.length)html+=`<div class="sec-hdr">Todas</div>`;html+=`<div class="boxes-grid">${rest.map(boxCard).join("")}</div>`;}
  if(!filtered.length) html=boxes.length===0
    ?`<div style="text-align:center;padding:80px 24px">
        <div style="font-size:56px;margin-bottom:16px">📦</div>
        <div style="font-size:20px;font-weight:700;color:var(--text);margin-bottom:8px">No tienes cajas aún</div>
        <div style="font-size:14px;color:var(--muted);margin-bottom:28px;line-height:1.6">Toca el botón <strong style="color:var(--accent)">+</strong> arriba para crear tu primera caja</div>
        <button onclick="openForm()" style="background:linear-gradient(135deg,var(--accent),#5856D6);color:#fff;border:none;border-radius:14px;padding:14px 28px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 20px rgba(10,132,255,0.3)">+ Crear primera caja</button>
      </div>`
    :`<div style="text-align:center;padding:60px 20px"><div style="font-size:40px;margin-bottom:12px">🔍</div><div style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:4px">Sin resultados</div><div style="font-size:13px;color:var(--muted)">No hay cajas con este filtro</div></div>`;
  document.getElementById("mainScroll").innerHTML=html;
}
function boxCard(b){
  const col=b.color||"#007AFF";
  const done=b.items.filter(i=>i.done).length,total=b.items.length,pct=total?Math.round(done/total*100):0;
  const tags=(b.tags||[]).slice(0,2).map(t=>`<span class="bc-tag">${esc(t)}</span>`).join("");
  const cardBg = b.photo
    ? `url(${b.photo}) center/cover, linear-gradient(135deg,${col},${rgba(col,.65)})`
    : `linear-gradient(135deg,${col},${rgba(col,.65)})`;
  const hasPhoto = !!b.photo;
  return `<div class="box-card" style="background:${cardBg}" onclick="openDetail('${b.id}')">
    ${hasPhoto?`<div style="position:absolute;inset:0;background:linear-gradient(160deg,${rgba(col,.8)},${rgba(col,.5)});z-index:0"></div>`:''}
    <div class="bc-inner">
      <div class="bc-top">
        <button class="bc-fav" onclick="event.stopPropagation();toggleFavId('${b.id}')">${b.fav?"⭐":"☆"}</button>
        <div class="bc-badges">
          ${b.priority==="red"?'<span style="font-size:11px">🔴</span>':""}
          ${b.sealed?'<span style="font-size:11px">🔒</span>':""}
          ${b.password?'<span style="font-size:11px">🔐</span>':""}
          ${b.number?`<span class="bc-num">#${esc(b.number)}</span>`:""}
        </div>
      </div>
      <span class="bc-icon">${getIcon(b.name)}</span>
      <div class="bc-name">${esc(b.name)}</div>
      <div class="bc-sub">${total} objeto${total!==1?"s":""}${done?" · "+done+" sacado"+(done!==1?"s":""):""}${b.location?" · 📍"+esc(b.location):""}</div>
      ${total>0?`<div class="bc-progress"><div class="bc-progress-fill" style="width:${pct}%"></div></div>`:""}
      ${tags?`<div class="bc-tags">${tags}</div>`:""}
      <button class="cube-open-btn" onclick="event.stopPropagation();openCube('${b.id}')">📦 3D</button>
    </div>
  </div>`;
}

function openDetail(id){
  const box=boxes.find(b=>b.id===id);if(!box) return;
  if(box.password){
    const ov=document.getElementById("pwOverlay");
    document.getElementById("pwBoxName").textContent=box.name;
    document.getElementById("pwInput").value="";
    ov.style.display="flex";
    window._pwTargetId=id;
    setTimeout(()=>document.getElementById("pwInput").focus(),120);
    return;
  }
  _doOpenDetail(id);
}
function closePwModal(){document.getElementById("pwOverlay").style.display="none";window._pwTargetId=null;}
function submitPw(){
  const id=window._pwTargetId;const box=boxes.find(b=>b.id===id);if(!box) return;
  const entered=document.getElementById("pwInput").value;
  if(entered===box.password){
    document.getElementById("pwOverlay").style.display="none";
    _doOpenDetail(id);
  }else{
    document.getElementById("pwInput").value="";
    document.getElementById("pwInput").style.animation="none";
    requestAnimationFrame(()=>{document.getElementById("pwInput").style.animation="pwShake .35s ease";});
    showToast("❌ Contraseña incorrecta","#FF3B30");
  }
}
function _doOpenDetail(id){
  const box=boxes.find(b=>b.id===id);if(!box) return;
  currentBoxId=id;box.lastUsed=Date.now();saveData();
  showScreen("detailScreen");
  document.getElementById("detailScreen").style.animation="slideUpScreen var(--dur-slow,420ms) var(--ease-out-expo,cubic-bezier(0.16,1,0.3,1)) both";
  const col=box.color||"#007AFF";
  document.getElementById("dHero").style.background=`linear-gradient(135deg,${col},${rgba(col,.6)})`;
  const hi=document.getElementById("dHeroImg");
  if(box.photo){hi.src=box.photo;hi.classList.remove("hidden");}else hi.classList.add("hidden");
  document.getElementById("dIcon").textContent=getIcon(box.name);
  document.getElementById("dNum").textContent=box.number?`Caja #${box.number} ${PRI[box.priority]||""}`:PRI[box.priority]||"";
  document.getElementById("dName").textContent=box.name;
  document.getElementById("favBtn").textContent=box.fav?"⭐":"☆";
  const sb=document.getElementById("sealBtn"); if(sb) sb.textContent=box.sealed?"🔒":"🔓";
  const meta=[];
  if(box.location) meta.push("📍 "+box.location);
  if(box.weight) meta.push("⚖️ "+box.weight+"kg");
  if(box.date) meta.push("📅 "+box.date);
  (box.tags||[]).forEach(t=>meta.push(t));
  document.getElementById("dMeta").innerHTML=meta.map(m=>`<span class="dh-tag">${esc(m)}</span>`).join("");
  document.getElementById("noteArea").value=box.note||"";
  document.getElementById("detailDate").textContent="Creada el "+(box.date||"—");
  renderProgress();renderItems();renderPhotoArea();renderRelated();renderHistory();generateQR(id);
}

function renderProgress(){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  const done=box.items.filter(i=>i.done).length,total=box.items.length,pct=total?Math.round(done/total*100):0;
  const col=box.color||"#007AFF";
  document.getElementById("progSec").style.display=total?"block":"none";
  document.getElementById("progFill").style.cssText=`width:${pct}%;background:${col}`;
  document.getElementById("progLbl").textContent=done+" sacado"+(done!==1?"s":"")+" de "+total;
  document.getElementById("progPct").textContent=pct+"%";
}

function renderItems(){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  const col=box.color||"#007AFF",done=box.items.filter(i=>i.done).length;
  document.getElementById("itemsTitle").textContent=`CONTENIDO (${box.items.length} obj · ${done} sacado${done!==1?"s":""})`;
  const addRow=document.getElementById("addRow");const sealMsg=document.getElementById("sealedMsg");
  if(addRow) addRow.style.display=box.sealed?"none":"flex";
  if(sealMsg) sealMsg.classList.toggle("hidden",!box.sealed);
  document.getElementById("itemsList").innerHTML=box.items.length===0
    ?funnyEmpty()
    :box.items.map((it,i)=>`<div class="item-row">${it.thumb?`<img src="${it.thumb}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;flex-shrink:0;margin-right:2px;opacity:${it.done?0.4:1}" loading="lazy">`:""}<div class="i-chk${it.done?" done":""}" style="${it.done?"background:"+col:""}" onclick="toggleItem(${i})">${it.done?"✓":""}</div><div class="i-txt${it.done?" done":""}">${esc(it.text)}</div><button class="i-del" onclick="delItem(${i})">✕</button></div>`).join("");
}

function toggleItem(idx){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  box.items[idx].done=!box.items[idx].done;
  addHistory(box,(box.items[idx].done?"Sacado":"Devuelto")+": "+box.items[idx].text);
  saveData();renderItems();renderProgress();renderHistory();generateQR(currentBoxId);
  if(box.items[idx].done) animoToast();
  if(box.items.length>0&&box.items.every(i=>i.done)) setTimeout(launchConfetti,200);
}
function addItem(){
  const inp=document.getElementById("addItemInput"),val=inp.value.trim();if(!val) return;
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  if(box.sealed){showToast("🔒 Esta caja está sellada","#FF9500");return;}
  box.items.push({text:val,done:false});addHistory(box,"Agregado: "+val);
  inp.value="";
  const sw=document.getElementById("suggestionsWrap");if(sw) sw.classList.remove("show");
  saveData();renderItems();renderProgress();renderHistory();generateQR(currentBoxId);
}
function delItem(idx){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  if(box.sealed){showToast("🔒 Esta caja está sellada","#FF9500");return;}
  addHistory(box,"Eliminado: "+box.items[idx].text);
  box.items.splice(idx,1);saveData();renderItems();renderProgress();renderHistory();generateQR(currentBoxId);
}
function triggerScanObj(){
  const box=boxes.find(b=>b.id===currentBoxId);
  if(box&&box.sealed){showToast("🔒 Caja sellada","#FF9500");return;}
  document.getElementById("scanObjInput").click();
}

async function handleScanObj(e){
  const file=e.target.files[0]; e.target.value=""; if(!file) return;
  const box=boxes.find(b=>b.id===currentBoxId); if(!box) return;
  const btn=document.getElementById("scanBtn");
  btn.textContent="⏳"; btn.disabled=true;

  let thumb=null, b64=null;
  try{
    const enc=await resizeAndEncode(file,900,96);
    thumb=enc.thumb; b64=enc.b64;
  }catch(err){
    showToast("❌ No se pudo leer la imagen","#FF3B30");
    btn.textContent="📷"; btn.disabled=false; return;
  }

  const connected=localStorage.getItem("boxia_connected");
  let analisis=null;

  if(connected){
    showScanLoadingModal(thumb);
    const itemsExistentes=box.items.map(i=>i.text).slice(0,15).join(", ")||"ninguno";
    const contexto=`Caja: "${box.name}"${box.number?" #"+box.number:""}. Ubicación: ${box.location||"sin asignar"}. Prioridad: ${box.priority==="red"?"urgente":box.priority==="green"?"baja":"normal"}. ${box.items.length>0?`Ya contiene ${box.items.length} objetos: ${itemsExistentes}.`:"Caja vacía."}`;

    const systemPrompt=`You are an expert inventory assistant for moving/packing. Analyze the image carefully.
Rules: respond ONLY with valid JSON, no markdown, no explanation. Use Spanish for all text. Be SPECIFIC: include color, size, brand if visible. Identify the most prominent object.
JSON: {"nombre":"specific name in Spanish (color/brand/size if visible)","categoria":"Electrónica|Ropa|Cocina|Libros|Herramientas|Decoración|Documentos|Juguetes|Deportes|Muebles|Higiene|Alimentos|Otro","cantidad":1,"fragil":false,"descripcion":"one line description","tags":["tag1","tag2"],"prioridad_sugerida":"red|yellow|green","nota":"packing tip or null"}
Context: ${contexto}`;

    const modelos=["llama-3.2-90b-vision-preview","llama-3.2-11b-vision-preview"];
    for(const modelo of modelos){
      try{
        const res=await fetch("https://broken-flower-327b.theincognit40.workers.dev/chat",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({model:modelo,max_tokens:400,temperature:0.05,
            messages:[
              {role:"system",content:systemPrompt},
              {role:"user",content:[
                {type:"image_url",image_url:{url:"data:image/jpeg;base64,"+b64,detail:"high"}},
                {type:"text",text:"Identify this object precisely. Respond with JSON only."}
              ]}
            ]})
        });
        const data=await res.json();
        if(res.ok && data.choices?.[0]?.message?.content){
          let raw=data.choices[0].message.content.trim();
          const jsonMatch=raw.match(/\{[\s\S]*\}/);
          if(jsonMatch) raw=jsonMatch[0];
          raw=raw.replace(/```json|```/g,"").trim();
          try{
            const p=JSON.parse(raw);
            if(p.nombre){
              analisis={
                nombre:(p.nombre||"Objeto").replace(/[*"]/g,"").slice(0,60),
                categoria:p.categoria||"Otro",
                cantidad:parseInt(p.cantidad)||1,
                fragil:p.fragil===true||String(p.fragil).toLowerCase()==="true",
                descripcion:p.descripcion||"",
                tags:Array.isArray(p.tags)?p.tags.filter(Boolean).slice(0,3):[],
                prioridad:["red","yellow","green"].includes(p.prioridad_sugerida)?p.prioridad_sugerida:null,
                nota:p.nota&&p.nota!=="null"?p.nota:null
              };
              break;
            }
          }catch{
            const m=raw.match(/"nombre"\s*:\s*"([^"]+)"/);
            if(m){analisis={nombre:m[1].slice(0,50),categoria:"Otro",cantidad:1,fragil:false,descripcion:"",tags:[],prioridad:null,nota:null};break;}
          }
        }
        if(analisis) break;
        console.warn("Modelo",modelo,"sin resultado:",data?.error?.message||"vacío");
      }catch(err){console.warn("Error",modelo,":",err.message);}
    }
    document.getElementById("scanLoadingModal")?.remove();
  }

  btn.textContent="📷"; btn.disabled=false;
  showScanResultModal(thumb, box, analisis);
}

function showScanLoadingModal(thumb){
  document.getElementById("scanLoadingModal")?.remove();
  const m=document.createElement("div");
  m.id="scanLoadingModal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10002;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(12px)";
  m.innerHTML=`<div style="background:var(--card,#1C1C1E);border-radius:22px;padding:28px 24px;width:min(300px,88vw);text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.6)"><img src="${thumb}" style="width:100px;height:100px;border-radius:16px;object-fit:cover;margin-bottom:16px;box-shadow:0 8px 24px rgba(0,0,0,.4)"/><div style="font-size:17px;font-weight:700;color:var(--text,#fff);margin-bottom:8px">Analizando objeto...</div><div style="font-size:13px;color:var(--muted,#8E8E93);margin-bottom:20px">Box IA identifica nombre, categoría<br>y características del objeto</div><div style="display:flex;justify-content:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:#0A84FF;animation:pulse 1.2s 0s infinite"></span><span style="width:8px;height:8px;border-radius:50%;background:#5856D6;animation:pulse 1.2s .2s infinite"></span><span style="width:8px;height:8px;border-radius:50%;background:#FF9500;animation:pulse 1.2s .4s infinite"></span></div></div>`;
  document.body.appendChild(m);
}

function showScanResultModal(thumb, box, a){
  document.getElementById("scanNameModal")?.remove();
  const m=document.createElement("div");
  m.id="scanNameModal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10001;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(12px)";
  const cc={"Electrónica":"#0A84FF","Ropa":"#FF2D55","Cocina":"#FF9500","Libros":"#34C759","Herramientas":"#FF6B00","Decoración":"#AF52DE","Documentos":"#FFD60A","Juguetes":"#FF375F","Deportes":"#30D158","Muebles":"#636366","Higiene":"#5AC8FA","Alimentos":"#FFD60A"};
  const catColor=cc[a?.categoria]||"#8E8E93";
  const fragilBadge=a?.fragil?`<span style="background:rgba(255,59,48,.15);color:#FF3B30;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:700">🫧 FRÁGIL</span>`:"";
  const cantBadge=a?.cantidad>1?`<span style="background:rgba(10,132,255,.15);color:#0A84FF;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:700">${a.cantidad}x</span>`:"";
  const catBadge=a?.categoria?`<span style="background:${catColor}22;color:${catColor};border-radius:8px;padding:3px 10px;font-size:11px;font-weight:700">${a.categoria}</span>`:"";
  const tags=a?.tags?.length?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${a.tags.map(t=>`<span style="background:rgba(255,255,255,.08);color:var(--muted,#8E8E93);border-radius:7px;padding:3px 9px;font-size:12px">#${esc(t)}</span>`).join("")}</div>`:"";
  const nota=a?.nota?`<div style="background:rgba(255,149,0,.1);border:1px solid rgba(255,149,0,.2);border-radius:10px;padding:10px 12px;margin-top:10px;font-size:12px;color:#FF9500">💡 ${esc(a.nota)}</div>`:"";
  const desc=a?.descripcion?`<div style="font-size:12px;color:var(--muted,#8E8E93);margin-top:4px">${esc(a.descripcion)}</div>`:"";
  const noIA=!a?`<div style="font-size:12px;color:#FF9500;margin-bottom:8px">📷 Foto guardada — escribe el nombre del objeto</div>`
    :(a.nombre?`<div style="font-size:12px;color:#34C759;margin-bottom:4px">✦ Box IA identificó el objeto</div>`:"");  const fragilBtn=a?.fragil&&box.priority!=="red"?`<button onclick="sugerirPrioridadFragil()" style="width:100%;margin-top:8px;padding:11px;border-radius:13px;border:1px solid rgba(255,59,48,.3);background:rgba(255,59,48,.08);color:#FF3B30;font-size:13px;font-weight:600;cursor:pointer">🫧 Marcar caja como urgente (objeto frágil)</button>`:"";
  m.innerHTML=`<div style="background:var(--card,#1C1C1E);border-radius:24px 24px 0 0;padding:20px 20px calc(20px + env(safe-area-inset-bottom));width:100%;max-width:480px;box-shadow:0 -8px 40px rgba(0,0,0,.5);animation:slideUp .3s cubic-bezier(.16,1,.3,1) both;max-height:90vh;overflow-y:auto"><div style="width:36px;height:4px;background:rgba(255,255,255,.2);border-radius:2px;margin:0 auto 16px"></div><div style="display:flex;gap:14px;margin-bottom:14px"><img src="${thumb}" style="width:80px;height:80px;border-radius:14px;object-fit:cover;flex-shrink:0;box-shadow:0 4px 16px rgba(0,0,0,.4)"/><div style="flex:1;min-width:0"><div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px">${catBadge}${fragilBadge}${cantBadge}</div>${desc}${noIA}</div></div>${tags}${nota}<div style="margin-top:14px"><div style="font-size:12px;color:var(--muted,#8E8E93);margin-bottom:6px;font-weight:600">NOMBRE DEL OBJETO</div><input id="scanNameInput" type="text" value="${esc(a?.nombre||"")}" placeholder="Ej: Cubo de Rubik" style="width:100%;box-sizing:border-box;padding:13px 14px;border-radius:13px;border:1.5px solid ${a?.nombre?"#34C759":"rgba(255,255,255,.15)"};background:rgba(255,255,255,.05);color:var(--text,#fff);font-size:16px;outline:none;font-family:inherit" onkeydown="if(event.key==='Enter')confirmScanName()" oninput="this.style.borderColor=this.value?'#34C759':'rgba(255,255,255,.15)'"/>${a?.cantidad>1?`<div style="font-size:12px;color:var(--muted,#8E8E93);margin-top:6px">💡 Se detectaron ${a.cantidad} objetos — se guarda uno a la vez.</div>`:""}</div><div style="display:flex;gap:10px;margin-top:14px"><button onclick="document.getElementById('scanNameModal').remove()" style="flex:1;padding:14px;border-radius:14px;border:none;background:rgba(255,255,255,.08);color:var(--text,#fff);font-size:15px;font-weight:600;cursor:pointer">Cancelar</button><button onclick="confirmScanName()" style="flex:2;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#FF9500,#FF6B00);color:#fff;font-size:15px;font-weight:700;cursor:pointer">📷 Guardar en caja</button></div>${fragilBtn}</div>`;
  document.body.appendChild(m);
  m._thumb=thumb; m._box=box; m._analisis=a;
  m.onclick=ev=>{if(ev.target===m)m.remove();};
  setTimeout(()=>{const inp=document.getElementById("scanNameInput");if(inp){inp.focus();if(a?.nombre)inp.select();}},300);
}

function sugerirPrioridadFragil(){
  const m=document.getElementById("scanNameModal");if(!m)return;
  m._box.priority="red";saveData();
  showToast("🔴 Caja marcada como urgente","#FF3B30");
  const btn=m.querySelector("button[onclick*='sugerirPrioridadFragil']");if(btn)btn.remove();
}

function confirmScanName(){
  const m=document.getElementById("scanNameModal");if(!m)return;
  const nombre=document.getElementById("scanNameInput")?.value.trim();
  if(!nombre){showToast("✏️ Escribe un nombre","#FF9500");return;}
  const box=m._box,thumb=m._thumb;
  box.items.push({text:nombre,done:false,thumb});
  addHistory(box,"📷 Escaneado: "+nombre);
  saveData();renderItems();renderProgress();renderHistory();generateQR(currentBoxId);
  m.remove();
  showToast("✅ "+nombre+" guardado","#34C759");
}

function resizeAndEncode(file,maxPx=1024,thumbPx=96){
  return new Promise((res,rej)=>{
    const img=new Image(),reader=new FileReader();
    reader.onload=ev=>{
      img.onload=()=>{
        let w=img.width,h=img.height;
        if(w>maxPx||h>maxPx){const r=Math.min(maxPx/w,maxPx/h);w=Math.round(w*r);h=Math.round(h*r);}
        const c=document.createElement("canvas");c.width=w;c.height=h;
        c.getContext("2d").drawImage(img,0,0,w,h);
        const tc=document.createElement("canvas");tc.width=thumbPx;tc.height=thumbPx;
        const s=Math.min(img.width,img.height),ox=(img.width-s)/2,oy=(img.height-s)/2;
        tc.getContext("2d").drawImage(img,ox,oy,s,s,0,0,thumbPx,thumbPx);
        res({b64:c.toDataURL("image/jpeg",0.95).split(",")[1],thumb:tc.toDataURL("image/jpeg",0.85)});
      };img.onerror=rej;img.src=ev.target.result;
    };reader.onerror=rej;reader.readAsDataURL(file);
  });
}

let _noteTimer=null;
function saveNote(){
  clearTimeout(_noteTimer);
  _noteTimer=setTimeout(()=>{
    const box=boxes.find(b=>b.id===currentBoxId);
    if(box){box.note=document.getElementById("noteArea").value;saveData();}
  },500);
}
function toggleFav(){const box=boxes.find(b=>b.id===currentBoxId);if(box){box.fav=!box.fav;document.getElementById("favBtn").textContent=box.fav?"⭐":"☆";saveData();}}
function toggleFavId(id){const box=boxes.find(b=>b.id===id);if(box){box.fav=!box.fav;saveData();renderGrid();}}

function renderRelated(){
  const box=boxes.find(b=>b.id===currentBoxId);const sec=document.getElementById("relatedSec");
  if(!box||!box.related){sec.style.display="none";return;}
  const rel=boxes.find(b=>b.id===box.related);if(!rel){sec.style.display="none";return;}
  sec.style.display="block";
  document.getElementById("relatedList").innerHTML=`<div class="rel-item" onclick="openDetail('${rel.id}')"><span style="font-size:20px">${getIcon(rel.name)}</span><span class="rel-name">${esc(rel.name)}</span><span class="rel-sub">${rel.items.length} objetos ›</span></div>`;
}

function toggleHistory(){
  const list=document.getElementById("historyList");
  const btn=document.getElementById("histToggleBtn");
  const hidden=list.style.display==="none";
  list.style.display=hidden?"":"none";
  if(btn) btn.textContent=hidden?"Ocultar":"Mostrar";
}

function renderHistory(){
  const box=boxes.find(b=>b.id===currentBoxId);const sec=document.getElementById("historySec");
  if(!box||!box.history||!box.history.length){sec.style.display="none";return;}
  sec.style.display="block";
  document.getElementById("historyList").innerHTML=box.history.slice(0,8).map(h=>`<div class="hist-row"><span style="font-size:14px;width:20px;text-align:center">${h.text.startsWith("Sacado")?"✅":h.text.startsWith("Devuelto")?"↩️":h.text.startsWith("Eliminado")?"🗑":"➕"}</span><span class="hist-text">${esc(h.text)}</span><span class="hist-date">${esc(h.date)}</span></div>`).join("");
}

function triggerPhoto(){document.getElementById("photoInput").click();}
function handlePhoto(e){
  const file=e.target.files[0];if(!file||!currentBoxId) return;
  const reader=new FileReader();
  reader.onload=ev=>{const box=boxes.find(b=>b.id===currentBoxId);if(box){box.photo=ev.target.result;saveData();renderPhotoArea();generateQR(currentBoxId);}};
  reader.readAsDataURL(file);e.target.value="";
}
function removePhoto(){const box=boxes.find(b=>b.id===currentBoxId);if(box){box.photo=null;saveData();renderPhotoArea();generateQR(currentBoxId);}}
function renderPhotoArea(){
  const box=boxes.find(b=>b.id===currentBoxId);const el=document.getElementById("photoArea");if(!el||!box) return;
  el.innerHTML=box.photo
    ?`<div class="photo-preview"><img src="${box.photo}"/><button class="photo-rm" onclick="event.stopPropagation();removePhoto()">✕</button></div>`
    :`<div class="photo-add"><span style="font-size:28px">📸</span><span>Agregar foto de la caja</span></div>`;
}

function generateQR(id){
  const box=boxes.find(b=>b.id===id);const el=document.getElementById("detailQR");if(!box||!el) return;
  el.innerHTML='<div style="padding:20px;color:var(--muted);font-size:12px">Generando QR...</div>';
  // defer to next frame for smooth UI
  requestAnimationFrame(()=>{
  el.innerHTML="";
  const relBox=box.related?boxes.find(b=>b.id===box.related):null;
  // Compress payload: truncate long texts, limit items to 20
  const compressItems=items=>items.slice(0,20).map(i=>({t:i.text.slice(0,40),d:i.done?1:0}));
  const payload={n:box.name,num:box.number,loc:box.location,col:box.color,
    tags:(box.tags||[]).slice(0,5),items:compressItems(box.items),
    date:box.date,note:(box.note||"").slice(0,100),pri:box.priority,w:box.weight,
    rel:relBox?{n:relBox.name,c:relBox.items.length}:null,brand:settings.brand};
  const data=btoa(encodeURIComponent(JSON.stringify(payload)));
  const url=location.href.split("#")[0]+"#view/"+data;
  try{
    const qr=qrcode(0,"L");qr.addData(url);qr.make();
    const mod=qr.getModuleCount();
    const cv=document.createElement("canvas");
    const size=220;cv.width=cv.height=size;cv.style.width=size+"px";cv.style.height=size+"px";
    const ctx=cv.getContext("2d");
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,size,size);
    const cell=Math.floor((size-20)/mod);
    const offset=Math.round((size-cell*mod)/2);
    ctx.fillStyle="#000000";
    for(let r=0;r<mod;r++) for(let c=0;c<mod;c++) if(qr.isDark(r,c)) ctx.fillRect(offset+c*cell,offset+r*cell,cell,cell);
    el.appendChild(cv);
  }catch(e){el.textContent="Error QR";}
  }); // end requestAnimationFrame
}

function exportBox(){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  let txt=`📦 ${box.name}`;
  if(box.number) txt+=` (#${box.number})`;
  if(box.location) txt+=`\n📍 ${box.location}`;
  if(box.weight) txt+=`\n⚖️ ${box.weight} kg`;
  if(box.priority) txt+=`\n${PRI[box.priority]} ${box.priority==="red"?"Urgente":box.priority==="green"?"Cuando pueda":"Normal"}`;
  txt+=`\n${"─".repeat(24)}\n`;
  if(!box.items.length) txt+="(vacía)";
  else box.items.forEach((it,i)=>{txt+=`${i+1}. ${it.done?"✓ ":""}${it.text}\n`;});
  if(box.note) txt+=`\n📝 ${box.note}`;
  navigator.clipboard.writeText(txt).then(()=>alert("¡Copiado! Pégalo en WhatsApp.")).catch(()=>prompt("Copia:",txt));
}
function dupBox(){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  const nb={...JSON.parse(JSON.stringify(box)),id:Date.now().toString(),name:box.name+" (copia)",date:fmtDate(),lastUsed:0,fav:false,history:[],sealed:false};
  boxes.push(nb);saveData();showToast("⧉ Copia creada: "+nb.name,"#5856D6");goMain();
}
function delBox(){
  if(!confirm("¿Eliminar esta caja?")) return;
  const id=currentBoxId;
  // Clean related refs in other boxes
  boxes.forEach(b=>{ if(b.related===id) b.related=null; });
  // Clean from room map
  rooms.forEach(r=>{ r.boxIds=r.boxIds.filter(bid=>bid!==id); });
  boxes=boxes.filter(b=>b.id!==id);
  saveData(); saveRooms();
  showToast("🗑️ Caja eliminada","#FF3B30");
  setTimeout(()=>goMain(),400);
}

function openForm(){
  formMode="new";editingBoxId=null;currentTags=[];selectedColor=COLORS[5];selectedPri="yellow";
  document.getElementById("modalTitle").textContent="Nueva caja";
  ["fName","fNum","fLoc","fWeight","fPassword"].forEach(id=>document.getElementById(id).value="");
  buildColorGrid();renderTagChips();updatePriBtns();populateRelatedSelect(null);
  document.getElementById("modalOverlay").classList.add("open");
  setTimeout(()=>document.getElementById("fName").focus(),100);
}
function openEditForm(){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  formMode="edit";editingBoxId=currentBoxId;currentTags=[...(box.tags||[])];selectedColor=box.color||COLORS[5];selectedPri=box.priority||"yellow";
  document.getElementById("modalTitle").textContent="Editar caja";
  document.getElementById("fName").value=box.name||"";
  document.getElementById("fNum").value=box.number||"";
  document.getElementById("fLoc").value=box.location||"";
  document.getElementById("fWeight").value=box.weight||"";
  document.getElementById("fPassword").value=box.password||"";
  buildColorGrid();renderTagChips();updatePriBtns();populateRelatedSelect(box.related);
  document.getElementById("modalOverlay").classList.add("open");
}
function closeForm(){document.getElementById("modalOverlay").classList.remove("open");}
function closeFormOutside(e){if(e.target===document.getElementById("modalOverlay")) closeForm();}
function populateRelatedSelect(cur){
  document.getElementById("fRelated").innerHTML='<option value="">— Ninguna —</option>'+
    boxes.filter(b=>b.id!==editingBoxId&&b.id!==currentBoxId).map(b=>`<option value="${b.id}"${b.id===cur?" selected":""}>${esc(b.name)}</option>`).join("");
}
function buildColorGrid(){document.getElementById("colorGrid").innerHTML=COLORS.map(c=>`<div class="cdot${c===selectedColor?" sel":""}" style="background:${c}" onclick="selectColor('${c}')"></div>`).join("");}
function selectColor(c){selectedColor=c;buildColorGrid();}
function setPri(p){selectedPri=p;updatePriBtns();}
function updatePriBtns(){["red","yellow","green"].forEach(p=>{document.getElementById("pri-"+p).classList.toggle("sel",p===selectedPri);});}
function renderTagChips(){
  const box=document.getElementById("tagsBox"),field=document.getElementById("tagField");
  box.innerHTML="";
  currentTags.forEach((t,i)=>{const c=document.createElement("span");c.className="tag-chip";c.innerHTML=`${esc(t)}<button onclick="removeTag(${i})">✕</button>`;box.appendChild(c);});
  box.appendChild(field);
}
function handleTagKey(e){if((e.key==="Enter"||e.key===",")&&e.target.value.trim()){e.preventDefault();addTag(e.target.value.trim());e.target.value="";}}
function addTag(t){if(!currentTags.includes(t)){currentTags.push(t);renderTagChips();}}
function removeTag(i){currentTags.splice(i,1);renderTagChips();}
function saveForm(){
  const name=document.getElementById("fName").value.trim();if(!name){alert("Escribe un nombre");return;}
  if(formMode==="new"){
    boxes.push({id:Date.now().toString(),name,number:document.getElementById("fNum").value.trim(),
      location:document.getElementById("fLoc").value.trim(),weight:document.getElementById("fWeight").value.trim(),
      color:selectedColor,priority:selectedPri,tags:[...currentTags],related:document.getElementById("fRelated").value||null,
      password:document.getElementById("fPassword").value||null,
      items:[],date:fmtDate(),note:"",photo:null,fav:false,lastUsed:0,history:[],sealed:false});
  }else{
    const box=boxes.find(b=>b.id===editingBoxId);
    if(box) Object.assign(box,{name,number:document.getElementById("fNum").value.trim(),location:document.getElementById("fLoc").value.trim(),weight:document.getElementById("fWeight").value.trim(),color:selectedColor,priority:selectedPri,tags:[...currentTags],related:document.getElementById("fRelated").value||null,password:document.getElementById("fPassword").value||null});
  }
  const _mode=formMode, _id=editingBoxId;
  saveData();closeForm();
  setTimeout(()=>{
    if(_mode==="new"){showToast("✅ Caja guardada","#34C759");goMain();}
    else{showToast("✏️ Cambios guardados","#34C759");openDetail(_id);}
  },50);
}

function doSearch(q){
  const wrap=document.getElementById("srWrap");document.getElementById("searchClear").classList.toggle("hidden",!q);
  if(!q.trim()){wrap.classList.remove("open");return;}
  const ql=q.toLowerCase(),hits=[];
  boxes.forEach(box=>box.items.forEach(it=>{if(it.text.toLowerCase().includes(ql)) hits.push({box,item:it.text});}));
  wrap.innerHTML=hits.length
    ?hits.slice(0,8).map(h=>`<div class="sr-item" onclick="openDetail('${h.box.id}')"><span style="font-size:20px">${getIcon(h.box.name)}</span><div><b>${esc(h.box.name)}</b> → ${esc(h.item)}</div></div>`).join("")
    :`<div class="sr-none">No se encontró "${esc(q)}"</div>`;
  wrap.classList.add("open");
}
function clearSearch(){document.getElementById("searchInput").value="";doSearch("");}

function goRoom(){showScreen("roomScreen");renderRoom();}
function addRoom(){const n=prompt("Nombre del cuarto (ej: Cuarto 1, Garaje):");if(n){rooms.push({id:Date.now().toString(),name:n,boxIds:[]});saveRooms();renderRoom();}}
function renderRoom(){
  const assigned=new Set(rooms.flatMap(r=>r.boxIds));
  const unassigned=boxes.filter(b=>!assigned.has(b.id));
  document.getElementById("unassignedChips").innerHTML=unassigned.map(b=>chipHtml(b,"unassigned")).join("")||'<div style="color:var(--muted);font-size:13px;padding:4px">Todas asignadas ✓</div>';
  document.getElementById("roomGrid").innerHTML=rooms.map(room=>`<div class="room-cell" id="room-${room.id}" ondragover="event.preventDefault();event.currentTarget.classList.add('drag-over')" ondragleave="event.currentTarget.classList.remove('drag-over')" ondrop="dropBox(event,'${room.id}')"><div class="room-cell-name"><span>${esc(room.name)}</span><div style="display:flex;gap:4px"><button class="room-cell-edit" onclick="renameRoom('${room.id}')">✏️</button><button class="room-cell-edit" style="color:var(--red)" onclick="deleteRoom('${room.id}')">🗑</button></div></div>${room.boxIds.map(bid=>{const b=boxes.find(x=>x.id===bid);return b?chipHtml(b,room.id):"";}).join("")}</div>`).join("");
  document.querySelectorAll(".room-box-chip").forEach(chip=>{chip.draggable=true;chip.ondragstart=e=>{e.dataTransfer.setData("text/plain",JSON.stringify({boxId:chip.dataset.id,from:chip.dataset.room}));};});
}
function chipHtml(b,room){
  return `<div class="room-box-chip" data-id="${b.id}" data-room="${room}"><span class="room-chip-icon">${getIcon(b.name)}</span><span class="room-chip-name">${esc(b.name)}</span>${b.number?`<span style="font-size:10px;background:var(--accent);color:#fff;border-radius:4px;padding:1px 5px">#${esc(b.number)}</span>`:""}</div>`;
}
function dropBox(e,toId){
  e.preventDefault();e.currentTarget.classList.remove("drag-over");
  try{
    const {boxId,from}=JSON.parse(e.dataTransfer.getData("text/plain"));
    if(from!=="unassigned"){const fr=rooms.find(r=>r.id===from);if(fr)fr.boxIds=fr.boxIds.filter(id=>id!==boxId);}
    if(toId!=="unassigned"){const tr=rooms.find(r=>r.id===toId);if(tr&&!tr.boxIds.includes(boxId))tr.boxIds.push(boxId);}
    else rooms.forEach(r=>{r.boxIds=r.boxIds.filter(id=>id!==boxId);});
    saveRooms();renderRoom();
  }catch(err){}
}
function renameRoom(id){const r=rooms.find(x=>x.id===id);if(!r) return;const n=prompt("Nuevo nombre:",r.name);if(n){r.name=n;saveRooms();renderRoom();}}
function deleteRoom(id){
  if(!confirm("¿Eliminar esta habitación? Las cajas asignadas pasarán a 'Sin asignar'.")) return;
  rooms=rooms.filter(r=>r.id!==id);
  saveRooms();renderRoom();
  showToast("Habitación eliminada","#636366");
}

function goSettings(){
  showScreen("settingsScreen");
  const brandInput=document.getElementById("brandInput");
  if(brandInput) brandInput.value=settings.brand||"";
  const tc=document.getElementById("setTotalCajas");
  const to=document.getElementById("setTotalObj");
  const td=document.getElementById("setTotalDone");
  if(tc) tc.textContent=boxes.length;
  if(to) to.textContent=boxes.reduce((s,b)=>s+b.items.length,0);
  if(td) td.textContent=boxes.reduce((s,b)=>s+b.items.filter(i=>i.done).length,0);
  applyDark();
  if(currentUser){
    const nameEl=document.getElementById("settingsUserName");
    const emailEl=document.getElementById("settingsUserEmail");
    const avatarEl=document.getElementById("settingsAvatar");
    const placeholderEl=document.getElementById("settingsAvatarPlaceholder");
    if(nameEl) nameEl.textContent=currentUser.displayName||"Usuario";
    if(emailEl) emailEl.textContent=currentUser.email||"";
    if(currentUser.photoURL&&avatarEl){
      avatarEl.src=currentUser.photoURL;
      avatarEl.style.display="block";
      if(placeholderEl) placeholderEl.style.display="none";
    }
  }
}
function saveBrand(){settings.brand=document.getElementById("brandInput").value.trim();saveSettings();}

function showViewer(box){
  showScreen("viewer");
  const _vfab=document.getElementById("aiFab");if(_vfab) _vfab.classList.add("hidden");
  _viewerItems=[]; // clear stale data
  window._viewerColor="#007AFF";
  const vsi=document.getElementById("vSearchInput");if(vsi) vsi.value="";
  const vsw=document.getElementById("vSearchWrap");if(vsw) vsw.classList.add("hidden");
  // vsw reused below - no redeclaration needed
  if(!box){document.getElementById("vName").textContent="Caja no encontrada";return;}
  // Check if this box exists locally (more up-to-date version)
  try{
    const local=JSON.parse(localStorage.getItem("cb-boxes")||"[]");
    const match=local.find(b=>b.name===box.name&&b.number===box.number);
    if(match){
      box={...box,...match};
      // Show "live" badge
      const be=document.getElementById("vBrand");
      const liveBadge='<span style="background:#34C759;color:#fff;font-size:10px;padding:2px 8px;border-radius:99px;font-weight:700;margin-left:6px">● EN VIVO</span>';
      if(match.brand||box.brand) be.innerHTML=(match.brand||box.brand?'📦 '+(match.brand||box.brand):'')+liveBadge;
      else be.innerHTML=liveBadge;
      be.classList.remove("hidden");
    }
  }catch(e){}
  const col=box.color||"#007AFF";
  window._viewerColor=col; // save for filterViewerItems
  document.getElementById("vBg").style.background=`linear-gradient(135deg,${col},${rgba(col,.6)})`;
  if(box.photo){const vp=document.getElementById("vPhoto");vp.src=box.photo;vp.classList.remove("hidden");}
  // Normalize compressed QR keys
  if(box.n&&!box.name){box.name=box.n;box.number=box.num;box.location=box.loc;box.color=box.col;box.priority=box.pri;box.weight=box.w;if(box.rel)box.related=box.rel;box.items=(box.items||[]).map(i=>typeof i==="object"&&i.t?{text:i.t,done:!!i.d}:i);}
  document.getElementById("vIcon").textContent=getIcon(box.name);
  document.getElementById("vNum").textContent=box.number?`Caja #${box.number} ${PRI[box.priority]||""}`:PRI[box.priority]||"";
  document.getElementById("vName").textContent=box.name;
  const brand=box.brand;const be=document.getElementById("vBrand");
  if(brand){be.textContent="📦 "+brand;be.classList.remove("hidden");}
  const tags=[];
  if(box.location) tags.push("📍 "+box.location);
  if(box.weight) tags.push("⚖️ "+box.weight+"kg");
  if(box.date) tags.push("📅 "+box.date);
  (box.tags||[]).forEach(t=>tags.push(t));
  document.getElementById("vTags").innerHTML=tags.map(t=>`<span class="vh-tag">${esc(t)}</span>`).join("");
  const items=box.items||[],done=items.filter(i=>i.done).length,total=items.length;
  if(total>0){
    const pct=Math.round(done/total*100);
    document.getElementById("vProgWrap").classList.remove("hidden");
    document.getElementById("vProgFill").style.cssText=`width:${pct}%;background:${col}`;
    document.getElementById("vProgLbl").textContent=done+" sacado"+(done!==1?"s":"")+" de "+total;
    document.getElementById("vProgPct").textContent=pct+"%";
  }
  if(box.note){document.getElementById("vNote").textContent="📝 "+box.note;document.getElementById("vNote").classList.remove("hidden");}
  _viewerItems=[...items];
  const vi=document.getElementById("vItems");
  vi.innerHTML=!total?'<div class="vh-empty">Esta caja está vacía 😅</div>'
    :items.map((it,i)=>`<div class="vh-item" style="animation-delay:${i*0.05}s"><div class="vh-nbadge" style="background:${col}">${i+1}</div><div class="vh-itext${it.done?" done":""}">${esc(it.text)}</div></div>`).join("");
  // Show search bar only if more than 8 items
  // reuse vsw declared above
  if(vsw) vsw.classList.toggle("hidden", total<=8);
  if(box.related){
    document.getElementById("vRelated").classList.remove("hidden");
    document.getElementById("vRelatedList").innerHTML=`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;font-size:14px"><span style="font-size:18px">${getIcon(box.related.name)}</span><span style="flex:1;font-weight:600">${esc(box.related.name)}</span><span style="color:var(--muted);font-size:12px">${box.related.items} objetos</span></div>`;
  }
}

async function toggleTorch(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    showToast("Linterna no disponible en este navegador","#636366"); return;
  }
  try{
    if(!torchOn){
      // Request camera without torch first (more compatible)
      torchStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}}});
      const track=torchStream.getVideoTracks()[0];
      const caps=track.getCapabilities?track.getCapabilities():{};
      if(!caps.torch){
        torchStream.getTracks().forEach(t=>t.stop());
        torchStream=null;
        showToast("Tu celular no soporta linterna desde el navegador","#636366"); return;
      }
      await track.applyConstraints({advanced:[{torch:true}]});
      torchOn=true;
      document.getElementById("torchBtn").classList.add("on");
      showToast("🔦 Linterna encendida","#34C759");
    }else{
      if(torchStream){
        const track=torchStream.getVideoTracks()[0];
        if(track) await track.applyConstraints({advanced:[{torch:false}]}).catch(()=>{});
        torchStream.getTracks().forEach(t=>t.stop());
        torchStream=null;
      }
      torchOn=false;
      document.getElementById("torchBtn").classList.remove("on");
      showToast("🔦 Linterna apagada","#636366");
    }
  }catch(e){
    showToast("No se pudo acceder a la linterna","#FF3B30");
    if(torchStream){torchStream.getTracks().forEach(t=>t.stop());torchStream=null;}
    torchOn=false;
  }
}

function speakItems(){
  if(!window.speechSynthesis){alert("Tu navegador no soporta voz");return;}
  if(speaking){window.speechSynthesis.cancel();speaking=false;document.getElementById("ttsBtn").classList.remove("on");return;}
  const name=document.getElementById("vName").textContent;
  const items=[...document.querySelectorAll(".vh-itext")].map(el=>el.textContent);
  const utt=new SpeechSynthesisUtterance(`Caja ${name}. Contiene: ${items.join(", ")}`);
  utt.lang="es-ES";utt.rate=0.9;
  utt.onend=()=>{speaking=false;document.getElementById("ttsBtn").classList.remove("on");};
  window.speechSynthesis.speak(utt);speaking=true;document.getElementById("ttsBtn").classList.add("on");
}


// ═══ TUTORIAL ═══
let tutStep=0;
const TUT_TOTAL=7;

function initTutorial(){
  const uid=currentUser?.uid||"guest";
  const seen=localStorage.getItem("cb-tutorial-done-"+uid)||localStorage.getItem("cb-tutorial-done");
  if(!seen){
    document.getElementById("tutorial").classList.add("active");
    tutStep=0;
    setTimeout(initTutSwipe,100);
  }
}

function initTutSwipe(){
  const slides=document.getElementById("tutSlides");
  if(!slides) return;
  let startX=0,startY=0;
  slides.addEventListener("touchstart",e=>{startX=e.touches[0].clientX;startY=e.touches[0].clientY;},{passive:true});
  slides.addEventListener("touchend",e=>{
    const dx=e.changedTouches[0].clientX-startX;
    const dy=Math.abs(e.changedTouches[0].clientY-startY);
    if(Math.abs(dx)>50&&dy<80){
      if(dx<0&&tutStep<TUT_TOTAL-1) goTut(tutStep+1);
      else if(dx>0&&tutStep>0) goTut(tutStep-1);
    }
  },{passive:true});
}

function goTut(step){
  const slides=document.querySelectorAll('.tut-slide');
  slides.forEach((s,i)=>{
    s.classList.remove('active','prev','next');
    if(i<step) s.classList.add('prev');
    else if(i===step) s.classList.add('active');
    else s.classList.add('next');
  });
  // Actualizar dots
  document.querySelectorAll('.tut-dot').forEach((d,i)=>{
    d.classList.toggle('active', i%TUT_TOTAL===step);
  });
  tutStep=step;
}

function nextTut(){
  if(tutStep<TUT_TOTAL-1) goTut(tutStep+1);
  else finishTut();
}

function finishTut(){
  const uid=currentUser?.uid||"guest";
  localStorage.setItem("cb-tutorial-done-"+uid,"1");
  const tut=document.getElementById("tutorial");
  tut.style.opacity="0";
  tut.style.transition="opacity .3s";
  setTimeout(()=>{tut.classList.remove("active");tut.style.opacity="";tut.style.transition="";},300);
}


function funnyEmpty(){
  const msgs=[
    {e:"👀",t:"Aquí no hay nada… todavía",s:"Agrega el primer objeto arriba"},
    {e:"🦗",t:"Grillos. Solo grillos.",s:"Esta caja está más vacía que mis bolsillos"},
    {e:"🌵",t:"Desierto total",s:"Ni una piedra. Agrega algo."},
    {e:"🕳️",t:"El vacío te observa",s:"Dale vida a esta caja con algo"},
    {e:"📭",t:"Caja fantasma",s:"Existe pero no contiene nada... aún"},
    {e:"🥚",t:"Vacía como un huevo… sin yema",s:"Rellénala con lo que necesitas"},
  ];
  const m=msgs[Math.floor(Math.random()*msgs.length)];
  return `<div style="padding:24px 16px;text-align:center"><div style="font-size:36px;margin-bottom:8px">${m.e}</div><div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px">${m.t}</div><div style="font-size:13px;color:var(--muted)">${m.s}</div></div>`;
}


function launchConfetti(){
  const colors=["#FF3B30","#FF9500","#FFCC00","#34C759","#007AFF","#5856D6","#AF52DE","#FF2D55"];
  const wrap=document.createElement("div");
  wrap.className="confetti-wrap";
  const count=80;
  for(let i=0;i<count;i++){
    const p=document.createElement("div");
    p.className="confetti-piece";
    const col=colors[Math.floor(Math.random()*colors.length)];
    const size=Math.random()*10+5;
    const left=Math.random()*100;
    const dur=Math.random()*2+1.5;
    const delay=Math.random()*0.8;
    const shape=Math.random()>.5?"50%":"2px";
    p.style.cssText=`left:${left}%;width:${size}px;height:${size}px;background:${col};border-radius:${shape};animation-duration:${dur}s;animation-delay:${delay}s`;
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);

  const msgs=["¡Caja vaciada! 🎉","¡Increíble! 🚀","¡Lo lograste! ✨","¡Caja lista! 🏆"];
  const msg=document.createElement("div");
  msg.className="confetti-msg";
  msg.innerHTML=`<div style="font-size:48px;margin-bottom:12px">🎉</div><div style="font-size:20px;font-weight:800;color:var(--text);margin-bottom:6px">${msgs[Math.floor(Math.random()*msgs.length)]}</div><div style="font-size:14px;color:var(--muted)">Esta caja ya no tiene objetos pendientes</div>`;
  document.body.appendChild(msg);

  setTimeout(()=>{
    wrap.style.transition="opacity .5s";
    wrap.style.opacity="0";
    msg.style.transition="opacity .3s,transform .3s";
    msg.style.opacity="0";
    msg.style.transform="translate(-50%,-50%) scale(.9)";
    setTimeout(()=>{wrap.remove();msg.remove();},600);
  },2800);
}


function showToast(msg, color){
  const t=document.createElement("div");
  t.style.cssText=`position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:${color||"#1C1C1E"};color:#fff;padding:13px 22px;border-radius:16px;font-size:14px;font-weight:600;z-index:9999;max-width:300px;width:max-content;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.35),0 1px 0 rgba(255,255,255,.1) inset;animation:toastSpring .4s var(--ease-spring,cubic-bezier(.175,.885,.32,1.275)) both;letter-spacing:-.1px;backdrop-filter:blur(16px)`;
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity="0";t.style.transition="opacity .3s";setTimeout(()=>t.remove(),300);},3500);
}

const ANIMO_MSGS=["¡Uno menos! 💪","¡Vas genial! 🚀","¡Qué crack! ✨","¡Sigue así! 🔥","¡Casi! 🎯","¡Imparable! ⚡","¡Boom! 💥","¡Eso es! 👊","¡Top! 🏆","¡La rompes! 🎸"];
function animoToast(){const m=ANIMO_MSGS[Math.floor(Math.random()*ANIMO_MSGS.length)];showToast(m,"#34C759");}


function toggleSealed(){
  const box=boxes.find(b=>b.id===currentBoxId); if(!box) return;
  box.sealed=!box.sealed;
  saveData(); openDetail(currentBoxId);
  showToast(box.sealed?"🔒 Caja sellada — no se puede modificar":"🔓 Caja desbloqueada","#5856D6");
}


function shareBoxWhatsApp(){
  const box=boxes.find(b=>b.id===currentBoxId); if(!box) return;
  const payload={n:box.name,num:box.number,loc:box.location,col:box.color,tags:box.tags,
    items:(box.items||[]).slice(0,20).map(i=>({t:i.text.slice(0,40),d:i.done?1:0})),
    date:box.date,note:(box.note||"").slice(0,100),pri:box.priority,w:box.weight,brand:settings.brand};
  const data=btoa(encodeURIComponent(JSON.stringify(payload)));
  const baseUrl=(location.origin+location.pathname).replace(/\/$/,"");
  const url=baseUrl+"#view/"+data;
  const items=box.items.length>0?box.items.slice(0,5).map((it,i)=>`${i+1}. ${it.text}`).join("\n")+"\n":"(vacía)\n";
  const msg=`📦 *${box.name}*${box.number?" (#"+box.number+")":""}\n${box.location?"📍 "+box.location+"\n":""}\n${items}\n🔗 Ver todo: ${url}`;
  window.open("https://wa.me/?text="+encodeURIComponent(msg),"_blank");
}


let voiceRecog=null;
function startVoice(){
  const box=boxes.find(b=>b.id===currentBoxId);
  if(box&&box.sealed){showToast("🔒 Esta caja está sellada","#FF9500");return;}
  if(!("webkitSpeechRecognition" in window||"SpeechRecognition" in window)){
    showToast("Voz no disponible en este navegador","#636366");return;
  }
  const SpeechRec=window.SpeechRecognition||window.webkitSpeechRecognition;
  voiceRecog=new SpeechRec();
  voiceRecog.lang="es-ES";
  voiceRecog.interimResults=false;
  voiceRecog.maxAlternatives=1;
  const btn=document.getElementById("micBtn");
  if(btn){btn.textContent="🔴";btn.style.animation="pulse 1s infinite";}
  showToast("🎤 Habla... separa objetos con comas","#5856D6");
  const capturedBoxId=currentBoxId; // capture before async
  voiceRecog.onresult=e=>{
    const text=e.results[0][0].transcript;
    const items=text.split(/,|y(?= )|;/).map(s=>s.trim()).filter(s=>s.length>1);
    const b=boxes.find(x=>x.id===capturedBoxId); if(!b) return;
    items.forEach(it=>{b.items.push({text:it,done:false});addHistory(b,"Agregado por voz: "+it);});
    saveData();renderItems();renderProgress();generateQR(currentBoxId);
    showToast(`🎤 ${items.length} objeto${items.length!==1?"s":""} agregado${items.length!==1?"s":""}!`,"#5856D6");
  };
  voiceRecog.onerror=e=>{showToast("No se pudo escuchar: "+e.error,"#FF3B30");};
  voiceRecog.onend=()=>{const b=document.getElementById("micBtn");if(b){b.textContent="🎤";b.style.animation="";}};
  voiceRecog.start();
}


let _viewerItems=[];
function filterViewerItems(q){
  const col=window._viewerColor||"#007AFF";
  const filtered=q?_viewerItems.filter(it=>it.text.toLowerCase().includes(q.toLowerCase())):_viewerItems;
  const vi=document.getElementById("vItems");
  vi.innerHTML=!filtered.length
    ?'<div style="text-align:center;padding:24px;color:var(--muted);font-size:14px">No encontrado</div>'
    :filtered.map((it,i)=>`<div class="vh-item" style="animation-delay:${i*0.03}s"><div class="vh-nbadge" style="background:${col}">${_viewerItems.indexOf(it)+1}</div><div class="vh-itext${it.done?" done":""}">${esc(it.text)}</div></div>`).join("");
}


// ═══ 3D CUBE ═══
let cubeRotX=-18, cubeRotY=0, cubeDragging=false, cubeLastX=0, cubeLastY=0, cubeSpinning=true;

function openCube(boxId){
  const box=boxes.find(b=>b.id===boxId); if(!box) return;
  const col=box.color||"#007AFF";
  const col2=box.color?rgba(col,.7):"#5856D6";

  // Title
  document.getElementById("cubeTitle").textContent=getIcon(box.name)+" "+box.name;
  const meta=[];
  if(box.number) meta.push("Caja #"+box.number);
  if(box.location) meta.push("📍 "+box.location);
  if(box.items.length) meta.push(box.items.length+" objeto"+(box.items.length!==1?"s":""));
  document.getElementById("cubeSub").textContent=meta.join(" · ");

  // Faces
  const faces={
    front:"cfFront", back:"cfBack", right:"cfRight",
    left:"cfLeft",  top:"cfTop",   bottom:"cfBottom"
  };
  const faceColors=[col,rgba(col,.75),rgba(col,.6),rgba(col,.85),rgba(col,.5),rgba(col,.7)];
  const faceContents=[
    // front: photo or icon
    box.photo
      ?`<img src="${box.photo}"/><div class="face-overlay"></div><div class="face-label" style="position:relative;z-index:1">${getIcon(box.name)}</div>`
      :`<span class="face-label">${getIcon(box.name)}</span>`,
    // back: icon large
    `<span class="face-label">${getIcon(box.name)}</span>`,
    // right: number
    box.number
      ?`<span class="face-num">#${esc(box.number)}</span>`
      :`<span class="face-label">📦</span>`,
    // left: location
    box.location
      ?`<div style="text-align:center;padding:8px"><div style="font-size:22px;margin-bottom:8px">📍</div><div style="font-size:13px;font-weight:700;color:#fff">${esc(box.location)}</div></div>`
      :`<span class="face-label">🗺</span>`,
    // top: count
    `<div style="text-align:center"><div style="font-size:32px;font-weight:900">${box.items.length}</div><div style="font-size:12px;font-weight:700;opacity:.8;margin-top:4px">objeto${box.items.length!==1?"s":""}</div></div>`,
    // bottom: date
    `<div style="text-align:center;padding:8px"><div style="font-size:18px;margin-bottom:6px">📅</div><div style="font-size:11px;font-weight:700;color:#fff;opacity:.85">${esc(box.date||"—")}</div></div>`
  ];

  Object.values(faces).forEach((id,i)=>{
    const el=document.getElementById(id);
    el.style.background=`linear-gradient(135deg,${faceColors[i]},${faceColors[(i+1)%6]})`;
    el.innerHTML=faceContents[i];
  });

  // Items list
  const done=box.items.filter(it=>it.done).length;
  document.getElementById("cubeItems").innerHTML=box.items.length===0
    ?`<div style="text-align:center;color:rgba(255,255,255,.5);font-size:13px;padding:8px">Sin objetos en esta caja</div>`
    :box.items.map((it,i)=>`
      <div class="cube-item-row">
        <div class="cube-item-num" style="background:${col}">${i+1}</div>
        <div class="${it.done?"cube-item-done":""}">${esc(it.text)}</div>
        ${it.done?'<span style="font-size:12px">✅</span>':''} 
      </div>`).join("")+
    (done>0?`<div style="text-align:center;font-size:11px;color:rgba(255,255,255,.4);padding:6px 0 2px">${done} sacado${done!==1?"s":""} de ${box.items.length}</div>`:"");

  // Reset spin state
  cubeRotX=-18; cubeRotY=0; cubeSpinning=true;
  const wrap=document.getElementById("cubeWrap");
  wrap.classList.add("spinning");
  wrap.style.transform="";

  document.getElementById("cubeOverlay").classList.add("open");
  initCubeDrag();
}

function closeCube(){
  document.getElementById("cubeOverlay").classList.remove("open");
  cubeSpinning=false;
}
function closeCubeOutside(e){if(e.target===document.getElementById("cubeOverlay")) closeCube();}

function initCubeDrag(){
  const scene=document.getElementById("cubeScene");
  const wrap=document.getElementById("cubeWrap");

  // Read current rotation from animation when user starts drag
  function getCurrentRot(){
    if(cubeSpinning){
      const st=getComputedStyle(wrap).transform;
      if(st&&st!=="none"){
        // parse matrix3d or matrix
        const m=new DOMMatrix(st);
        cubeRotY=Math.atan2(m.m13,m.m33)*(180/Math.PI);
        cubeRotX=-18;
      }
    }
  }

  function stopSpin(){
    if(cubeSpinning){
      getCurrentRot();
      wrap.classList.remove("spinning");
      wrap.style.transform=`rotateX(${cubeRotX}deg) rotateY(${cubeRotY}deg)`;
      cubeSpinning=false;
    }
  }

  function applyRot(){
    wrap.style.transform=`rotateX(${cubeRotX}deg) rotateY(${cubeRotY}deg)`;
  }

  let velX=0, velY=0, lastMoveTime=0;

  // Touch with momentum
  scene.ontouchstart=e=>{
    stopSpin(); cubeDragging=true;
    cubeLastX=e.touches[0].clientX; cubeLastY=e.touches[0].clientY;
    velX=0; velY=0; lastMoveTime=Date.now();
    e.preventDefault();
  };
  scene.ontouchmove=e=>{
    if(!cubeDragging) return;
    const now=Date.now();
    const dx=e.touches[0].clientX-cubeLastX;
    const dy=e.touches[0].clientY-cubeLastY;
    const dt=Math.max(1,now-lastMoveTime);
    velX=dx/dt*16; velY=dy/dt*16;
    cubeRotY+=dx*0.55; cubeRotX-=dy*0.28;
    cubeRotX=Math.max(-65,Math.min(65,cubeRotX));
    cubeLastX=e.touches[0].clientX; cubeLastY=e.touches[0].clientY;
    lastMoveTime=now;
    applyRot(); e.preventDefault();
  };
  scene.ontouchend=e=>{
    cubeDragging=false;
    if(!cubeSpinning){
      let friction=0.92;
      const runMomentum=()=>{
        if(Math.abs(velX)<0.1&&Math.abs(velY)<0.1) return;
        cubeRotY+=velX; cubeRotX-=velY;
        cubeRotX=Math.max(-65,Math.min(65,cubeRotX));
        velX*=friction; velY*=friction;
        applyRot(); requestAnimationFrame(runMomentum);
      };
      runMomentum();
    }
  };

  // Mouse with momentum
  scene.onmousedown=e=>{
    stopSpin(); cubeDragging=true;
    cubeLastX=e.clientX; cubeLastY=e.clientY;
    velX=0; velY=0; lastMoveTime=Date.now();
  };
  window.onmousemove=e=>{
    if(!cubeDragging) return;
    const now=Date.now();
    const dx=e.clientX-cubeLastX; const dy=e.clientY-cubeLastY;
    const dt=Math.max(1,now-lastMoveTime);
    velX=dx/dt*16; velY=dy/dt*16;
    cubeRotY+=dx*0.45; cubeRotX-=dy*0.25;
    cubeRotX=Math.max(-65,Math.min(65,cubeRotX));
    cubeLastX=e.clientX; cubeLastY=e.clientY;
    lastMoveTime=now; applyRot();
  };
  window.onmouseup=()=>{
    if(!cubeDragging) return; cubeDragging=false;
    if(!cubeSpinning){
      let friction=0.92;
      const runMomentumM=()=>{
        if(Math.abs(velX)<0.1&&Math.abs(velY)<0.1) return;
        cubeRotY+=velX; cubeRotX-=velY;
        cubeRotX=Math.max(-65,Math.min(65,cubeRotX));
        velX*=friction; velY*=friction;
        applyRot(); requestAnimationFrame(runMomentumM);
      };
      runMomentumM();
    }
  };

  // Tap to toggle spin
  scene.onclick=e=>{
    if(Math.abs(e.clientX-cubeLastX)<5&&Math.abs(e.clientY-cubeLastY)<5){
      if(cubeSpinning){stopSpin();showToast("⏸ Pausado — arrastra para girar","#5856D6");}
      else{wrap.classList.add("spinning");cubeSpinning=true;showToast("▶ Girando","#5856D6");}
    }
  };
}


// ═══ BOX IA — Motor con API Anthropic ═══
let aiOpen = false;
let aiHistory = [];
let aiStreaming = false;

const AI_INTRO = "¡Hola! 👋 Soy <b>Box IA</b>, tu asistente inteligente de mudanzas.<br><br>Puedo buscar objetos en tus cajas, analizar tu progreso, darte recomendaciones para organizar mejor, y responder cualquier pregunta sobre tu mudanza. ¿En qué te ayudo?";

function toggleAI(){
  aiOpen = !aiOpen;
  const panel = document.getElementById("aiPanel");
  const fab = document.getElementById("aiFab");
  if(aiOpen){
    panel.classList.add("open");
    fab.style.display = "none";
    const connected = localStorage.getItem("boxia_connected");
    const skipped = localStorage.getItem("boxia_skip");
    if(!connected && !skipped){
      document.getElementById("aiKeyScreen").style.display = "flex";
      document.getElementById("aiChatArea").style.display = "none";
    } else {
      showAIChat();
    }
  } else {
    panel.classList.remove("open");
    fab.style.display = "flex";
  }
}

function showAIChat(){
  document.getElementById("aiKeyScreen").style.display = "none";
  document.getElementById("aiChatArea").style.display = "flex";
  const connected = localStorage.getItem("boxia_connected");
  const statusEl = document.getElementById("aiStatus");
  if(statusEl) statusEl.textContent = connected ? "Conectada ✦ Groq" : "Modo básico";
  if(!document.getElementById("aiMessages").children.length){
    aiAddMsg("bot", AI_INTRO);
  }
  setTimeout(()=>document.getElementById("aiInput").focus(), 300);
}

async function testGroqConnection(){
  const apiKey=localStorage.getItem("boxia_key");
  if(!apiKey){showToast("⚠️ Primero conecta Box IA con tu key","#FF9500");return;}
  showToast("🔌 Probando conexión...","#5856D6");
  try{
    const res=await fetch("https://broken-flower-327b.theincognit40.workers.dev/models");
    const data=await res.json();
    if(res.ok){
      const modelos=data.data?.map(m=>m.id).slice(0,3).join(", ")||"OK";
      showToast("✅ Conexión exitosa — Groq responde","#34C759");
      aiAddMsg("bot",`✅ <b>Conexión OK</b><br>Groq responde correctamente. Modelos disponibles: ${data.data?.length||0}.`);
    } else {
      const msg=data?.error?.message||res.status;
      showToast("❌ Error: "+String(msg).slice(0,50),"#FF3B30");
      aiAddMsg("bot",`❌ <b>Error de autenticación:</b> ${msg}<br><br>Tu key puede estar expirada. Toca ⚙️ Cambiar API key y genera una nueva en <b>console.groq.com</b>`);
    }
  }catch(err){
    const msg=String(err.message||err);
    showToast("❌ "+msg.slice(0,50),"#FF3B30");
    aiAddMsg("bot",`🌐 <b>Error de red:</b> ${msg}<br><br>Posibles causas:<br>• Sin internet<br>• Tu red bloquea api.groq.com<br>• Intenta desde otra red o datos móviles`);
  }
}

function saveApiKey(){
  // Con el Worker, no se necesita key en el browser
  // Solo marcamos como conectado
  localStorage.setItem("boxia_connected","1");
  localStorage.removeItem("boxia_skip");
  showToast("✅ Box IA conectada","#34C759");
  showAIChat();
}

function skipApiKey(){
  localStorage.setItem("boxia_skip","1");
  showAIChat();
}

function clearApiKey(){
  localStorage.removeItem("boxia_connected");
  localStorage.removeItem("boxia_skip");
  document.getElementById("aiKeyInput") && (document.getElementById("aiKeyInput").value="");
  document.getElementById("aiMessages").innerHTML="";
  aiHistory=[];
  document.getElementById("aiKeyScreen").style.display = "flex";
  document.getElementById("aiChatArea").style.display = "none";
}

function aiAddMsg(role, html, animate=false){
  const msgs = document.getElementById("aiMessages");
  const div = document.createElement("div");
  div.className = `ai-msg ${role}`;
  if(role === "bot"){
    div.innerHTML = `<div class="ai-msg-avatar">🤖</div><div class="ai-bubble"></div>`;
    msgs.appendChild(div);
    const bubble = div.querySelector(".ai-bubble");
    if(animate) typewriterHTML(bubble, html);
    else bubble.innerHTML = html;
  } else {
    div.innerHTML = `<div class="ai-bubble">${esc(html)}</div>`;
    msgs.appendChild(div);
  }
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function typewriterHTML(el, html){
  el.innerHTML = "";
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const full = temp.innerHTML;
  let i = 0, insideTag = false, rendered = "";
  function tick(){
    if(i >= full.length){ el.innerHTML = full; return; }
    const ch = full[i];
    if(ch === "<") insideTag = true;
    if(insideTag){ rendered += ch; if(ch===">") insideTag=false; i++; tick(); return; }
    rendered += ch;
    el.innerHTML = rendered + "<span class='ai-cursor'>▋</span>";
    i++;
    document.getElementById("aiMessages").scrollTop = 99999;
    setTimeout(tick, 8);
  }
  tick();
}

function aiShowTyping(){
  const msgs = document.getElementById("aiMessages");
  const div = document.createElement("div");
  div.className = "ai-msg bot"; div.id = "aiTyping";
  div.innerHTML = `<div class="ai-msg-avatar">🤖</div><div class="ai-bubble"><div class="ai-typing"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function aiHideTyping(){
  const t = document.getElementById("aiTyping");
  if(t) t.remove();
}

function aiSend(){
  if(aiStreaming) return;
  const inp = document.getElementById("aiInput");
  const q = inp.value.trim(); if(!q) return;
  inp.value = "";
  aiAsk(q);
}

function buildContextSnapshot(){
  const totalItems = boxes.reduce((s,b)=>s+b.items.length,0);
  const doneItems = boxes.reduce((s,b)=>s+b.items.filter(i=>i.done).length,0);
  const pct = totalItems ? Math.round(doneItems/totalItems*100) : 0;
  const urgent = boxes.filter(b=>b.priority==="red").length;
  const rooms = [...new Set(boxes.map(b=>b.location).filter(Boolean))];
  const boxList = boxes.map(b=>({
    nombre:b.name, numero:b.number||null, ubicacion:b.location||null,
    prioridad:b.priority==="red"?"urgente":b.priority==="green"?"baja":"normal",
    objetos:b.items.map(i=>i.text+(i.done?" [sacado]":"")),
    sellada:b.sealed, favorita:b.fav, peso:b.weight||null, tags:b.tags||[]
  }));
  return `CONTEXTO DE MUDANZA (${new Date().toLocaleDateString("es-PE",{weekday:"long",day:"numeric",month:"long"})}):
- Cajas: ${boxes.length} | Objetos: ${totalItems} | Sacados: ${doneItems} | Progreso: ${pct}%
- Urgentes: ${urgent} | Habitaciones: ${rooms.join(", ")||"sin asignar"}
CAJAS: ${JSON.stringify(boxList)}`;
}

async function aiAsk(q){
  document.getElementById("aiQuick").style.display = "none";
  aiAddMsg("user", q);
  aiHistory.push({role:"user", content:q});
  aiStreaming = true;
  const inp = document.getElementById("aiInput");
  inp.disabled = true;
  aiShowTyping();

  try {
    const res = await fetch("https://broken-flower-327b.theincognit40.workers.dev/chat",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"llama-3.3-70b-versatile",
        max_tokens:1000,
        messages:[
          {role:"system", content:`Eres Box IA, asistente experto en mudanzas y organización de cajas. Responde siempre en español (Perú). Usa HTML básico para formato: <b>, <br>. Sin markdown con asteriscos. Sé conciso, útil y empático. Cuando busques objetos revisa todas las cajas. Puedes dar consejos de organización y anticipar necesidades del usuario.\n\n${buildContextSnapshot()}`},
          ...aiHistory.map(m=>({role:m.role, content:m.content}))
        ]
      })
    });
    if(!res.ok){
      const err = await res.json().catch(()=>({}));
      throw new Error(err?.error?.message || res.status);
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "Sin respuesta.";
    aiHistory.push({role:"assistant", content:reply});
    aiHideTyping();
    aiAddMsg("bot", reply, true);
  } catch(e){
    aiHideTyping();
    const errMsg = String(e?.message||e);
    console.error("Box IA error:", errMsg);
    if(e.message === "no_key"){
      aiAddMsg("bot","⚙️ <b>Worker no configurado.</b><br>Revisa la URL del Worker en la app.");
    } else if(errMsg.includes("401")||errMsg.includes("invalid_api_key")||errMsg.includes("Unauthorized")){
      aiAddMsg("bot","🔑 <b>API key inválida o expirada.</b><br>Toca <i>⚙️ Cambiar API key</i> para actualizarla.");
    } else if(errMsg.includes("Failed to fetch")||errMsg.includes("NetworkError")||errMsg.includes("CORS")){
      aiAddMsg("bot","🌐 <b>Error de red.</b><br>Verifica tu conexión a internet e intenta de nuevo.");
    } else if(errMsg.includes("429")||errMsg.includes("rate_limit")){
      aiAddMsg("bot","⏳ <b>Demasiadas consultas.</b><br>Espera unos segundos e intenta de nuevo.");
    } else {
      aiAddMsg("bot",`⚠️ <b>Error:</b> ${errMsg.slice(0,120)}<br><br>Intenta de nuevo o verifica tu key en ⚙️`);
    }
  } finally {
    aiStreaming = false;
    inp.disabled = false;
    setTimeout(()=>inp.focus(), 100);
  }
}

function aiRespondLocal(q){
  const ql = q.toLowerCase();
  const totalItems = boxes.reduce((s,b)=>s+b.items.length,0);
  const doneItems = boxes.reduce((s,b)=>s+b.items.filter(i=>i.done).length,0);
  const pct = totalItems ? Math.round(doneItems/totalItems*100) : 0;
  const terms = ql.replace(/¿|donde|están|está|dónde|tengo|mis|mi|busca|busco|encontrar|buscar|hay|los|las|el|la/g,"").trim();
  if((ql.includes("dond")||ql.includes("busca")||ql.includes("encontr")||ql.includes("tengo"))&&terms.length>2){
    const hits=[];boxes.forEach(b=>b.items.forEach(it=>{if(it.text.toLowerCase().includes(terms))hits.push({b,it});}));
    if(!hits.length) return `No encontré "<b>${terms}</b>" en ninguna caja 🔍`;
    return `Encontré <b>${hits.length}</b> resultado${hits.length!==1?"s":""}:<br><br>`+hits.slice(0,5).map(h=>`📦 <b>${esc(h.b.name)}</b>${h.b.location?" — "+h.b.location:""}<br>→ ${esc(h.it.text)}${h.it.done?" ✅":""}`).join("<br>");
  }
  if(ql.includes("progreso")||ql.includes("llevo")||ql.includes("cuánto"))
    return `📊 <b>${pct}%</b> completado — ${doneItems} sacados de ${totalItems} objetos en ${boxes.length} cajas.`;
  if(ql.includes("urgent")){
    const u=boxes.filter(b=>b.priority==="red");
    return u.length?`<b>${u.length} caja${u.length!==1?"s":""} urgente${u.length!==1?"s":""}</b>:<br><br>`+u.map(b=>`🔴 <b>${esc(b.name)}</b>${b.location?" — "+b.location:""}`).join("<br>"):"Sin cajas urgentes 🟡";
  }
  return `⚠️ Sin conexión con Box IA.<br>Intenta de nuevo en un momento.`;
}

// Show FAB only in main screens (not viewer/tutorial)
function updateFABVisibility(){
  const fab = document.getElementById("aiFab");
  if(!fab) return;
  const hash = location.hash;
  const isViewer = hash.startsWith("#view/");
  fab.classList.toggle("hidden", isViewer);
}

window.addEventListener("hashchange",()=>{route();updateFABVisibility();});
document.addEventListener("DOMContentLoaded",applySplashGradient);
// route() se llama desde onAuthStateChanged tras el login
