/* BoxVision — Media: fotos, galería, cámara, voz, viewer */

function _previewAddItem(val){
  const wrap=document.getElementById("addPreviewWrap");
  const name=document.getElementById("addPreviewName");
  const icon=document.getElementById("addPreviewIcon");
  if(!wrap||!name||!icon) return;
  const v=(val||"").trim();
  if(!v){wrap.style.display="none";return;}
  wrap.style.display="block";
  name.textContent=v;
  // Mostrar ícono sugerido según el nombre
  const box=boxes.find(b=>b.id===currentBoxId);
  icon.textContent=_getIconLocal(v)||getIcon(v,box)||"📦";
}

function triggerAddFromGallery(){
  const box=boxes.find(b=>b.id===currentBoxId);
  if(box&&box.sealed){showToast(t("toast.sealed.short"),"#FF9500");return;}
  document.getElementById("galleryObjInput").click();
}

async function handleGalleryObj(e){
  const file=e.target.files[0]; e.target.value=""; if(!file) return;
  const box=boxes.find(b=>b.id===currentBoxId); if(!box) return;
  const btn=document.getElementById("scanBtn"); if(btn){btn.classList.add("scanning");}

  let thumb=null, b64=null;
  try{
    const enc=await resizeAndEncode(file,900,96);
    thumb=enc.thumb; b64=enc.b64;
  }catch(err){
    showToast("❌ No se pudo leer la imagen","#FF3B30");
    if(btn) btn.classList.remove("scanning");
    return;
  }
  if(btn) btn.classList.remove("scanning");
  // Mostrar modal de resultado igual que con cámara — pero sin análisis IA inmediato
  showScanResultModal(thumb, box, null);
}

function _showBulkAdd(){
  const box=boxes.find(b=>b.id===currentBoxId);
  if(!box){return;}
  if(box.sealed){showToast(t("toast.sealed"),"#FF9500");return;}
  const ov=document.createElement("div");
  ov.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10010;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(12px)";
  ov.innerHTML=`<div style="background:var(--card);border-radius:24px 24px 0 0;padding:22px 20px calc(22px + env(safe-area-inset-bottom));width:100%;max-width:500px;box-shadow:0 -8px 40px rgba(0,0,0,.4);animation:slideUp .3s cubic-bezier(.16,1,.3,1) both">
    <div style="width:36px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:0 auto 16px"></div>
    <div style="font-size:17px;font-weight:800;margin-bottom:6px;letter-spacing:-.4px">📋 Agregar lista de objetos</div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:14px">Escribe un objeto por línea o separados por coma</div>
    <textarea id="bulkAddTextarea" rows="6" placeholder="Zapatos rojos&#10;Libros de cocina&#10;Lámpara de escritorio&#10;Cable HDMI, adaptador USB…"
      style="width:100%;box-sizing:border-box;background:var(--input);border:1.5px solid var(--border);border-radius:14px;padding:13px;font-size:14px;color:var(--text);font-family:inherit;outline:none;resize:none;transition:border-color .18s"
      onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"></textarea>
    <div id="bulkAddPreview" style="font-size:12px;color:var(--muted);margin-top:6px;min-height:18px"></div>
    <div style="display:flex;gap:10px;margin-top:14px">
      <button onclick="this.closest('[style*=inset]').remove()" style="flex:1;padding:14px;border-radius:14px;border:1.5px solid var(--border);background:transparent;color:var(--text);font-size:15px;font-weight:600;cursor:pointer;font-family:inherit">Cancelar</button>
      <button onclick="_confirmBulkAdd()" style="flex:2;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#0A84FF,#5856D6);color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(10,132,255,.35)">Agregar todos</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.onclick=ev=>{if(ev.target===ov)ov.remove();};
  // Preview en tiempo real
  const ta=ov.querySelector("#bulkAddTextarea");
  const pv=ov.querySelector("#bulkAddPreview");
  ta.addEventListener("input",()=>{
    const items=_parseBulkText(ta.value);
    pv.textContent=items.length>0?`${items.length} objeto${items.length!==1?"s":""} para agregar`:"";
  });
  setTimeout(()=>ta.focus(),300);
}

function _parseBulkText(text){
  if(!text.trim()) return [];
  // Separar por saltos de línea Y comas
  return text.split(/[\n,]+/).map(s=>s.trim()).filter(s=>s.length>0);
}

function _confirmBulkAdd(){
  const ta=document.getElementById("bulkAddTextarea");
  if(!ta) return;
  const items=_parseBulkText(ta.value);
  if(!items.length){showToast("✏️ Escribe al menos un objeto","#FF9500");return;}
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  items.forEach(it=>{
    box.items.push({text:it,done:false,addedAt:Date.now()});
      });
  saveData();renderItems();renderProgress();generateQR(currentBoxId);
  // Cerrar modal
  document.querySelectorAll('[style*="inset:0"][style*="z-index:10010"]').forEach(el=>el.remove());
  showToast(`✅ ${items.length} objeto${items.length!==1?"s":""} agregado${items.length!==1?"s":""}!`,"#34C759");
  // Stagger slide-in para los nuevos items
  const list2=document.getElementById("itemsList");
  if(list2){
    const rows=list2.querySelectorAll(".item-row");
    const start=Math.max(0,rows.length-items.length);
    for(let i=start;i<rows.length;i++){
      const r=rows[i];
      void r.offsetWidth;
      r.style.animationDelay=(i-start)*55+"ms";
      r.classList.add("item-row--new");
    }
    if(rows.length) rows[rows.length-1].scrollIntoView({behavior:"smooth",block:"nearest"});
  }
}

function _zoomItemThumb(src){
  const ov=document.createElement("div");
  ov.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:10020;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease;backdrop-filter:blur(14px)";
  ov.innerHTML=`<div style="position:relative;max-width:92vw;max-height:80vh">
    <img src="${src}" style="max-width:92vw;max-height:80vh;border-radius:18px;object-fit:contain;box-shadow:0 24px 80px rgba(0,0,0,.6)"/>
    <button onclick="this.closest('[style]').remove()" style="position:absolute;top:-14px;right:-14px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)">✕</button>
  </div>`;
  ov.onclick=ev=>{if(ev.target===ov)ov.remove();};
  document.body.appendChild(ov);
}



// ── Resize y encode de imágenes ──
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

// _noteTimer declarado en utils.js
function saveNote(){
  clearTimeout(_noteTimer);
  _noteTimer=setTimeout(()=>{
    const box=boxes.find(b=>b.id===currentBoxId);
    if(box){box.note=document.getElementById("noteArea").value;saveData();}
  },500);
}
function toggleFav(){
  const box=boxes.find(b=>b.id===currentBoxId); if(!box) return;
  box.fav=!box.fav; saveData();
  const fb=document.getElementById("favBtn");
  if(fb) fb.classList.toggle("active", box.fav);
  showToast(box.fav?"⭐ Agregada a favoritas":"☆ Quitada de favoritas", box.fav?"#FFD60A":"#8E8E93");
}
// toggleFavId movida a utils.js

function renderRelated(){
  const box=boxes.find(b=>b.id===currentBoxId);const sec=document.getElementById("relatedSec");
  if(!box||!box.related){sec.style.display="none";return;}
  const rel=boxes.find(b=>b.id===box.related);if(!rel){sec.style.display="none";return;}
  sec.style.display="block";
  document.getElementById("relatedList").innerHTML=`<div class="rel-item" onclick="openDetail('${rel.id}')"><span style="font-size:20px">${getIcon(rel.name, rel)}</span><span class="rel-name">${esc(rel.name)}</span><span class="rel-sub">${rel.items.length} objetos ›</span></div>`;
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

function showQuickQR(){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  const m=document.createElement("div");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10010;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(14px);animation:fadeIn .2s ease";
  m.innerHTML=`<div style="background:var(--card);border-radius:26px;padding:28px 24px;width:min(320px,90vw);text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.6)">
    <div style="font-size:18px;font-weight:800;margin-bottom:4px;letter-spacing:-.4px">${esc(box.name)}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:18px">${box.number?"#"+box.number+" · ":""}Escanea para ver contenido</div>
    <div id="quickQRContainer" style="display:flex;justify-content:center;padding:10px;background:#fff;border-radius:16px;margin-bottom:18px"></div>
    <button onclick="this.closest('[style]').remove()" style="width:100%;padding:14px;border-radius:14px;border:none;background:var(--accent);color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit">Cerrar</button>
  </div>`;
  document.body.appendChild(m);
  m.onclick=ev=>{if(ev.target===m)m.remove();};
  // Generar QR dentro del modal
  setTimeout(()=>{
    const el=document.getElementById("quickQRContainer");if(!el) return;
    const payload={n:box.name,num:box.number,loc:box.location,col:box.color,
      tags:(box.tags||[]).slice(0,5),items:box.items.slice(0,20).map(i=>({t:i.text.slice(0,40),d:i.done?1:0})),
      date:box.date,note:(box.note||"").slice(0,100),pri:box.priority,brand:settings.brand};
    const data=btoa(encodeURIComponent(JSON.stringify(payload)));
    // FIX BUG #3: evitar doble slash cuando pathname termina en "/"
    const _qrBase=(location.origin+location.pathname).replace(/\/[^\/]*$/,"/").replace(/([^:])\/\//g,"$1/");
    const url=_qrBase+'viewer.html#view/'+data;
    try{new QRCode(el,{text:url,width:200,height:200,correctLevel:QRCode.CorrectLevel.M});}catch(e){el.textContent="Error generando QR";}
  },80);
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
  // FIX BUG #3: evitar doble slash cuando pathname termina en "/"
  const _qrBase2=(location.origin+location.pathname).replace(/\/[^\/]*$/,"/").replace(/([^:])\/\//g,"$1/");
  const url=_qrBase2+'viewer.html#view/'+data;
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

// ── Reconocimiento de voz ──
// voiceRecog declarado en utils.js
function startVoice(){
  const box=boxes.find(b=>b.id===currentBoxId);
  if(box&&box.sealed){showToast(t("toast.sealed"),"#FF9500");return;}
  if(!("webkitSpeechRecognition" in window||"SpeechRecognition" in window)){
    showToast("Voz no disponible en este navegador","#636366");return;
  }
  const SpeechRec=window.SpeechRecognition||window.webkitSpeechRecognition;
  voiceRecog=new SpeechRec();
  voiceRecog.lang="es-ES";
  voiceRecog.interimResults=false;
  voiceRecog.maxAlternatives=1;
  const btn=document.getElementById("micBtn");
  if(btn){btn.classList.add("recording");}
  showToast("🎤 Habla... separa objetos con comas","#5856D6");
  const capturedBoxId=currentBoxId; // capture before async
  voiceRecog.onresult=e=>{
    const text=e.results[0][0].transcript;
    const items=text.split(/,|y(?= )|;/).map(s=>s.trim()).filter(s=>s.length>1);
    const b=boxes.find(x=>x.id===capturedBoxId); if(!b) return;
    items.forEach(it=>{b.items.push({text:it,done:false});});
    saveData();renderItems();renderProgress();generateQR(currentBoxId);
    showToast(`🎤 ${items.length} objeto${items.length!==1?"s":""} agregado${items.length!==1?"s":""}!`,"#5856D6");
  };
  const VOICE_ERRORS={
    "not-allowed":"Permiso de micrófono denegado. Habilitalo en la configuración del navegador.",
    "network":"Error de red. Verificá tu conexión.",
    "no-speech":"No se detectó voz. Intentá de nuevo.",
    "audio-capture":"No se encontró micrófono en el dispositivo.",
    "aborted":"Escucha cancelada.",
    "service-not-allowed":"Servicio de voz no disponible.",
  };
  voiceRecog.onerror=e=>{
    const msg=VOICE_ERRORS[e.error]||("Error de voz: "+e.error);
    showToast(msg,"#FF3B30");
    // Si el micrófono fue denegado permanentemente, deshabilitar el botón
    if(e.error==="not-allowed"||e.error==="service-not-allowed"){
      const b=document.getElementById("micBtn");
      if(b){b.disabled=true;b.title="Permiso de micrófono denegado";b.style.opacity=".4";}
    }
  };
  voiceRecog.onend=()=>{const b=document.getElementById("micBtn");if(b){b.classList.remove("recording");}voiceRecog=null;}; // FIX E
  voiceRecog.start();
}


// _viewerItems declarado en utils.js
function filterViewerItems(q){
  const col=window._viewerColor||"#007AFF";
  const filtered=q?_viewerItems.filter(it=>it.text.toLowerCase().includes(q.toLowerCase())):_viewerItems;
  const vi=document.getElementById("vItems");
  vi.innerHTML=!filtered.length
    ?'<div style="text-align:center;padding:24px;color:var(--muted);font-size:14px">No encontrado</div>'
    :filtered.map((it,i)=>`<div class="vh-item" style="animation-delay:${i*0.03}s"><div class="vh-nbadge" style="background:${col}">${_viewerItems.indexOf(it)+1}</div><div class="vh-itext${it.done?" done":""}">${esc(it.text)}</div></div>`).join("");
}


// BUG FIX #2: helper para convertir hex a rgba (rgba() no existe nativamente en JS)
// hexToRgba movida a utils.js

// ═══ BOX IA — Motor con API Anthropic ═══
