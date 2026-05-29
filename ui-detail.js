/* BoxVision — Pantalla de detalle de caja e items */

function openDetail(id){
  const box=boxes.find(b=>b.id===id);if(!box) return;
  if(box.password){
    const ov=document.getElementById("pwOverlay");
    document.getElementById("pwBoxName").textContent=box.name;
    document.getElementById("pwBoxIcon").textContent=getIcon(box.name, box);
    document.getElementById("pwInput").value="";
    syncPwDots("");
    const errEl=document.getElementById("pwError");if(errEl)errEl.textContent="";
    ov.style.display="flex";
    window._pwTargetId=id;
    setTimeout(()=>document.getElementById("pwInput").focus(),120);
    return;
  }
  _doOpenDetail(id);
}
function closePwModal(){document.getElementById("pwOverlay").style.display="none";window._pwTargetId=null;}
function checkPassword(){
  const id=window._pwTargetId;
  const box=boxes.find(b=>b.id===id);
  if(!box) return;
  const entered=document.getElementById("pwInput").value;
  const errEl=document.getElementById("pwError");

  // Tiempo constante para evitar timing attacks (siempre esperar al menos 200ms)
  const t0=Date.now();
  const proceed=()=>{
    const elapsed=Date.now()-t0;
    const wait=Math.max(0,200-elapsed);
    setTimeout(()=>{
      if(entered===box.password){
        document.getElementById("pwOverlay").style.display="none";
        _doOpenDetail(id);
      }else{
        const input=document.getElementById("pwInput");
        input.value="";
        syncPwDots("");
        for(let i=0;i<4;i++){
          const d=document.getElementById("pwd"+i);
          if(d){d.classList.add("error");setTimeout(()=>d.classList.remove("error"),600);}
        }
        input.style.animation="none";
        requestAnimationFrame(()=>{input.style.animation="pwShake .4s ease";});
        if(errEl) errEl.textContent="Contraseña incorrecta";
        setTimeout(()=>{if(errEl)errEl.textContent="";},2500);
        setTimeout(()=>input.focus(),50);
        if(navigator.vibrate) navigator.vibrate([60,30,60]);
      }
    }, wait);
  };
  proceed();
}
// Alias para compatibilidad
function submitPw(){ checkPassword(); }
function _doOpenDetail(id){
  const box=boxes.find(b=>b.id===id);if(!box) return;
  currentBoxId=id;box.lastUsed=Date.now();saveData();
  showScreen("detailScreen");
  document.getElementById("detailScreen").style.animation="slideUpScreen var(--dur-slow,420ms) var(--ease-out-expo,cubic-bezier(0.16,1,0.3,1)) both";
  const col=box.color||"#007AFF";
  document.getElementById("dHero").style.background=`linear-gradient(135deg,${col},${hexToRgba(col,.6)})`;
  const hi=document.getElementById("dHeroImg");
  if(box.photo){hi.src=box.photo;hi.classList.remove("hidden");}else hi.classList.add("hidden");
  document.getElementById("dIcon").textContent=getIcon(box.name, box);
  if(!box.icon) setTimeout(()=>fetchSmartIcon(box), 0);
  document.getElementById("dNum").textContent=box.number?`Caja #${box.number} ${PRI[box.priority]||""}`:PRI[box.priority]||"";
  document.getElementById("dName").textContent=box.name;
  const fb=document.getElementById("favBtn");
  if(fb) fb.classList.toggle("active", !!box.fav);
  const meta=[];
  if(box.location) meta.push("📍 "+box.location);
  if(box.weight) meta.push("⚖️ "+box.weight+"kg");
  if(box.date) meta.push("📅 "+box.date);
  (box.tags||[]).forEach(t=>meta.push(t));
  document.getElementById("dMeta").innerHTML=meta.map(m=>`<span class="dh-tag">${esc(m)}</span>`).join("");
  document.getElementById("noteArea").value=box.note||"";
  document.getElementById("detailDate").textContent="Creada el "+(box.date||"—");
  renderProgress();renderItems();renderPhotoArea();renderRelated();generateQR(id);
  setTimeout(syncMobileElements, 100);
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
  const titleEl=document.getElementById("itemsTitle");
  if(titleEl) titleEl.innerHTML=`<span class="dsec-title-icon dsec-icon-cont"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></i></span>CONTENIDO (${box.items.length} obj · ${done} sacado${done!==1?"s":""})`;
  const addRow=document.getElementById("addRow");
  if(addRow) addRow.style.display=box.sealed?"none":"flex";
  document.getElementById("itemsList").innerHTML=box.items.length===0
    ?funnyEmpty()
    :box.items.map((it,i)=>{
      const icon=_getIconLocal(it.text)||"📦";
      const sub=[];
      if(it.category) sub.push(it.category);
      if(it.note) sub.push(it.note);
      const subTxt=sub.join(" · ");
      const doneChk=it.done
        ?`<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`
        :"";
      return `<div class="item-row${it.thumb?' item-row--photo':''}" onclick="openItemDetail(${i})">
        ${it.thumb
          ?`<div class="item-thumb-wrap" onclick="event.stopPropagation();openItemDetail(${i})">
              <img src="${esc(it.thumb)}" class="item-thumb${it.done?' item-thumb--done':''}" loading="lazy"/>
            </div>`
          :`<div class="i-icon${it.done?' done':''}">${icon}</div>`}
        <div class="i-chk${it.done?" done":""}" style="${it.done?"background:"+col+";box-shadow:0 2px 8px "+col+"55":""}" onclick="event.stopPropagation();toggleItem(${i})">${doneChk}</div>
        <div class="i-info">
          <div class="i-txt${it.done?" done":""}">${esc(it.text)}</div>
          ${subTxt?`<div class="i-sub">${esc(subTxt)}</div>`:""}
        </div>
        <svg class="i-chev" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        <button class="i-del" onclick="event.stopPropagation();delItem(${i})">✕</button>
      </div>`;
    }).join("");
}

function toggleItem(idx){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  box.items[idx].done=!box.items[idx].done;
  // Vibración háptica suave
  if(navigator.vibrate) navigator.vibrate(box.items[idx].done?[12,8,8]:8);
    saveData();renderItems();renderProgress();generateQR(currentBoxId);
  if(box.items[idx].done){
    animoToast();
    // Toast con opción deshacer
    const itemName=box.items[idx].text;
    showToastUndo("✅ "+itemName+" sacado",()=>{
      box.items[idx].done=false;
            saveData();renderItems();renderProgress();generateQR(currentBoxId);
    });
  }
  if(box.items.length>0&&box.items.every(i=>i.done)) setTimeout(launchConfetti,200);
}


// ══════════════════════════════════════════════════
// ITEM DETAIL BOTTOMSHEET
// ══════════════════════════════════════════════════
let _idsIdx = -1;

function openItemDetail(idx){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  const it=box.items[idx];if(!it) return;
  _idsIdx=idx;
  const col=box.color||"#007AFF";
  const icon=_getIconLocal(it.text)||"📦";

  // Header gradient con color de la caja
  document.getElementById("idsHeader").style.background=
    `linear-gradient(160deg,${col},rgba(88,86,214,.62))`;
  document.getElementById("idsHeader").style.setProperty("--ids-col",col);

  // Foto vs icono
  const bigIcon=document.getElementById("idsBigIcon");
  const bigPhoto=document.getElementById("idsBigPhoto");
  if(it.thumb){
    bigIcon.style.display="none";
    bigPhoto.style.display="block";
    bigPhoto.src=it.thumb;
  } else {
    bigIcon.style.display="block";
    bigIcon.textContent=icon;
    bigPhoto.style.display="none";
  }

  // Nombre y categoría
  document.getElementById("idsName").textContent=it.text;
  const catEl=document.getElementById("idsCat");
  if(it.category){catEl.style.display="block";catEl.textContent=it.category;}
  else catEl.style.display="none";

  // Badge estado
  const badge=document.getElementById("idsBadge");
  badge.textContent=it.done?"✅ Sacado":"⏳ Pendiente";
  badge.style.background=it.done?"rgba(52,199,89,.25)":"rgba(255,255,255,.18)";

  // Foto full
  const photoSec=document.getElementById("idsPhotoSec");
  const photoFull=document.getElementById("idsPhotoFull");
  if(it.thumb){photoSec.style.display="block";photoFull.src=it.thumb;}
  else photoSec.style.display="none";

  // Nota
  const noteSec=document.getElementById("idsNoteSec");
  if(it.note){noteSec.style.display="block";document.getElementById("idsNoteText").textContent=it.note;}
  else noteSec.style.display="none";

  // Info extra
  const infoParts=[];
  infoParts.push(`<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px">📅 ${it.addedAt?new Date(it.addedAt).toLocaleDateString("es-PE",{day:"numeric",month:"short",year:"numeric"}):"—"}</span>`);
  infoParts.push(`<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px">${icon} ${esc(it.text)}</span>`);
  if(it.thumb) infoParts.push(`<span style="display:inline-flex;align-items:center;gap:6px">📷 Con foto</span>`);
  document.getElementById("idsInfoContent").innerHTML=infoParts.join("");

  // Botón done
  const btnDone=document.getElementById("idsBtnDone");
  const btnDoneTxt=document.getElementById("idsBtnDoneTxt");
  if(it.done){
    btnDone.classList.add("is-done");
    btnDoneTxt.textContent="Devolver a caja";
  } else {
    btnDone.classList.remove("is-done");
    btnDoneTxt.textContent="Marcar sacado";
  }

  // Mostrar sheet
  const sheet=document.getElementById("itemDetailSheet");
  sheet.style.display="flex";
  void sheet.offsetWidth;
  sheet.classList.add("open");
  if(navigator.vibrate) navigator.vibrate(6);
}

function closeItemDetail(){
  const sheet=document.getElementById("itemDetailSheet");
  sheet.style.display="none";
  sheet.classList.remove("open");
  _idsIdx=-1;
}

function idsToggleDone(){
  if(_idsIdx<0) return;
  toggleItem(_idsIdx);
  closeItemDetail();
}

function idsDelete(){
  if(_idsIdx<0) return;
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  const name=box.items[_idsIdx].text;
  closeItemDetail();
  delItem(_idsIdx);
  showToast("🗑️ "+name+" eliminado","#FF3B30");
}

function idsEdit(){
  if(_idsIdx<0) return;
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  const it=box.items[_idsIdx];
  closeItemDetail();
  // Reusar el modal de agregar objeto en modo edición
  _aimEditIdx=_idsIdx;
  document.getElementById("aimName").value=it.text||"";
  document.getElementById("aimCategory").value=it.category||"";
  document.getElementById("aimNote").value=it.note||"";
  _aimPhotoData=it.thumb||null;
  if(_aimPhotoData){
    const pw=document.getElementById("aimPhotoPreviewWrap");
    const pi=document.getElementById("aimPhotoPreviewImg");
    if(pw&&pi){pi.src=_aimPhotoData;pw.style.display="block";}
    document.getElementById("aimPhotoLabel").textContent="Foto actual ✓";
    document.getElementById("aimRemovePhotoBtn").style.display="block";
  } else {
    document.getElementById("aimPhotoPreviewWrap").style.display="none";
    document.getElementById("aimPhotoLabel").textContent="Agregar foto";
    document.getElementById("aimRemovePhotoBtn").style.display="none";
  }
  const col=box.color||"#007AFF";
  document.getElementById("aimPreviewBg").style.background=
    `linear-gradient(160deg,${col},rgba(88,86,214,.75))`;
  // Cambiar botón a "Guardar cambios"
  const saveBtn=document.querySelector("#addItemModal .m-btn.m-primary");
  if(saveBtn) saveBtn.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="vertical-align:-2px;margin-right:6px"><polyline points="20 6 9 17 4 12"/></svg>Guardar cambios';
  updateAimPreview();
  const ov=document.getElementById("addItemOverlay");
  ov.style.display="flex";
  setTimeout(()=>document.getElementById("aimName").focus(),120);
}
// ══════════════════════════════════════════════════

// ══════════════════════════════════════════════════
// MODAL AGREGAR OBJETO
// ══════════════════════════════════════════════════
let _aimPhotoData = null; // base64 thumb para el item

let _aimEditIdx=-1; // -1 = nuevo, >=0 = editar ese índice
function openAddItemModal(){
  const box=boxes.find(b=>b.id===currentBoxId);
  if(!box) return;
  if(box.sealed){showToast(t("toast.sealed"),"#FF9500");return;}
  _aimEditIdx=-1;
  // Reset botón guardar
  const saveBtn=document.querySelector("#addItemModal .m-btn.m-primary");
  if(saveBtn) saveBtn.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="vertical-align:-2px;margin-right:6px"><polyline points="20 6 9 17 4 12"/></svg>Agregar objeto';
  // Reset campos
  document.getElementById("aimName").value="";
  document.getElementById("aimCategory").value="";
  document.getElementById("aimNote").value="";
  _aimPhotoData=null;
  document.getElementById("aimPhotoLabel").textContent="Agregar foto";
  document.getElementById("aimRemovePhotoBtn").style.display="none";
  document.getElementById("aimPhotoPreviewWrap").style.display="none";
  // Sincronizar color de la caja con el gradiente del preview
  const col=box.color||"#007AFF";
  document.getElementById("aimPreviewBg").style.background=
    `linear-gradient(160deg,${col},rgba(88,86,214,.75))`;
  updateAimPreview();
  // Mostrar overlay
  const ov=document.getElementById("addItemOverlay");
  ov.style.display="flex";
  ov.style.animation="fadeIn .2s ease";
  setTimeout(()=>document.getElementById("aimName").focus(),120);
}

function closeAddItemModal(e){
  if(e && e.target!==document.getElementById("addItemOverlay")) return;
  document.getElementById("addItemOverlay").style.display="none";
  _aimPhotoData=null;
}

function updateAimPreview(){
  const name=(document.getElementById("aimName").value||"").trim();
  const cat=(document.getElementById("aimCategory").value||"").trim();
  const nameEl=document.getElementById("aimPreviewName");
  const metaEl=document.getElementById("aimPreviewMeta");
  const iconEl=document.getElementById("aimPreviewIcon");
  const badgeEl=document.getElementById("aimPreviewBadge");
  if(nameEl) nameEl.textContent=name||"Nuevo objeto";
  if(metaEl){
    if(cat) metaEl.textContent=cat;
    else if(name) metaEl.textContent="Sin categoría";
    else metaEl.textContent="Escribe el nombre abajo";
  }
  if(iconEl) iconEl.textContent=_getIconLocal(name)||(name?"📦":"📦");
  if(badgeEl){
    if(_aimPhotoData){badgeEl.style.display="inline-block";badgeEl.textContent="📷 Con foto";}
    else{badgeEl.style.display="none";}
  }
}

function setAimCat(cat){
  document.getElementById("aimCategory").value=cat;
  updateAimPreview();
}

function handleAimPhoto(e){
  const file=e.target.files[0];if(!file) return;
  const reader=new FileReader();
  reader.onload=function(ev){
    // Comprimir igual que los otros thumbs
    const img=new Image();
    img.onload=function(){
      const MAX=320,canvas=document.createElement("canvas");
      const scale=Math.min(MAX/img.width,MAX/img.height,1);
      canvas.width=Math.round(img.width*scale);
      canvas.height=Math.round(img.height*scale);
      canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
      _aimPhotoData=canvas.toDataURL("image/jpeg",.72);
      // Mostrar miniatura en preview card
      const pw=document.getElementById("aimPhotoPreviewWrap");
      const pi=document.getElementById("aimPhotoPreviewImg");
      if(pw&&pi){pi.src=_aimPhotoData;pw.style.display="block";}
      document.getElementById("aimPhotoLabel").textContent="Foto lista ✓";
      document.getElementById("aimRemovePhotoBtn").style.display="block";
      updateAimPreview();
    };
    img.src=ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value="";
}

function removeAimPhoto(){
  _aimPhotoData=null;
  document.getElementById("aimPhotoLabel").textContent="Agregar foto";
  document.getElementById("aimRemovePhotoBtn").style.display="none";
  document.getElementById("aimPhotoPreviewWrap").style.display="none";
  updateAimPreview();
}

function saveAddItemModal(){
  const name=document.getElementById("aimName").value.trim();
  if(!name){
    document.getElementById("aimName").style.outline="2px solid #FF3B30";
    setTimeout(()=>document.getElementById("aimName").style.outline="",900);
    document.getElementById("aimName").focus();
    return;
  }
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  const note=document.getElementById("aimNote").value.trim();
  const cat=document.getElementById("aimCategory").value.trim();
  // Cerrar modal
  document.getElementById("addItemOverlay").style.display="none";
  if(_aimEditIdx>=0){
    // MODO EDICIÓN
    const it=box.items[_aimEditIdx];if(!it) return;
    it.text=name;
    if(cat) it.category=cat; else delete it.category;
    if(note) it.note=note; else delete it.note;
    if(_aimPhotoData) it.thumb=_aimPhotoData;
    else if(!_aimPhotoData&&_aimPhotoData===null) {} // no cambió
        _aimEditIdx=-1;
    _aimPhotoData=null;
    saveData();renderItems();renderProgress();generateQR(currentBoxId);
    if(navigator.vibrate) navigator.vibrate(8);
    showToast("✏️ "+name+" actualizado","#007AFF");
  } else {
    // MODO NUEVO
    const newItem={text:name,done:false,addedAt:Date.now()};
    if(_aimPhotoData) newItem.thumb=_aimPhotoData;
    if(note) newItem.note=note;
    if(cat) newItem.category=cat;
    box.items.push(newItem);
        _aimPhotoData=null;
    saveData();renderItems();renderProgress();generateQR(currentBoxId);
    if(navigator.vibrate) navigator.vibrate(12);
    setTimeout(()=>{
      const list=document.getElementById("itemsList");
      if(list){
        const rows=list.querySelectorAll(".item-row");
        const newRow=rows[rows.length-1];
        if(newRow){
          void newRow.offsetWidth;
          newRow.classList.add("item-row--new");
          newRow.scrollIntoView({behavior:"smooth",block:"nearest"});
        }
      }
    },60);
  }
}
// ══════════════════════════════════════════════════

