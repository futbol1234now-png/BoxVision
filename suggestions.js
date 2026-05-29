/* BoxVision — Sugerencias de items, helpers de escape y color */

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
  // FIX B: usar data-val + listener para evitar XSS/rotura con apóstrofes en onclick
  wrap.innerHTML='<span class="sug-label">💡</span>'+
    sugs.map(s=>`<button class="sug-chip" data-val="${s.replace(/"/g,'&quot;')}">${s}</button>`).join("");
  wrap.querySelectorAll(".sug-chip").forEach(btn=>btn.addEventListener("click",()=>addSuggestion(btn.dataset.val)));
}

function addSuggestion(text){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  box.items.push({text,done:false});
    saveData();renderItems();renderProgress();generateQR(currentBoxId);
  showToast("➕ "+text+" agregado","#007AFF");
  // re-show suggestions
  const inp=document.getElementById("addItemInput");
  if(inp) showSuggestions(inp.value);
}

function toggleDark(){dark=dark?0:1;localStorage.setItem("cb-dark",dark?"1":"0");applyDark();}
function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/'/g,"&#39;").replace(/"/g,"&quot;");}
function rgba(h,a){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return `rgba(${r},${g},${b},${a})`;}

/* ── SEGURIDAD FIX 2: URL centralizada del Worker — un solo lugar para cambiar ── */
const BOX_IA_WORKER = "https://broken-flower-327b.theincognit40.workers.dev";

/* ── SEGURIDAD FIX 3: sanitizar HTML de respuestas IA (solo tags seguros) ── */
function sanitizeAI(html){
  if(!html) return "";
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi,"")
    .replace(/javascript\s*:/gi,"")
    .replace(/on\w+\s*=/gi,"")
    .replace(/<(?!\/?(?:b|br|i|em|strong|span|div|p|ul|li|ol)\b)[^>]+>/gi,"");
}

/* ── SEGURIDAD FIX 4: API key Groq en sessionStorage con ofuscación base64 ── */
function _saveGroqKey(k){try{sessionStorage.setItem("bxk",btoa(unescape(encodeURIComponent(k))));}catch(e){}}
function _getGroqKey(){try{const r=sessionStorage.getItem("bxk");return r?decodeURIComponent(escape(atob(r))):null;}catch(e){return null;}}
function _clearGroqKey(){try{sessionStorage.removeItem("bxk");}catch(e){}}
function fmtDate(){return new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"short",year:"numeric"});}
