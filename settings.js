/* BoxVision — Pantalla de ajustes */

function goSettings(){
  showScreen("settingsScreen");

  // Marca/brand
  const brandInput=document.getElementById("brandInput");
  if(brandInput) brandInput.value=settings.brand||"";

  // Stats con animación count-up
  const tc=document.getElementById("setTotalCajas");
  const to=document.getElementById("setTotalObj");
  const td=document.getElementById("setTotalDone");
  const tf=document.getElementById("setTotalFav");
  const nCajas=boxes.length;
  const nObj=boxes.reduce((s,b)=>s+b.items.length,0);
  const nDone=boxes.reduce((s,b)=>s+b.items.filter(i=>i.done).length,0);
  const nFav=boxes.filter(b=>b.fav).length;
  // Animar números
  [
    [tc,nCajas],[to,nObj],[td,nDone],[tf,nFav]
  ].forEach(([el,val])=>{
    if(!el) return;
    let start=0,dur=500,t0=Date.now();
    (function tick(){
      const p=Math.min(1,(Date.now()-t0)/dur);
      const ease=1-Math.pow(1-p,2);
      el.textContent=Math.round(start+(val-start)*ease);
      if(p<1) requestAnimationFrame(tick);
    })();
  });

  applyDark();

  // Perfil de usuario
  const nameEl=document.getElementById("settingsUserName");
  const emailEl=document.getElementById("settingsUserEmail");
  const avatarEl=document.getElementById("settingsAvatar");
  const placeholderEl=document.getElementById("settingsAvatarPlaceholder");
  if(currentUser){
    if(nameEl) nameEl.textContent=currentUser.displayName||"Usuario";
    if(emailEl) emailEl.textContent=currentUser.email||"";
    if(currentUser.photoURL&&avatarEl){
      avatarEl.src=currentUser.photoURL;
      avatarEl.style.display="block";
      if(placeholderEl) placeholderEl.style.display="none";
    }
  } else {
    if(nameEl) nameEl.textContent="Sin sesión";
    if(emailEl) emailEl.textContent="Datos guardados localmente";
  }

  _initLangLabel();
  _initViewModeLabel();
  _updateSyncBadge();
  _calcStorageStats();

  // Estado del canal de feedback
  const fbSub = document.getElementById('feedbackStatusSub');
  if(fbSub){
    if(window._emailjsReady){
      fbSub.innerHTML = '📬 Llega directo a tu correo';
      fbSub.style.color = '#34C759';
    } else {
      fbSub.textContent = 'Reporta bugs o sugiere mejoras';
      fbSub.style.color = '';
    }
  }

  // Mostrar versión actual en el label de "Ver novedades"
  const clSub = document.getElementById('settingsChangelogSub');
  if(clSub){
    fetch('./config.json?_='+Date.now(),{cache:'no-store'})
      .then(r=>r.json())
      .then(cfg=>{ if(clSub) clSub.textContent = 'Versión '+cfg.version+' · '+cfg.released; })
      .catch(()=>{ if(clSub) clSub.textContent = 'Ver cambios de esta versión'; });
  }
}

// Guarda estado de toggles con persistencia
function _saveSettingsToggle(key, val){
  try{ localStorage.setItem('bv-toggle-'+key, val?'1':'0'); }catch(e){}
}

// Vista mode label en settings
function _initViewModeLabel(){
  const lbl=document.getElementById('viewModeLabel');
  if(!lbl) return;
  const mode=localStorage.getItem('bv_view')||'grid';
  lbl.textContent=mode==='list'?'Lista':'Cuadrícula';
}

// Alterna vista y actualiza label en settings
function _toggleDefaultView(){
  const mode=localStorage.getItem('bv_view')||'grid';
  const next=mode==='grid'?'list':'grid';
  if(typeof setViewMode==='function') setViewMode(next);
  _initViewModeLabel();
  showToast(next==='list'?'☰ Vista lista activada':'⊞ Vista cuadrícula activada','#0A84FF');
}

// Badge de sincronización
function _updateSyncBadge(){
  const badge=document.getElementById('setSyncBadge');
  const lbl=document.getElementById('setSyncLabel');
  if(!badge||!lbl) return;
  if(!navigator.onLine){
    badge.style.background='rgba(255,149,0,.12)';
    badge.style.borderColor='rgba(255,149,0,.25)';
    badge.querySelector('.set-sync-dot').style.background='#FF9500';
    lbl.style.color='#FF9500';
    lbl.textContent='Sin conexión';
  } else if(currentUser){
    const ts=localStorage.getItem('cb-updated-'+currentUser.uid);
    if(ts){
      const diff=Date.now()-parseInt(ts);
      const mins=Math.floor(diff/60000);
      badge.querySelector('.set-sync-dot').style.background='#34C759';
      lbl.style.color='#34C759';
      lbl.textContent=mins<1?'Sincronizado ahora':mins<60?'Hace '+mins+' min':'Hace '+Math.floor(mins/60)+'h';
    } else {
      lbl.textContent='Sincronizado';
    }
  } else {
    badge.style.background='rgba(142,142,147,.1)';
    badge.style.borderColor='rgba(142,142,147,.2)';
    badge.querySelector('.set-sync-dot').style.background='#8E8E93';
    lbl.style.color='#8E8E93';
    lbl.textContent='Modo local';
  }
}

// Calcula uso de almacenamiento
function _calcStorageStats(){
  var nObj=boxes.reduce((s,b)=>s+b.items.length,0);
  try{
    // Caché local (localStorage)
    let localSize=0;
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&k.startsWith('cb-')){
        localSize+=(localStorage.getItem(k)||'').length;
      }
    }
    const localKB=(localSize/1024).toFixed(1);
    const cacheLbl=document.getElementById('cacheSubLabel');
    const cacheVal=document.getElementById('cacheValLabel');
    if(cacheLbl) cacheLbl.textContent=boxes.length+' cajas · '+nObj+' objetos';
    if(cacheVal) cacheVal.textContent=localKB<1024?localKB+' KB':(localSize/1048576).toFixed(2)+' MB';

    // Nube: estimación por serialización de cajas sin fotos
    const lean=boxes.map(b=>{const c={...b};delete c.photo;return c;});
    const cloudSize=JSON.stringify(lean).length;
    const cloudKB=(cloudSize/1024).toFixed(1);
    const storeSub=document.getElementById('storageSubLabel');
    const storeVal=document.getElementById('storageValLabel');
    if(storeSub) storeSub.textContent=currentUser?'Firebase Firestore':'Sin sesión — no sincronizado';
    if(storeVal) storeVal.textContent=currentUser?(cloudKB<1024?cloudKB+' KB':(cloudSize/1048576).toFixed(2)+' MB'):'—';
  }catch(e){}
}

// Exportar datos como JSON descargable
function _exportDataJSON(){
  try{
    const lean=boxes.map(b=>{
      const c=JSON.parse(JSON.stringify(b));
      delete c.photo; // omitir fotos para tamaño razonable
      return c;
    });
    const json=JSON.stringify({version:'2.4.0',exportDate:new Date().toISOString(),boxes:lean,rooms},null,2);
    const blob=new Blob([json],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='boxvision-backup-'+new Date().toISOString().slice(0,10)+'.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    showToast('📤 Datos exportados correctamente','#34C759');
  }catch(e){
    showToast('❌ Error al exportar','#FF3B30');
  }
}
function _clearSearchHistory(){
  // Limpiar todas las claves relacionadas con búsqueda en localStorage
  const keysToRemove=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k&&(k.startsWith('bv-search')||k.startsWith('cb-search')||k.startsWith('bv_search')||k==='bv_last_search')){
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach(k=>localStorage.removeItem(k));
  // Limpiar el input de búsqueda si está visible
  const si=document.getElementById("searchInput");
  if(si&&si.value){si.value="";doSearch("");}
  // Cerrar el dropdown de resultados
  const sw=document.getElementById("srWrap");
  if(sw) sw.classList.remove("open");
  const sub=document.getElementById("searchHistorySub");
  if(sub){ sub.textContent="✓ Historial eliminado"; setTimeout(()=>{ if(sub) sub.textContent="Limpia las búsquedas recientes"; },2500); }
  showToast("🗑 Historial de búsqueda eliminado","#34C759");
}

// Sync mobile-only elements with desktop sidebar elements
function syncMobileElements(){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box)return;
  // Sync photo area
  const pam=document.getElementById("photoAreaMobile");
  if(pam){
    pam.innerHTML=box.photo
      ?`<div class="photo-preview"><img src="${box.photo}"/><button class="photo-rm" onclick="event.stopPropagation();removePhoto()">✕</button></div>`
      :`<div class="photo-add"><span style="font-size:28px">📸</span><span>Agregar foto de la caja</span></div>`;
  }
  // Sync note area
  const nam=document.getElementById("noteAreaMobile");
  if(nam) nam.value=box.note||"";
  // Sync QR
  const qrm=document.getElementById("detailQRMobile");
  if(qrm && qrm.innerHTML.trim()===""){
    // Copy QR from main element if already rendered
    const qrmain=document.getElementById("detailQR");
    if(qrmain) qrm.innerHTML=qrmain.innerHTML;
  }
}
function saveNoteMobile(){
  const box=boxes.find(b=>b.id===currentBoxId);
  const na=document.getElementById("noteAreaMobile");
  if(box&&na){box.note=na.value;const nad=document.getElementById("noteArea");if(nad)nad.value=na.value;saveData();}
}

function saveBrand(){settings.brand=document.getElementById("brandInput").value.trim();saveSettings();}

