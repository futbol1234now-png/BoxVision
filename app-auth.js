// ── Auth ──────────────────────────────────────────
function signInGoogle(){
  if(!auth){
    alert("⚠️ Firebase no está disponible. Usa la app en modo local.");
    return;
  }
  const btn = document.getElementById("loginBtn");
  const loading = document.getElementById("loginLoading");
  const errEl = document.getElementById("loginError");
  if(btn) btn.style.display = "none";
  if(loading) loading.style.display = "flex";
  if(errEl){ errEl.textContent=""; errEl.style.display="none"; }

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({prompt: 'select_account'});

  // Detectar entorno para elegir método de login
  const isMobile  = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isFile    = location.protocol === 'file:';
  const isPWA     = window.matchMedia('(display-mode: standalone)').matches
                 || window.navigator.standalone === true
                 || document.referrer.includes('android-app://');
  const isIOS     = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isSafari  = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // FIX COOP: usar redirect en móvil y PWA, popup solo en desktop no-Safari
  const isDesktopChromium = !isMobile && !isSafari;
  const useRedirect = isMobile || isFile || isPWA || !isDesktopChromium;

  if(useRedirect){
    try{ sessionStorage.setItem('bv_login_pending','1'); }catch(e){}
    auth.signInWithRedirect(provider);
    return;
  }

  // iOS Safari / Desktop: usar popup
  auth.signInWithPopup(provider).catch(err=>{
    if(err.code === 'auth/popup-blocked' || err.code === 'auth/popup-cancelled'){
      // Popup bloqueado en iOS PWA → redirect como último recurso
      console.info("[BoxVision] Popup bloqueado — usando redirect");
      try{ sessionStorage.setItem('bv_login_pending','1'); }catch(e){}
      auth.signInWithRedirect(provider);
      return;
    }
    if(btn) btn.style.display = "flex";
    if(loading) loading.style.display = "none";
    if(err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request'){
      console.error("Login error:", err);
      if(errEl){ errEl.textContent = "Error al iniciar sesión. Intenta de nuevo."; errEl.style.display = "block"; }
    }
  });
  // NOTA: getRedirectResult se maneja una sola vez al cargar la página (ver abajo)
}

// ── Email/Password Auth ───────────────────────────────────────────────────
var _emailTab = 'signin'; // 'signin' | 'signup'
var _loginAttempts = 0;
var _loginLastAttempt = 0;

function switchEmailTab(tab){
  _emailTab = tab;
  const btnSignIn = document.getElementById('tabSignIn');
  const btnSignUp = document.getElementById('tabSignUp');
  const fieldName = document.getElementById('fieldName');
  const submitBtn = document.getElementById('emailSubmitBtn');
  const forgotWrap = document.getElementById('forgotWrap');
  const passInput = document.getElementById('passInput');
  const errEl = document.getElementById('loginError');
  
  // Limpiar todos los errores de campo
  ['nameError', 'emailError', 'passError'].forEach(id=>{
    const el = document.getElementById(id);
    if(el){ el.style.display='none'; el.textContent=''; }
  });
  
  if(errEl){ errEl.textContent=''; errEl.style.display='none'; }

  if(tab === 'signin'){
    btnSignIn.className = 'ls-tab active';
    btnSignUp.className = 'ls-tab inactive';
    fieldName.style.display = 'none';
    const btnText = document.getElementById('submitBtnText');
    if(btnText) btnText.textContent = 'Iniciar sesión';
    forgotWrap.style.display = 'block';
    passInput.setAttribute('autocomplete','current-password');
  } else {
    btnSignUp.className = 'ls-tab active';
    btnSignIn.className = 'ls-tab inactive';
    fieldName.style.display = 'block';
    const btnText = document.getElementById('submitBtnText');
    if(btnText) btnText.textContent = 'Crear cuenta';
    forgotWrap.style.display = 'none';
    passInput.setAttribute('autocomplete','new-password');
  }
}

function _validateEmail(email){
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function _emailAuthError(code){
  const msgs = {
    'auth/invalid-email':           'Correo inválido. Verifica el formato.',
    'auth/user-not-found':          'No existe cuenta con ese correo.',
    'auth/wrong-password':          'Contraseña incorrecta.',
    'auth/email-already-in-use':    'Ese correo ya está registrado.',
    'auth/weak-password':           'Contraseña muy débil (mín. 6 caracteres).',
    'auth/too-many-requests':       'Demasiados intentos. Espera 15 min.',
    'auth/network-request-failed':  'Error de conexión. Revisa tu internet.',
    'auth/invalid-credential':      'Correo o contraseña incorrectos.',
    'auth/account-exists-with-different-credential': 'Esa cuenta usa otro método de login.',
    'auth/operation-not-allowed':   'Operación no permitida.',
    'auth/auth-domain-config-required': 'Error de configuración.',
  };
  return msgs[code] || 'Error al autenticar. Intenta de nuevo más tarde.';
}

function _setEmailLoading(on){
  const btn     = document.getElementById('loginBtn');
  const emailF  = document.getElementById('emailForm');
  const loading = document.getElementById('loginLoading');
  const submitBtn = document.getElementById('emailSubmitBtn');
  
  if(btn)    btn.style.opacity    = on ? '0.5' : '1';
  if(btn)    btn.style.pointerEvents = on ? 'none' : '';
  if(emailF) emailF.style.opacity = on ? '0.5' : '1';
  if(emailF) emailF.style.pointerEvents = on ? 'none' : '';
  if(submitBtn) submitBtn.disabled = on;
  if(loading){ loading.style.display = on ? 'flex' : 'none'; }
}

function _clearFieldErrors(){
  ['nameError', 'emailError', 'passError'].forEach(id=>{
    const el = document.getElementById(id);
    if(el){ el.style.display='none'; el.textContent=''; }
  });
}

function _showFieldError(fieldId, msg){
  const errorEl = document.getElementById(fieldId + 'Error');
  if(errorEl){
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }
  // También mostrar en el error general
  _showEmailErr(msg);
}

function submitEmailForm(){
  if(!auth){
    _showEmailErr('🔌 Firebase no disponible. Intenta recargar.');
    return;
  }
  
  const email = (document.getElementById('emailInput').value || '').trim().toLowerCase();
  const pass  = (document.getElementById('passInput').value  || '');
  const name  = (document.getElementById('emailName').value  || '').trim();
  
  _clearFieldErrors();
  const errEl = document.getElementById('loginError');

  // ── Validaciones robustas ──
  if(!email){
    _showFieldError('email', '📧 Ingresa tu correo.');
    return;
  }
  
  if(!_validateEmail(email)){
    _showFieldError('email', '❌ Correo inválido (ej: usuario@dominio.com)');
    return;
  }
  
  if(!pass){
    _showFieldError('pass', '🔑 Ingresa tu contraseña.');
    return;
  }
  
  if(_emailTab === 'signup'){
    if(!name){
      _showFieldError('name', '👤 Ingresa tu nombre.');
      return;
    }
    if(name.length < 2){
      _showFieldError('name', '👤 El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if(pass.length < 6){
      _showFieldError('pass', '🔑 Mínimo 6 caracteres.');
      return;
    }
  }

  // ── Rate limiting: evitar spam de intentos ──
  const now = Date.now();
  if(now - _loginLastAttempt < 1000){
    _showEmailErr('⏱️ Espera un segundo antes de intentar de nuevo.');
    return;
  }
  _loginLastAttempt = now;
  
  // Verificar intentos recientes
  if(_emailTab === 'signin'){
    _loginAttempts++;
    if(_loginAttempts > 8){
      _showEmailErr('🔒 Demasiados intentos fallidos. Espera 5 minutos.');
      setTimeout(()=>{ _loginAttempts = 0; }, 5*60*1000);
      return;
    }
  }

  _setEmailLoading(true);

  if(_emailTab === 'signin'){
    auth.signInWithEmailAndPassword(email, pass)
      .then(()=>{
        _loginAttempts = 0; // Reset on success
      })
      .catch(err=>{
        _setEmailLoading(false);
        console.warn('[Login Error]', err.code, err.message);
        _showEmailErr(_emailAuthError(err.code));
      });
  } else {
    auth.createUserWithEmailAndPassword(email, pass)
      .then(cred=>{
        if(name && cred.user){
          return cred.user.updateProfile({ displayName: name });
        }
        return cred;
      })
      .then(()=>{
        _loginAttempts = 0;
      })
      .catch(err=>{
        _setEmailLoading(false);
        console.warn('[Signup Error]', err.code, err.message);
        _showEmailErr(_emailAuthError(err.code));
      });
  }
}

function _showEmailErr(msg){
  const errEl = document.getElementById('loginError');
  if(!errEl) return;
  errEl.textContent = msg;
  errEl.style.display = 'block';
  // Scroll to error
  setTimeout(()=>{ errEl.scrollIntoView({behavior:'smooth',block:'nearest'}); }, 50);
}

function togglePassVisibility(){
  const inp  = document.getElementById('passInput');
  const icon = document.getElementById('passToggleIcon');
  if(!inp) return;
  if(inp.type === 'password'){
    inp.type = 'text';
    if(icon){ icon.className='ti ti-eye-off'; }
  } else {
    inp.type = 'password';
    if(icon){ icon.className='ti ti-eye'; }
  }
}

function sendPasswordReset(){
  if(!auth) return;
  const email = (document.getElementById('emailInput').value || '').trim().toLowerCase();
  const errEl = document.getElementById('loginError');
  
  if(!email){
    _showEmailErr('📧 Ingresa tu correo para recuperar contraseña.');
    return;
  }
  
  if(!_validateEmail(email)){
    _showEmailErr('❌ Correo inválido.');
    return;
  }
  
  _setEmailLoading(true);
  
  auth.sendPasswordResetEmail(email, {
    url: window.location.origin + window.location.pathname,
    handleCodeInApp: false
  })
    .then(()=>{
      _setEmailLoading(false);
      if(errEl){
        errEl.style.color='#34C759';
        errEl.textContent='✓ Revisa tu correo para recuperar contraseña';
        errEl.style.display='block';
        setTimeout(()=>{ 
          errEl.style.color='#FF3B30'; 
          errEl.style.display='none'; 
        }, 5000);
      }
    })
    .catch(err=>{
      _setEmailLoading(false);
      console.warn('[Password Reset Error]', err.code);
      _showEmailErr(_emailAuthError(err.code));
    });
}

function showUserMenu(){
  if(!currentUser) return;
  const existing=document.getElementById("userMenuPopup");
  if(existing){existing.remove();return;}
  const m=document.createElement("div");
  m.id="userMenuPopup";
  m.style.cssText="position:fixed;top:60px;right:16px;background:var(--card,#1C1C1E);border-radius:16px;padding:16px;z-index:5000;box-shadow:0 8px 32px rgba(0,0,0,.4);min-width:220px;animation:fadeIn .2s ease";
  // BUG FIX #4: fallback cuando photoURL es null (evita imagen rota)
  const avatarHtml = currentUser.photoURL
    ? `<img src="${currentUser.photoURL}" style="width:40px;height:40px;border-radius:50%;object-fit:cover"/>`
    : `<div style="width:40px;height:40px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff">${(currentUser.displayName||currentUser.email||"?")[0].toUpperCase()}</div>`;
  m.innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.1)">
      ${avatarHtml}
      <div>
        <div style="font-size:14px;font-weight:700;color:var(--text,#fff)">${currentUser.displayName||currentUser.email||"Usuario"}</div>
        <div style="font-size:11px;color:var(--muted,#8E8E93)">${currentUser.email||""}</div>
      </div>
    </div>
    <button onclick="signOutUser()" style="width:100%;padding:11px;border-radius:10px;border:none;background:rgba(255,59,48,.15);color:#FF3B30;font-size:14px;font-weight:600;cursor:pointer">Cerrar sesión</button>`;
  document.body.appendChild(m);
  setTimeout(()=>document.addEventListener("click",()=>m.remove(),{once:true}),100);
}

function confirmDeleteAll(){
  _showConfirm({
    icon:"🗑️",
    title:"Borrar todas las cajas",
    msg:"¿Borrar todas las cajas? Esta acción <strong>no se puede deshacer</strong>.",
    confirmLabel:"Borrar todo",
    confirmColor:"#FF3B30",
    onConfirm:_doDeleteAll
  });
}
function _doDeleteAll(){
  // FIX #2: leer prevCount ANTES de sobreescribir localStorage a "0"
  // para poder borrar todos los chunks existentes en Firestore
  const prevCount = currentUser
    ? parseInt(localStorage.getItem("cb-chunkCount-"+currentUser.uid)||"0")
    : 0;
  boxes=[]; rooms=[];
  // Limpiar fotos y thumbs del localStorage
  Object.keys(localStorage).forEach(k=>{
    if(k.startsWith("cb-photo-")||k.startsWith("cb-thumb-")) localStorage.removeItem(k);
  });
  // Guardar localmente
  if(currentUser){
    localStorage.setItem("cb-boxes-"+currentUser.uid, "[]");
    localStorage.setItem("cb-rooms-"+currentUser.uid, "[]");
    localStorage.setItem("cb-updated-"+currentUser.uid, Date.now().toString());
    localStorage.setItem("cb-chunkCount-"+currentUser.uid, "0");
  }
  // Borrar en Firestore explícitamente (bypasando el guard de boxes vacío)
  if(currentUser && db){
    const userRef = db.collection('users').doc(currentUser.uid);
    const batch = db.batch();
    batch.set(userRef,{boxes:[], rooms:[], chunkCount:0, deletedIds:[],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()},{merge:false});
    // Limpiar deletedIds locales también
    localStorage.removeItem("cb-deleted-"+currentUser.uid);
    // FIX #2: usar prevCount leído antes del reset + margen de 5 por seguridad
    for(let i=0;i<prevCount+5;i++){
      batch.delete(userRef.collection("chunks").doc(String(i)));
    }
    batch.commit().catch(()=>{});
  }
  goSplash();
}

function signOutUser(){
  // Cancelar cualquier operación pendiente
  if(typeof _saveTimer !== "undefined") clearTimeout(_saveTimer);
  // Guardar antes de salir (solo si hay datos reales)
  if(currentUser && boxes.length > 0) saveToLocalStorage();
  document.getElementById("userMenuPopup")?.remove();
  history.replaceState(null, "", location.pathname + location.search);
  if(auth){
    auth.signOut().catch(e=>console.warn("signOut error:", e));
    // onAuthStateChanged emitirá user=null → _showLoginScreen automáticamente
    // _lastLaunchedUid se resetea en _showLoginScreen vía onAuthStateChanged
  } else {
    currentUser=null; boxes=[]; rooms=[];
    const ls=document.getElementById("loginScreen");
    if(ls){ls.classList.remove("hidden");ls.style.display="flex";ls.style.opacity="1";} // FIX
    const lb=document.getElementById("loginBtn");
    if(lb) lb.style.display="flex";
    const ll=document.getElementById("loginLoading");
    if(ll) ll.style.display="none";
  }
}

// ════════════════════════════════════════════════════
// FIRESTORE SYNC — fuente de verdad principal
// ════════════════════════════════════════════════════

// Guarda en localStorage SÍNCRONAMENTE — separa fotos base64 para maximizar espacio
function saveToLocalStorage(){
  // FIX BUG #2: soportar modo local (sin cuenta) además de modo Firebase
  const _uid = currentUser ? currentUser.uid : null;
  const _boxKey   = _uid ? "cb-boxes-"+_uid   : "cb-boxes";
  const _roomKey  = _uid ? "cb-rooms-"+_uid   : "cb-rooms";
  try{
    const lean = boxes.map(b=>{
      const c = JSON.parse(JSON.stringify(b));
      // Guardar foto por separado con su propia key para no llenar el array principal
      if(b.photo){
        try{localStorage.setItem("cb-photo-"+b.id, b.photo);}catch(e){}
        delete c.photo;
      }
      // Preservar addedAt para que el merge entre dispositivos nunca pierda items
      c.items = b.items.map(i=>({text:i.text,done:i.done,addedAt:i.addedAt||0}));
      return c;
    });
    try{
      localStorage.setItem(_boxKey, JSON.stringify(lean));
    }catch(quota){
      // Si no cabe, intentar sin fotos de items también
      console.warn("localStorage lleno, guardando versión mínima");
      const minimal=lean.map(b=>({...b,items:b.items.slice(0,50)}));
      localStorage.setItem(_boxKey, JSON.stringify(minimal));
    }
    localStorage.setItem(_roomKey, JSON.stringify(rooms));
    // thumbs de items aparte
    boxes.forEach(b=>b.items.forEach(it=>{
      if(it.thumb){
        try{localStorage.setItem(_thumbKey(b.id,it.text), it.thumb);}catch(e){} // FIX #3
      }
    }));
  }catch(e){ console.warn("localStorage error:",e); }
}

// ── Firestore save con soporte de cajas ilimitadas (chunks de 400KB) ─────────
// Firestore tiene límite de 1MB por documento. Para evitarlo, usamos una
// colección de chunks: users/{uid}/chunks/0, chunks/1, etc.
const CHUNK_BYTES = 400_000; // ~400KB por chunk (margen seguro)

function _chunkBoxes(lean){
  const chunks=[];
  let cur=[];
  let curSize=0;
  for(const box of lean){
    const s=JSON.stringify(box).length;
    if(curSize+s>CHUNK_BYTES && cur.length){
      chunks.push(cur);
      cur=[box];curSize=s;
    } else {
      cur.push(box);curSize+=s;
    }
  }
  if(cur.length) chunks.push(cur);
  return chunks;
}



// ── Ver backups disponibles ───────────────────────────────────────────────────
async function _showBackups(){
  if(!currentUser || !db){ showToast("⚠️ Necesitas estar conectado","#FF9500"); return; }
  showToast("🔍 Cargando backups...","#0A84FF");
  try{
    const snap = await db.collection("users").doc(currentUser.uid)
      .collection("backups").orderBy("date","desc").get();

    if(snap.empty){
      showToast("No hay backups aún — se crean automáticamente cada día","#8E8E93");
      return;
    }

    const items = snap.docs.map(d=>d.data());
    const list = items.map(b=>
      `<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.07);">
        <div>
          <div style="font-weight:600;font-size:15px;">${b.date}</div>
          <div style="font-size:12px;color:#8E8E93;margin-top:2px;">${b.boxCount} cajas guardadas</div>
        </div>
        <button onclick="_restoreBackup('${b.date}')" style="background:#0A84FF;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;">Restaurar</button>
      </div>`
    ).join('');

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;';
    modal.innerHTML = `
      <div style="background:#1e1e28;border-radius:24px 24px 0 0;padding:24px;width:100%;max-height:70vh;overflow-y:auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <h3 style="font-size:18px;font-weight:700;">💾 Mis Backups</h3>
          <button onclick="this.closest('[style]').remove()" style="background:rgba(255,255,255,0.1);border:none;color:#fff;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer;">✕</button>
        </div>
        <p style="font-size:13px;color:#8E8E93;margin-bottom:16px;">Backups automáticos diarios — los últimos ${BACKUP_MAX} días.</p>
        ${list}
      </div>`;
    document.body.appendChild(modal);
  }catch(e){
    showToast("Error al cargar backups","#FF3B30");
  }
}

async function _restoreBackup(date){
  // FIX: pedir confirmación explícita antes de destruir el estado actual
  _showConfirm({
    icon:"💾",
    title:"Restaurar backup",
    msg:`¿Restaurar el backup del <strong>${date}</strong>? Tus cajas actuales serán reemplazadas.`,
    confirmLabel:"Restaurar",
    confirmColor:"#0A84FF",
    onConfirm: async function(){
      try{
        const doc = await db.collection("users").doc(currentUser.uid)
          .collection("backups").doc(date).get();
        if(!doc.exists){ showToast("Backup no encontrado","#FF3B30"); return; }
        boxes = doc.data().boxes || [];
        restoreThumbs();
        await saveToFirestore();
        renderMain();
        document.querySelectorAll('[style*="inset:0"][style*="z-index:9999"]').forEach(el=>el.remove());
        showToast("✅ Backup restaurado — "+boxes.length+" cajas","#34C759");
      }catch(e){
        showToast("Error al restaurar","#FF3B30");
      }
    }
  });
}

// ── Backup automático diario ─────────────────────────────────────────────────
// Guarda una copia de las cajas del usuario en backups/{fecha} una vez al día.
// Máximo 7 backups — el más antiguo se elimina automáticamente.
const BACKUP_MAX = 7;

async function _maybeBackup(){
  if(!currentUser || !db || boxes.length === 0) return;
  try{
    const todayKey = new Date().toISOString().slice(0,10); // "2026-05-17"
    const lastBackup = localStorage.getItem("cb-last-backup-"+currentUser.uid);
    if(lastBackup === todayKey) return; // Ya se hizo el backup de hoy

    const userRef = db.collection("users").doc(currentUser.uid);
    const backupsRef = userRef.collection("backups");

    // Leer backups existentes para rotar (máx BACKUP_MAX)
    const existing = await backupsRef.orderBy("date","asc").get();
    const batch = db.batch();

    // Eliminar los más antiguos si ya hay BACKUP_MAX
    if(existing.size >= BACKUP_MAX){
      const toDelete = existing.docs.slice(0, existing.size - BACKUP_MAX + 1);
      toDelete.forEach(d=>batch.delete(d.ref));
    }

    // Guardar backup de hoy (sin fotos base64 para no gastar cuota)
    const lean = boxes.map(b=>{
      const c = JSON.parse(JSON.stringify(b));
      delete c.photo;
      c.items = (b.items||[]).map(i=>({text:i.text, done:i.done}));
      return c;
    });

    batch.set(backupsRef.doc(todayKey), {
      date: todayKey,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      boxCount: lean.length,
      boxes: lean
    });

    await batch.commit();
    localStorage.setItem("cb-last-backup-"+currentUser.uid, todayKey);
    console.log("💾 Backup diario guardado:", todayKey, `(${lean.length} cajas)`);
  }catch(e){
    console.warn("Backup error:", e);
  }
}

async function saveToFirestore(){
  if(!currentUser || !db) return;
  // GUARD: nunca sobreescribir Firestore con array vacío si hay datos remotos
  // (esto evita pérdida de datos al cerrar sesión y volver a entrar)
  if(boxes.length === 0){
    try{
      const check = await db.collection("users").doc(currentUser.uid).get();
      if(check.exists){
        const d = check.data();
        const remoteHasData = (d.chunkCount > 0) || (d.boxes && d.boxes.length > 0);
        if(remoteHasData){
          console.warn("🛡 saveToFirestore cancelado: boxes vacío pero Firestore tiene datos");
          return;
        }
      }
    }catch(e){ return; } // si falla la verificación, no arriesgarse
  }
  try{
    const lean = boxes.map(b=>{
      const c = JSON.parse(JSON.stringify(b));
      // quitar fotos base64 del payload de Firestore (muy pesadas)
      delete c.photo;
      // Preservar addedAt y thumb (thumbs son pequeños ~3-8KB, importantes para sync)
      c.items = b.items.map(i=>({
        text:i.text,
        done:i.done,
        addedAt:i.addedAt||0,
        thumb:i.thumb||null  // ← incluir thumb para sync entre dispositivos
      }));
      return c;
    });

    const chunks=_chunkBoxes(lean);
    const batch=db.batch();
    const userRef=db.collection("users").doc(currentUser.uid);

    // Metadata: cuántos chunks hay + deletedIds para sync entre dispositivos
    const _deletedIds = _getDeletedIds ? _getDeletedIds() : [];
    batch.set(userRef,{
      chunkCount: chunks.length,
      rooms: rooms,
      deletedIds: _deletedIds,
      updatedAt: (typeof firebase!=="undefined"&&firebase.firestore)
        ? firebase.firestore.FieldValue.serverTimestamp() : null
    },{merge:true});

    // Guardar cada chunk
    chunks.forEach((chunk,i)=>{
      const ref=userRef.collection("chunks").doc(String(i));
      batch.set(ref,{boxes:chunk,idx:i});
    });

    // Borrar chunks obsoletos si ahora hay menos que antes
    const prevCount=parseInt(localStorage.getItem("cb-chunkCount-"+currentUser.uid)||"0");
    for(let i=chunks.length;i<prevCount;i++){
      batch.delete(userRef.collection("chunks").doc(String(i)));
    }

    await batch.commit();

    // Caché local
    localStorage.setItem("cb-boxes-"+currentUser.uid, JSON.stringify(lean));
    localStorage.setItem("cb-rooms-"+currentUser.uid, JSON.stringify(rooms));
    localStorage.setItem("cb-updated-"+currentUser.uid, Date.now().toString());
    localStorage.setItem("cb-chunkCount-"+currentUser.uid, String(chunks.length));
    // Confirmar que Firestore recibió los datos → limpiar dirty flag
    _clearDirty();
    console.log(`✅ Guardado en Firestore: ${lean.length} cajas en ${chunks.length} chunk(s)`);
  }catch(e){
    console.warn("Firestore save error:", e);
    if(navigator.onLine){
      showToast("⚠️ Error al sincronizar — datos guardados localmente","#FF9500");
    }
  }
}

let _saveTimer = null;
function scheduleSave(){
  // No guardar mientras se está cargando de Firestore (evita race condition al iniciar sesión)
  if(typeof _firestoreLoading !== "undefined" && _firestoreLoading) return;
  // PASO 1: guardar en localStorage AHORA (síncrono, 0ms)
  saveToLocalStorage();
  // PASO 1b: marcar que hay cambios pendientes de subir a Firestore
  // Si el proceso muere antes de que el timer dispare, al próximo arranque
  // loadFromFirestore detecta el flag y sube los datos locales primero.
  _markDirty();
  // PASO 2: subir a Firestore con debounce de 300ms para agrupar cambios rápidos
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(saveToFirestore, 300);
}

// ── Sistema de dirty flag ─────────────────────────────────────────────────
// _markDirty(): indica que hay cambios locales sin confirmar en Firestore.
// _clearDirty(): se llama cuando Firestore confirma el guardado.
// _isDirty(): al arrancar, detecta si el proceso anterior murió sin guardar.
function _dirtyKey(){ return currentUser ? "bv-dirty-"+currentUser.uid : null; }
function _markDirty(){
  const k = _dirtyKey(); if(!k) return;
  try{ localStorage.setItem(k, Date.now().toString()); }catch(e){}
}
function _clearDirty(){
  const k = _dirtyKey(); if(!k) return;
  try{ localStorage.removeItem(k); }catch(e){}
}
function _isDirty(){
  const k = _dirtyKey(); if(!k) return false;
  try{ return !!localStorage.getItem(k); }catch(e){ return false; }
}

// Cuando el usuario sale/minimiza, cancelar timer y guardar todo de inmediato
window.addEventListener("visibilitychange", ()=>{
  if(document.visibilityState === "hidden" && currentUser){
    clearTimeout(_saveTimer);
    saveToLocalStorage();
    if(db) saveToFirestore().catch(()=>{});
  }
});
window.addEventListener("pagehide", ()=>{
  if(currentUser){
    clearTimeout(_saveTimer);
    saveToLocalStorage();
    if(db) saveToFirestore().catch(()=>{});
  }
});

// ── Merge inteligente: combina cajas locales y remotas por ID ────────────────
// Para cada ID, gana la versión con lastModified más reciente.
// Las cajas que solo existen en un lado se incluyen siempre.
function _mergeBoxes(local, remote, deletedIds=[]){
  const deleted = new Set(deletedIds);
  const map = new Map();
  // Cargar locales (excluyendo las eliminadas)
  for(const b of local){
    if(!deleted.has(b.id)) map.set(b.id, b);
  }
  // Helper: timestamp más reciente entre los items de una caja
  function _latestItemTs(box){
    if(!box.items||!box.items.length) return 0;
    return box.items.reduce((mx,i)=>Math.max(mx,i.addedAt||0),0);
  }
  // Aplicar remotas: gana quien tenga lastModified mayor;
  // pero si la local tiene items más nuevos (addedAt), se fusionan los items.
  for(const rb of remote){
    if(deleted.has(rb.id)) continue; // fue eliminada → no restaurar
    const lb = map.get(rb.id);
    if(!lb){
      map.set(rb.id, rb);
    } else {
      const remoteTs = rb.lastModified || rb.lastUsed || 0;
      const localTs  = lb.lastModified || lb.lastUsed || 0;
      if(remoteTs > localTs){
        // La remota es más nueva en metadata — pero revisar si hay items locales más recientes
        const localItemTs  = _latestItemTs(lb);
        const remoteItemTs = _latestItemTs(rb);
        if(localItemTs > remoteItemTs){
          // Hay items locales más nuevos: fusionar — tomar remota como base + agregar items locales que faltan
          const merged = Object.assign({}, rb);
          const remoteTexts = new Set((rb.items||[]).map(i=>i.text));
          const extraLocal  = (lb.items||[]).filter(i=>!remoteTexts.has(i.text));
          merged.items = [...(rb.items||[]), ...extraLocal];
          merged.lastModified = Math.max(localTs, remoteTs);
          map.set(rb.id, merged);
        } else {
          map.set(rb.id, rb);
        }
      }
      // Si local es igual o más nueva en metadata → ya está en el map, no tocar
    }
  }
  return Array.from(map.values());
}

// ── Firestore load — reconstruye cajas desde chunks y hace merge ──────────────
async function loadFromFirestore(){
  if(!currentUser || !db) return;

  // Mostrar caché local de inmediato (para UX rápida)
  let localBoxes = [];
  let localRooms = [];
  try{
    localBoxes = JSON.parse(localStorage.getItem("cb-boxes-"+currentUser.uid)||"[]");
    localRooms  = JSON.parse(localStorage.getItem("cb-rooms-"+currentUser.uid)||"[]");
    if(localBoxes.length > 0){
      boxes = localBoxes;
      rooms = localRooms;
      restoreThumbs();
    }
  }catch(e){}

  // Si el proceso anterior murió con cambios sin guardar, subirlos ANTES del merge
  // Esto garantiza que Firestore reciba los datos locales más recientes
  if(_isDirty() && localBoxes.length > 0){
    console.warn("⚠️ dirty flag detectado — subiendo datos locales antes del merge");
    try{
      // Subida directa sin pasar por el guard de boxes vacíos
      const leanDirty = localBoxes.map(b=>{
        const c = JSON.parse(JSON.stringify(b));
        delete c.photo;
        c.items = (b.items||[]).map(i=>({text:i.text,done:i.done,addedAt:i.addedAt||0}));
        return c;
      });
      const chunksDirty = _chunkBoxes(leanDirty);
      const batchDirty  = db.batch();
      const userRefDirty = db.collection("users").doc(currentUser.uid);
      const _delIdsDirty = _getDeletedIds ? _getDeletedIds() : [];
      batchDirty.set(userRefDirty,{
        chunkCount: chunksDirty.length,
        rooms: rooms,
        deletedIds: _delIdsDirty,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      },{merge:true});
      chunksDirty.forEach((chunk,i)=>{
        batchDirty.set(userRefDirty.collection("chunks").doc(String(i)),{boxes:chunk,idx:i});
      });
      await batchDirty.commit();
      _clearDirty();
      console.log("✅ Datos pendientes subidos a Firestore antes del merge");
    }catch(dirtyErr){
      console.warn("No se pudo subir dirty data:", dirtyErr);
      // Seguir igual — el merge con addedAt protege los items
    }
  }

  // Luego traer de Firestore y hacer merge
  try{
    const doc = await db.collection("users").doc(currentUser.uid).get();
    if(doc.exists){
      const data = doc.data();
      const remoteRooms = data.rooms || [];

      // Cargar cajas remotas desde chunks
      const chunkCount = data.chunkCount || 0;
      let remote = [];

      if(chunkCount > 0){
        const chunkRefs = Array.from({length:chunkCount},(_,i)=>
          db.collection("users").doc(currentUser.uid).collection("chunks").doc(String(i)).get()
        );
        const chunkDocs = await Promise.all(chunkRefs);
        remote = chunkDocs
          .sort((a,b)=>parseInt(a.id)-parseInt(b.id))
          .flatMap(d=>d.exists ? (d.data().boxes||[]) : []);
        console.log(`📥 Firestore: ${remote.length} cajas en ${chunkCount} chunk(s)`);
      } else if(data.boxes && data.boxes.length > 0){
        // Formato legacy: array directo en el documento
        remote = data.boxes;
        console.log(`📥 Firestore (legacy): ${remote.length} cajas`);
      }

      // ── MERGE: fusionar local + remoto por ID (respetando eliminadas) ──────
      // Combinar deletedIds locales + remotas
      let localDeleted = _getDeletedIds();
      const remoteDeleted = data.deletedIds || [];
      const allDeleted = [...new Set([...localDeleted, ...remoteDeleted])];
      // Sincronizar deletedIds localmente
      if(currentUser) localStorage.setItem("cb-deleted-"+currentUser.uid, JSON.stringify(allDeleted));
      const merged = _mergeBoxes(localBoxes, remote, allDeleted);
      console.log(`🔀 Merge: ${localBoxes.length} local + ${remote.length} remoto → ${merged.length} total`);
      boxes = merged;

      // Rooms: usar los del lado que tenga más entradas (heurística simple)
      if(remoteRooms.length >= localRooms.length){
        rooms = remoteRooms;
      }

      restoreThumbs();

      // Si el merge produjo un resultado diferente a Firestore → subir la versión unificada
      const needsUpload = merged.length !== remote.length ||
        merged.some(mb=>{
          const rb = remote.find(r=>r.id===mb.id);
          return !rb || (mb.lastModified||0) > (rb.lastModified||0);
        });
      if(needsUpload){
        console.log("📤 Subiendo merge a Firestore...");
        await saveToFirestore();
      }

    } else {
      // Documento no existe en Firestore → es cuenta nueva o primer dispositivo
      if(boxes.length > 0){
        console.log("📤 Creando documento en Firestore con cajas locales...");
        await saveToFirestore();
      }
    }
  }catch(e){
    console.warn("Firestore load error:", e);
    // Notificar al sistema de auto-mantenimiento
    if(typeof window._bvFirestoreFail === 'function'){
      // Solo contar si NO es error de red normal (offline)
      var emsg = (e.message||'').toLowerCase();
      if(emsg.indexOf('offline')<0 && emsg.indexOf('network')<0 && emsg.indexOf('unavailable')<0){
        window._bvFirestoreFail(e.message||'load error');
      }
    }
    // Offline o error: boxes ya tiene el fallback de localStorage de arriba
  }
  saveToLocalStorage();
}

function restoreThumbs(){
  boxes.forEach(b=>{
    // Restaurar foto de caja guardada por separado
    if(!b.photo){
      const p=localStorage.getItem("cb-photo-"+b.id);
      if(p) b.photo=p;
    }
    // Restaurar thumbs de items
    b.items.forEach(it=>{
      if(!it.thumb){
        const k=_thumbKey(b.id,it.text); // FIX #3
        const t=localStorage.getItem(k);
        if(t) it.thumb=t;
      }
    });
  });
}

// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
// AUTH — sistema definitivo para producción
// ════════════════════════════════════════════════════
if(auth){
  window._authEnabled = true;

  // ── Capturar resultado de redirect de Google (login en móvil) ──
  // Se llama UNA SOLA VEZ al cargar la página, no en cada click
  auth.getRedirectResult().then(result=>{
    // Limpiar bandera de login pendiente
    try{ sessionStorage.removeItem('bv_login_pending'); }catch(e){}
    // Si hay resultado (usuario recién autenticado vía redirect), onAuthStateChanged lo manejará
    if(result && result.user){
      console.info("[BoxVision] Login por redirect OK:", result.user.displayName);
    }
  }).catch(err=>{
    try{ sessionStorage.removeItem('bv_login_pending'); }catch(e){}
    if(err && err.code !== 'auth/null-user' && err.code !== 'auth/no-auth-event'){
      console.warn("[BoxVision] getRedirectResult error:", err.code);
      const errEl = document.getElementById("loginError");
      if(errEl){ errEl.textContent="Error al iniciar sesión. Intenta de nuevo."; errEl.style.display="block"; }
      const lb=document.getElementById("loginBtn"); if(lb){ lb.style.display="flex"; lb.style.opacity="1"; lb.style.pointerEvents=""; }
      const ll=document.getElementById("loginLoading"); if(ll) ll.style.display="none";
      const ef=document.getElementById("emailForm"); if(ef){ ef.style.opacity="1"; ef.style.pointerEvents=""; }
    }
  });
  function _showLoginScreen(){
    // Cancelar cualquier guardado pendiente antes de limpiar los datos
    if(typeof _saveTimer !== "undefined") clearTimeout(_saveTimer);
    currentUser = null; boxes = []; rooms = [];
    const ls = document.getElementById("loginScreen");
    const lb = document.getElementById("loginBtn");
    const ll = document.getElementById("loginLoading");
    const le = document.getElementById("loginError");
    const av = document.getElementById("userAvatar");
    if(ls){ ls.classList.remove("hidden"); ls.style.transition="none"; ls.style.display="flex"; ls.style.opacity="1"; } // FIX: quitar clase hidden
    if(lb){ lb.style.display="flex"; lb.style.opacity="1"; lb.style.pointerEvents=""; }
    if(ll){ ll.style.display="none"; }
    if(le){ le.style.display="none"; le.textContent=""; le.style.color="#FF3B30"; }
    if(av){ av.style.display="none"; }
    // Resetear form de correo
    const ef = document.getElementById('emailForm');
    if(ef){ ef.style.opacity="1"; ef.style.pointerEvents=""; }
    const ei = document.getElementById('emailInput'); if(ei) ei.value="";
    const pi = document.getElementById('passInput');  if(pi){ pi.value=""; pi.type="password"; }
    const ni = document.getElementById('emailName');  if(ni) ni.value="";
    if(typeof switchEmailTab === 'function') switchEmailTab('signin');
  }

  function _hideLoginScreen(){
    const ls = document.getElementById("loginScreen");
    if(!ls || ls.style.display==="none") return;
    ls.classList.add("hidden"); // FIX: clase hidden inmediata para que el timer de auto-mantenimiento no dispare 404
    ls.style.transition="opacity .25s";
    ls.style.opacity="0";
    setTimeout(()=>{ ls.style.display="none"; }, 280);
  }

  // ── Lanzar app ───────────────────────────────────
  // Se puede llamar múltiples veces con el mismo usuario sin problema
  let _lastLaunchedUid = null;
  let _firestoreLoading = false; // bloquea saves durante la carga inicial

  async function launchApp(user){
    // Si ya está corriendo con este usuario, solo refrescar datos silenciosamente
    if(_lastLaunchedUid === user.uid && document.getElementById("mainScreen") &&
       !document.getElementById("mainScreen").classList.contains("hidden")){
      loadFromFirestore().then(()=>renderMain()).catch(()=>{});
      return;
    }
    _lastLaunchedUid = user.uid;
    currentUser = user;

    // Avatar
    const avatar = document.getElementById("userAvatar");
    if(avatar){ if(user.photoURL){ avatar.src=user.photoURL; avatar.style.display="block"; } else { avatar.style.display="none"; } }

    // Settings y tema
    if(typeof loadSettingsOnly === 'function') loadSettingsOnly();
    else { try{ var _d=localStorage.getItem("cb-dark")==="0"?0:1; document.body.setAttribute("data-dark",_d?"1":""); }catch(e){} }

    // Datos locales primero (respuesta inmediata)
    try{
      const lb = JSON.parse(localStorage.getItem("cb-boxes-"+user.uid)||"[]");
      const lr = JSON.parse(localStorage.getItem("cb-rooms-"+user.uid)||"[]");
      if(lb.length > 0){ boxes=lb; rooms=lr; restoreThumbs(); }
    }catch(e){}

    if(typeof setupPWA === 'function') setupPWA();
    history.replaceState(null, "", location.pathname + location.search);

    // Ocultar login e ir a la app
    _hideLoginScreen();
    goMain();
    // Mostrar FAB tras login
    setTimeout(function(){var _f=document.getElementById('aiFab');if(_f){_f.style.display='flex';_f.style.opacity='1';_f.classList.remove('hidden');}},200);
    // Notificar al sistema de auto-mantenimiento que cargó bien
    if(typeof window._bvAppLoaded === 'function') window._bvAppLoaded();

    // Bloquear saves mientras Firestore carga (evita race condition)
    _firestoreLoading = true;
    try{
      await loadFromFirestore();
      renderMain();
      // Tutorial DESPUÉS de Firestore: así detecta tutorialDone en cualquier dispositivo
      initTutorial();
      // Backup diario silencioso (no bloquea la UI)
      setTimeout(()=>_maybeBackup().catch(()=>{}), 3000);
    }catch(e){
      console.warn("[BoxVision] loadFromFirestore falló en launchApp:", e);
      // Si Firestore falla, intentar igual (dependerá del localStorage)
      initTutorial();
    }finally{
      _firestoreLoading = false;
    }
  }

  // ── FIX: si hay sesión cacheada, ocultar login ANTES de que Firebase responda ──
  // Evita el parpadeo del login al recargar o presionar "atrás"
  (function(){
    try{
      const key = Object.keys(localStorage).find(k=>k.startsWith("firebase:authUser"));
      if(key){
        const cu = JSON.parse(localStorage.getItem(key)||"null");
        if(cu && cu.uid){
          // Hay sesión válida cacheada → ocultar login screen de inmediato
          const ls = document.getElementById("loginScreen");
          if(ls){ ls.style.display = "none"; ls.classList.add("hidden"); } // FIX: también agregar clase hidden
        }
      }
    }catch(e){}
  })();

  // ── Interceptar botón "atrás" del navegador ──
  // Evita que salga de la app o muestre el login al navegar hacia atrás
  history.replaceState({bv:true}, "");
  window.addEventListener("popstate", function(e){
    // SIEMPRE interceptar el atrás — nunca dejar que el usuario vea el landing
    // si ya inició sesión o está en proceso de auth
    const hasSession = currentUser || _lastLaunchedUid ||
      (typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser);

    if(hasSession){
      const detail = document.getElementById("detailScreen");
      if(detail && !detail.classList.contains("hidden")){
        history.pushState({bv:true}, "");
        goMain();
        return;
      }
      const room = document.getElementById("roomScreen");
      const settings = document.getElementById("settingsScreen");
      if((room && !room.classList.contains("hidden")) ||
         (settings && !settings.classList.contains("hidden"))){
        history.pushState({bv:true}, "");
        goMain();
        return;
      }
      history.pushState({bv:true}, "");
    } else {
      // Sin sesión: también bloquear para que no salga de la app
      history.pushState({bv:true}, "");
    }
  });

  // ── Spinner inicial mientras Firebase verifica sesión ──
  const _lb0 = document.getElementById("loginBtn");
  const _ll0 = document.getElementById("loginLoading");
  if(_lb0) _lb0.style.display = "none";
  if(_ll0) _ll0.style.display = "flex";

  // ── Timeout offline: 5s sin respuesta de Firebase → mostrar login ──
  let _authReady = false;
  const _offlineTimer = setTimeout(()=>{
    if(_authReady) return;
    _authReady = true;
    console.warn("[BoxVision] Firebase sin respuesta — intentando sesión cacheada");
    const key = Object.keys(localStorage).find(k=>k.startsWith("firebase:authUser"));
    if(key){
      try{
        const cu = JSON.parse(localStorage.getItem(key)||"null");
        if(cu && cu.uid){
          launchApp({uid:cu.uid, displayName:cu.displayName||"Usuario", email:cu.email||"", photoURL:cu.photoURL||null});
          return;
        }
      }catch(e){}
    }
    _showLoginScreen();
  }, 5000);

  // ── Listener principal — único punto de verdad ───
  auth.onAuthStateChanged(user=>{
    clearTimeout(_offlineTimer);
    _authReady = true;
    if(user){
      launchApp(user).catch(e=>{
        console.error("[BoxVision] launchApp falló:", e);
        _lastLaunchedUid = null;
        // Notificar al sistema de auto-mantenimiento
        if(typeof window._bvLoginFail === 'function') window._bvLoginFail(e.message||'launchApp error');
        _showLoginScreen();
      });
    } else {
      _lastLaunchedUid = null;
      _showLoginScreen();
    }
  });

} else {
  // Sin Firebase — modo local puro
  console.warn("Firebase no disponible — modo local");
  window._authEnabled = false;
  document.addEventListener("DOMContentLoaded", ()=>{
    loadAll();
    if(typeof setupPWA === 'function') setupPWA();
    initTutorial();
    if(typeof window._bvAppLoaded === 'function') window._bvAppLoaded();
    // FIX: en modo local, si hay cajas guardadas ir directo a main
    if(boxes && boxes.length > 0){
      history.replaceState(null, "", location.pathname + location.search);
      goMain();
      var _ff=document.getElementById("aiFab");if(_ff){_ff.style.display="flex";_ff.style.opacity="1";}
    } else {
      showSplash(); // primera vez sin cajas: mostrar landing
    }
  });
}
