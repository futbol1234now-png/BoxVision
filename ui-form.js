/* BoxVision — Formularios: nueva/editar caja, items, scan */

function addItem(){
  const inp=document.getElementById("addItemInput"),val=inp.value.trim();if(!val) return;
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  if(box.sealed){showToast(t("toast.sealed"),"#FF9500");return;}
  box.items.push({text:val,done:false,addedAt:Date.now()});  inp.value="";
  // Limpiar preview
  const pw=document.getElementById("addPreviewWrap");if(pw) pw.style.display="none";
  const sw=document.getElementById("suggestionsWrap");if(sw) sw.classList.remove("show");
  saveData();renderItems();renderProgress();generateQR(currentBoxId);
  // Haptic feedback + scroll + slide-in animation
  if(navigator.vibrate) navigator.vibrate(8);
  const list=document.getElementById("itemsList");
  if(list){
    const rows=list.querySelectorAll(".item-row");
    const newRow=rows[rows.length-1];
    if(newRow){
      void newRow.offsetWidth;
      newRow.classList.add("item-row--new");
      setTimeout(()=>newRow.scrollIntoView({behavior:"smooth",block:"nearest"}),80);
    }
  }
}
function delItem(idx){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  if(box.sealed){showToast(t("toast.sealed"),"#FF9500");return;}
    box.items.splice(idx,1);saveData();renderItems();renderProgress();generateQR(currentBoxId);
}
function triggerScanObj(){
  const box=boxes.find(b=>b.id===currentBoxId);
  if(box&&box.sealed){showToast(t("toast.sealed.short"),"#FF9500");return;}
  document.getElementById("scanObjInput").click();
}

// Rate limiting para el scan IA — evita peticiones accidentales repetidas
var _lastScanTime=0;
async function handleScanObj(e){
  const file=e.target.files[0]; e.target.value=""; if(!file) return;
  const now=Date.now();
  if(now-_lastScanTime<2000){showToast("⏱️ Espera un momento antes de escanear de nuevo","#FF9500");return;}
  _lastScanTime=now;
  const box=boxes.find(b=>b.id===currentBoxId); if(!box) return;
  const btn=document.getElementById("scanBtn"); if(btn){btn.classList.add("scanning");}
  btn.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="6" style="pointer-events:none"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg></i>'; btn.disabled=true;

  let thumb=null, b64=null;
  try{
    const enc=await resizeAndEncode(file,900,96);
    thumb=enc.thumb; b64=enc.b64;
  }catch(err){
    showToast("❌ No se pudo leer la imagen","#FF3B30");
    btn.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" style="pointer-events:none"/><circle cx="12" cy="13" r="4"/></svg></i>'; btn.classList.remove("scanning"); btn.disabled=false; return;
  }

  const connected=localStorage.getItem("boxia_connected");
  let analisis=null;

  // CONFIG: URL centralizada del proxy IA — definida en BOX_IA_WORKER (ver arriba)
  const WORKER_URL = BOX_IA_WORKER + "/chat";

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
        const res=await fetch(WORKER_URL,{
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
      }catch(err){
        console.warn("Error",modelo,":",err.message);
        if(err.message&&(err.message.includes('fetch')||err.message.includes('network')||err.message.includes('Failed'))){
          // Sin internet — salir del loop, no reintentar
          break;
        }
      }
    }
    document.getElementById("scanLoadingModal")?.remove();
    if(!analisis) showToast("📡 Sin conexión — puedes agregar el objeto manualmente","#FF9500");
  }

  btn.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" style="pointer-events:none"/><circle cx="12" cy="13" r="4"/></svg></i>'; btn.classList.remove("scanning"); btn.disabled=false;
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
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:10001;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(14px)";

  const cc={"Electrónica":"#0A84FF","Ropa":"#FF2D55","Cocina":"#FF9500","Libros":"#34C759","Herramientas":"#FF6B00","Decoración":"#AF52DE","Documentos":"#FFD60A","Juguetes":"#FF375F","Deportes":"#30D158","Muebles":"#636366","Higiene":"#5AC8FA","Alimentos":"#FFD60A"};
  const catColor=cc[a?.categoria]||"#8E8E93";
  const fragilBadge=a?.fragil?`<span style="background:rgba(255,59,48,.15);color:#FF3B30;border-radius:8px;padding:3px 9px;font-size:11px;font-weight:700">🫧 FRÁGIL</span>`:"";
  const cantBadge=a?.cantidad>1?`<span style="background:rgba(10,132,255,.15);color:#0A84FF;border-radius:8px;padding:3px 9px;font-size:11px;font-weight:700">${a.cantidad}x</span>`:"";
  const catBadge=a?.categoria?`<span style="background:${catColor}22;color:${catColor};border-radius:8px;padding:3px 11px;font-size:11px;font-weight:700">${a.categoria}</span>`:"";
  const tags=a?.tags?.length?`<div style="display:flex;flex-wrap:wrap;gap:5px;margin:10px 0 0">${a.tags.map(t=>`<span style="background:rgba(255,255,255,.07);color:#8E8E93;border-radius:7px;padding:3px 9px;font-size:12px">#${esc(t)}</span>`).join("")}</div>`:"";
  const nota=a?.nota?`<div style="background:rgba(255,149,0,.1);border:1px solid rgba(255,149,0,.25);border-radius:12px;padding:10px 13px;margin-top:10px;font-size:12px;color:#FF9500">💡 ${esc(a.nota)}</div>`:"";
  const desc=a?.descripcion?`<div style="font-size:13px;color:#8E8E93;margin-top:4px;line-height:1.4">${esc(a.descripcion)}</div>`:"";
  const iaLabel=!a
    ?`<div style="display:flex;align-items:center;gap:6px;font-size:13px;color:#FF9500;margin-bottom:10px">📷 <span>Foto guardada — escribe el nombre del objeto</span></div>`
    :(a.nombre?`<div style="display:flex;align-items:center;gap:6px;font-size:13px;color:#34C759;margin-bottom:6px">✦ <span>Box IA identificó el objeto</span></div>`:"");
  const fragilBtn=a?.fragil&&box.priority!=="red"
    ?`<button onclick="sugerirPrioridadFragil()" style="width:100%;margin-top:8px;padding:12px;border-radius:13px;border:1px solid rgba(255,59,48,.3);background:rgba(255,59,48,.08);color:#FF3B30;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">🫧 Marcar caja como urgente (objeto frágil)</button>`:"";

  m.innerHTML=`<div style="background:var(--card,#1C1C1E);border-radius:26px 26px 0 0;width:100%;max-width:500px;box-shadow:0 -8px 50px rgba(0,0,0,.5);animation:slideUp .3s cubic-bezier(.16,1,.3,1) both;max-height:92vh;overflow-y:auto">
    <!-- Handle -->
    <div style="padding:14px 20px 0;text-align:center"><div style="width:36px;height:4px;background:rgba(255,255,255,.18);border-radius:2px;margin:0 auto"></div></div>

    <!-- Foto GRANDE - tappable para zoom -->
    <div class="scan-result-photo-wrap" style="margin:14px 16px 0;max-height:none" onclick="_zoomItemThumb('${thumb}')">
      <img src="${thumb}" style="width:100%;height:auto;max-height:260px;object-fit:cover;border-radius:16px;display:block"/>
      <div class="scan-result-photo-zoom">🔍 Ver en grande</div>
    </div>

    <div style="padding:14px 16px 0">
      ${iaLabel}
      <!-- Badges -->
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:${desc?"6px":"12px"}">${catBadge}${fragilBadge}${cantBadge}</div>
      ${desc}${tags}${nota}

      <!-- Nombre editable con ícono grande -->
      <div style="font-size:11px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px">✏️ Nombre del objeto</div>
      <div class="scan-result-name-edit">
        <span class="edit-icon" id="scanEditIcon">${a?.nombre?(_getIconLocal(a.nombre)||"📦"):"📦"}</span>
        <input id="scanNameInput" type="text" value="${esc(a?.nombre||"")}" placeholder="Ej: Cubo de Rubik, Lámpara…"
          onkeydown="if(event.key==='Enter')confirmScanName()"
          oninput="const ic=document.getElementById('scanEditIcon');if(ic)ic.textContent=_getIconLocal(this.value)||'📦'"/>
      </div>
      ${a?.cantidad>1?`<div style="font-size:12px;color:#8E8E93;margin-bottom:10px">💡 Se detectaron ${a.cantidad} objetos similares — se guarda uno a la vez.</div>`:""}

      <!-- Botones -->
      <div style="display:flex;gap:10px;margin-top:14px;padding-bottom:calc(16px + env(safe-area-inset-bottom))">
        <button onclick="document.getElementById('scanNameModal').remove()" style="flex:1;padding:15px;border-radius:15px;border:none;background:rgba(255,255,255,.08);color:#fff;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit">Cancelar</button>
        <button onclick="confirmScanName()" style="flex:2;padding:15px;border-radius:15px;border:none;background:linear-gradient(135deg,#FF9500,#FF6000);color:#fff;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 16px rgba(255,149,0,.3)">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="vertical-align:-2px;margin-right:6px"><polyline points="20 6 9 17 4 12"/></svg>Guardar en caja
        </button>
      </div>
      ${fragilBtn}
    </div>
  </div>`;

  document.body.appendChild(m);
  m._thumb=thumb; m._box=box; m._analisis=a;
  m.onclick=ev=>{if(ev.target===m)m.remove();};
  setTimeout(()=>{
    const inp=document.getElementById("scanNameInput");
    if(inp){inp.focus();if(a?.nombre)inp.select();}
  },300);
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
  box.items.push({text:nombre,done:false,thumb,addedAt:Date.now()});
    saveData();renderItems();renderProgress();generateQR(currentBoxId);
  m.remove();
  // Haptic feedback en celular
  if(navigator.vibrate) navigator.vibrate([10,30,10]);
  showToast("✅ "+nombre+" guardado","#34C759");
  // Marcar el item más reciente con flash visual
  setTimeout(()=>{
    const rows=document.querySelectorAll(".item-row");
    if(rows.length){rows[rows.length-1].classList.add("item-row--new");}
    // Scroll al ítem recién agregado
    const itemsList=document.getElementById("itemsList");
    if(itemsList){itemsList.lastElementChild?.scrollIntoView({behavior:"smooth",block:"nearest"});}
  },80);
}


// ── Exportar, confirm dialog, deletedIds ──
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
  navigator.clipboard.writeText(txt).then(()=>showToast("✓ Copiado al portapapeles","#34C759")).catch(()=>showToast("No se pudo copiar","#FF3B30"));
}
function dupBox(){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  const nb={...JSON.parse(JSON.stringify(box)),id:genId(),name:box.name+" (copia)",date:fmtDate(),lastUsed:0,fav:false,history:[],sealed:false};
  nb.photo=null;
  nb.items=nb.items.map(i=>({text:i.text,done:i.done}));
  boxes.push(nb);saveData();showToast("⧉ Copia creada: "+nb.name,"#5856D6");goMain();
}
function confirmDupBox(){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  _showConfirm({
    icon:"⧉",
    title:"Duplicar caja",
    msg:"Se creará una copia de <strong>"+esc(box.name)+"</strong> con todos sus objetos.",
    confirmLabel:"Duplicar",
    confirmColor:"#0A84FF",
    onConfirm: dupBox
  });
}
function confirmDelBox(){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  _showConfirm({
    icon:"🗑️",
    title:"Eliminar caja",
    msg:"¿Eliminar <strong>"+esc(box.name)+"</strong>? Esta acción no se puede deshacer.",
    confirmLabel:"Eliminar",
    confirmColor:"#FF3B30",
    onConfirm: delBox
  });
}
function delBox(){
  const id=currentBoxId;
  _registerDeletedBox(id);
  boxes.forEach(b=>{ if(b.related===id) b.related=null; });
  rooms.forEach(r=>{ r.boxIds=r.boxIds.filter(bid=>bid!==id); });
  boxes=boxes.filter(b=>b.id!==id);
  saveData(); saveRooms();
  showToast("🗑️ Caja eliminada","#FF3B30");
  setTimeout(()=>goMain(),400);
}
function _showConfirm({icon,title,msg,confirmLabel,confirmColor,onConfirm}){
  const overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .2s ease";
  overlay.innerHTML=`
    <div style="background:var(--card);border-radius:24px 24px 0 0;padding:28px 24px 36px;width:100%;max-width:480px;box-shadow:0 -4px 40px rgba(0,0,0,.4)">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:44px;margin-bottom:12px">${icon}</div>
        <div style="font-size:19px;font-weight:800;margin-bottom:8px;color:var(--text)">${title}</div>
        <div style="font-size:14px;color:var(--muted);line-height:1.5">${msg}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button id="_bvConfirmBtn" style="width:100%;padding:16px;background:${confirmColor};color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit">${confirmLabel}</button>
        <button id="_bvCancelBtn" style="width:100%;padding:16px;background:var(--card2);color:var(--muted);border:0.5px solid var(--border);border-radius:14px;font-size:16px;font-weight:600;cursor:pointer;font-family:inherit">Cancelar</button>
      </div>
    </div>`;
  window._bvConfirmCb = onConfirm;
  overlay.querySelector('button').onclick = function(){
    overlay.remove();
    window._bvConfirmCb && window._bvConfirmCb();
    window._bvConfirmCb = null;
  };
  overlay.querySelectorAll('button')[1].onclick = function(){ overlay.remove(); window._bvConfirmCb=null; };
  overlay.addEventListener("click",e=>{ if(e.target===overlay){ overlay.remove(); window._bvConfirmCb=null; } });
  document.body.appendChild(overlay);
}

function _registerDeletedBox(id){
  if(!currentUser) return;
  // Guardar en localStorage
  const key="cb-deleted-"+currentUser.uid;
  let deleted=[];
  try{ deleted=JSON.parse(localStorage.getItem(key)||"[]"); }catch(e){}
  if(!deleted.includes(id)){ deleted.push(id); localStorage.setItem(key,JSON.stringify(deleted)); }
  // Guardar en Firestore
  if(db){
    db.collection("users").doc(currentUser.uid).set(
      {deletedIds: firebase.firestore.FieldValue.arrayUnion(id)},
      {merge:true}
    ).catch(()=>{});
  }
}

function _getDeletedIds(){
  if(!currentUser) return [];
  try{ return JSON.parse(localStorage.getItem("cb-deleted-"+currentUser.uid)||"[]"); }catch(e){ return []; }
}

