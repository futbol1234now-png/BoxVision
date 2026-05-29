/* BoxVision — Búsqueda de cajas y búsqueda por foto */

// ── Búsqueda con debounce — eficiente con miles de cajas ─────────────────────
let _searchTimer=null;
function doSearch(q){
  document.getElementById("searchClear").classList.toggle("hidden",!q);
  clearTimeout(_searchTimer);
  if(!q.trim()){document.getElementById("srWrap").classList.remove("open");return;}
  // Debounce: esperar 180ms antes de buscar (evita buscar en cada tecla)
  _searchTimer=setTimeout(()=>_runSearch(q),180);
}
function _runSearch(q){
  const wrap=document.getElementById("srWrap");
  const ql=q.toLowerCase();
  const hits=[];
  // Búsqueda eficiente: parar al llegar a 12 resultados
  outer: for(let i=0;i<boxes.length;i++){
    const box=boxes[i];
    // Buscar también en nombre y ubicación de la caja
    if(box.name.toLowerCase().includes(ql)||
       (box.location||"").toLowerCase().includes(ql)||
       (box.number||"").toLowerCase().includes(ql)||
       (box.tags||[]).some(t=>t.toLowerCase().includes(ql))){
      hits.push({box,item:box.name,type:"box"});
      if(hits.length>=12) break outer;
    }
    for(let j=0;j<box.items.length;j++){
      if(box.items[j].text.toLowerCase().includes(ql)){
        hits.push({box,item:box.items[j].text,type:"item"});
        if(hits.length>=12) break outer;
      }
    }
  }
  wrap.innerHTML=hits.length
    ?hits.map(h=>`<div class="sr-item" onclick="openDetail('${h.box.id}')">
        <span style="font-size:20px">${getIcon(h.box.name, h.box)}</span>
        <div>
          <b>${esc(h.box.name)}</b>
          ${h.type==="item"?` → ${esc(h.item)}`:'<span style="font-size:11px;color:var(--muted)"> · caja</span>'}
        </div>
      </div>`).join("")
    :`<div class="sr-none">No se encontró "${esc(q)}"</div>`;
  wrap.classList.add("open");
}
function clearSearch(){document.getElementById("searchInput").value="";doSearch("");}

/* ── Búsqueda por foto ────────────────────────────────────────────────── */
function triggerSearchPhoto(){
  // Funciona en celular Y laptop — siempre abre selector de archivos/cámara
  document.getElementById("searchPhotoInput").click();
}

var _searchPhotoToastTimeout = null;
function _showSearchPhotoToast(icon, msg, sub, spinner){
  const t = document.getElementById("searchPhotoToast");
  const ti = document.getElementById("searchPhotoToastIcon");
  const tm = document.getElementById("searchPhotoToastMsg");
  const ts = document.getElementById("searchPhotoToastSub");
  if(!t) return;
  if(spinner){
    ti.innerHTML = '<div class="spt-spinner"></div>';
  } else {
    ti.textContent = icon;
  }
  tm.textContent = msg;
  ts.textContent = sub || "";
  t.classList.add("open");
  clearTimeout(_searchPhotoToastTimeout);
}
function _hideSearchPhotoToast(delay){
  _searchPhotoToastTimeout = setTimeout(function(){
    const t = document.getElementById("searchPhotoToast");
    if(t) t.classList.remove("open");
  }, delay || 0);
}

async function handleSearchPhoto(e){
  const file = e.target.files[0];
  e.target.value = "";
  if(!file) return;

  const btn = document.getElementById("searchPhotoBtn");
  if(btn) btn.classList.add("scanning");
  _showSearchPhotoToast("", "Analizando imagen…", "Identificando el objeto", true);

  // Redimensionar y encodear
  let b64;
  try{
    const enc = await resizeAndEncode(file, 900, 92);
    b64 = enc.b64;
  }catch(err){
    _hideSearchPhotoToast(0);
    if(btn) btn.classList.remove("scanning");
    showToast("❌ No se pudo leer la imagen","#FF3B30");
    return;
  }

  // Pedir a Groq que describa el objeto en pocas palabras
  const systemPrompt = `Eres un asistente de inventario. El usuario te manda una foto de un objeto.
Respondé SOLO con el nombre del objeto en español, en 1-4 palabras, sin puntuación, sin artículos.
Ejemplos: "auriculares Sony negros", "libro rojo tapa dura", "sartén antiadherente", "zapatos deportivos Nike".
Sé específico: incluí color y marca si son visibles. Nada más que el nombre.`;

  const modelos = ["llama-3.2-90b-vision-preview","llama-3.2-11b-vision-preview"];
  let nombreObjeto = null;

  for(const modelo of modelos){
    try{
      const WORKER_URL = (typeof BOX_IA_WORKER !== 'undefined' ? BOX_IA_WORKER : "") + "/chat";
      const res = await fetch(WORKER_URL,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model: modelo,
          max_tokens: 20,
          temperature: 0.1,
          messages:[
            {role:"system", content: systemPrompt},
            {role:"user", content:[
              {type:"image_url", image_url:{url:"data:image/jpeg;base64,"+b64, detail:"low"}},
              {type:"text", text:"¿Qué objeto es este?"}
            ]}
          ]
        })
      });
      const data = await res.json();
      if(res.ok && data.choices?.[0]?.message?.content){
        nombreObjeto = data.choices[0].message.content.trim()
          .replace(/["""''*#\n]/g,"").slice(0,50);
        if(nombreObjeto) break;
      }
    }catch(err){ continue; }
  }

  if(btn) btn.classList.remove("scanning");

  if(!nombreObjeto){
    // Sin IA: intentar usar el nombre del archivo como pista
    const fileName = file ? (file.name||"").replace(/\.[^.]+$/,"").replace(/[_\-]/g," ").trim() : "";
    if(fileName && fileName.length > 2){
      nombreObjeto = fileName;
      _showSearchPhotoToast("🔍", "Buscando: " + nombreObjeto, "por nombre de archivo");
    } else {
      _showSearchPhotoToast("❌","No se pudo identificar el objeto","Conecta Box IA para análisis por foto");
      _hideSearchPhotoToast(2500);
      return;
    }
  }

  // Buscar en las cajas
  _showSearchPhotoToast("🔍", "Buscando: " + nombreObjeto, "en todas tus cajas");

  const input = document.getElementById("searchInput");
  if(input){
    input.value = nombreObjeto;
    doSearch(nombreObjeto);
    // Mostrar el clear button
    const cl = document.getElementById("searchClear");
    if(cl) cl.classList.remove("hidden");
  }

  // Contar resultados
  setTimeout(function(){
    const srWrap = document.getElementById("srWrap");
    const items = srWrap ? srWrap.querySelectorAll(".sr-item") : [];
    const hayResultados = items.length > 0;
    if(hayResultados){
      _showSearchPhotoToast("✅", "\"" + nombreObjeto + "\"", items.length + " caja" + (items.length===1?"":"s") + " encontrada" + (items.length===1?"":"s"));
    } else {
      _showSearchPhotoToast("😕", "No encontré ese objeto", "Probá con otra foto o buscá manual");
    }
    _hideSearchPhotoToast(2200);
  }, 400);
}

