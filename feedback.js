/* BoxVision — Feedback, viewer de QR, linterna, TTS */

// _feedbackCat declarado en utils.js

function openFeedbackModal(){
  document.getElementById('feedbackTextarea').value='';
  document.getElementById('feedbackSendBtn').disabled=false;
  document.getElementById('feedbackSendBtn').textContent='Enviar';
  // Reset chips
  document.querySelectorAll('.feedback-chip').forEach(c=>c.classList.remove('selected'));
  const first = document.querySelector('.feedback-chip[data-cat="bug"]');
  if(first) first.classList.add('selected');
  _feedbackCat='bug';
  document.getElementById('feedbackModal').style.display='flex';
  setTimeout(()=>document.getElementById('feedbackTextarea').focus(), 300);
}
function closeFeedbackModal(){
  document.getElementById('feedbackModal').style.display='none';
}
function selectFeedbackChip(el){
  document.querySelectorAll('.feedback-chip').forEach(c=>c.classList.remove('selected'));
  el.classList.add('selected');
  _feedbackCat = el.dataset.cat || 'otro';
}
async function sendFeedback(){
  const text = (document.getElementById('feedbackTextarea').value||'').trim();
  if(!text){ showToast('✏️ Escribe tu mensaje primero','#FF9500'); return; }
  const btn = document.getElementById('feedbackSendBtn');
  btn.disabled=true; btn.textContent='Enviando…';

  const entry = {
    cat:  _feedbackCat,
    msg:  text,
    user: currentUser?.email || 'anónimo',
    uid:  currentUser?.uid   || null,
    displayName: currentUser?.displayName || null,
    date: new Date().toISOString(),
    v:    '2.6.0',
    boxes: boxes.length,
    ua:   navigator.userAgent.substring(0, 120)
  };

  let firestoreOk  = false;
  let emailjsOk    = false;
  let mailtoOpened = false;

  // ── 1. Firestore (historial en la nube) ──────────────────────────────────
  if(db){
    try{
      await db.collection('feedback').add({
        ...entry,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      firestoreOk = true;
    }catch(e){
      console.warn('[Feedback] Firestore falló:', e.message);
    }
  }

  // ── 2. localStorage (historial local siempre) ────────────────────────────
  try{
    const prev = JSON.parse(localStorage.getItem('cb-feedback-pending')||'[]');
    prev.push({ ...entry, firestoreSaved: firestoreOk });
    localStorage.setItem('cb-feedback-pending', JSON.stringify(prev.slice(-30)));
  }catch(_){}

  // ── 3. EmailJS — envía directo a tu Gmail sin cliente de correo ──────────
  if(window._emailjsReady &&
     window.EMAILJS_SERVICE_ID  !== 'TU_SERVICE_ID' &&
     window.EMAILJS_TEMPLATE_ID !== 'TU_TEMPLATE_ID'){
    try{
      await emailjs.send(
        window.EMAILJS_SERVICE_ID,
        window.EMAILJS_TEMPLATE_ID,
        {
          from_user:   entry.user + (entry.displayName ? ' (' + entry.displayName + ')' : ''),
          category:    entry.cat,
          message:     entry.msg,
          boxes_count: String(entry.boxes),
          date:        new Date(entry.date).toLocaleString('es-PE'),
          app_version: entry.v,
          user_agent:  entry.ua.substring(0,80)
        }
      );
      emailjsOk = true;
      console.log('[Feedback] EmailJS OK ✅');
    }catch(e){
      console.warn('[Feedback] EmailJS falló:', e.text || e.message || e);
    }
  }

  // ── 4. Fallback mailto — solo si EmailJS no está configurado o falló ─────
  // Y solo si Firestore también falló (para no ser spam)
  if(!emailjsOk && !firestoreOk){
    try{
      const subject = encodeURIComponent('[BoxVision ' + _feedbackCat + '] Feedback v2.6.0');
      const body    = encodeURIComponent(
        text +
        '\n\n— ' + entry.user +
        '\nCajas: ' + entry.boxes +
        '\nFecha: ' + entry.date
      );
      const a = document.createElement('a');
      a.href = 'mailto:futbol1234now@gmail.com?subject='+subject+'&body='+body;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      mailtoOpened = true;
    }catch(_){}
  }

  // ── 5. Resultado al usuario ──────────────────────────────────────────────
  btn.textContent = '✓ Enviado';
  let toastMsg, toastColor;
  if(emailjsOk){
    toastMsg   = '📬 Feedback enviado a tu correo!';
    toastColor = '#34C759';
  } else if(firestoreOk){
    toastMsg   = '✅ Feedback guardado — gracias!';
    toastColor = '#34C759';
  } else if(mailtoOpened){
    toastMsg   = '📧 Abriendo cliente de correo...';
    toastColor = '#FF9500';
  } else {
    toastMsg   = '📋 Feedback guardado localmente';
    toastColor = '#8E8E93';
  }
  setTimeout(()=>{ closeFeedbackModal(); showToast(toastMsg, toastColor); }, 700);
}

function playBeep(){
  try{
    const soundOn=document.getElementById('soundToggleWrap')?.classList.contains('on')??true;
    if(!soundOn) return;
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    osc.type='sine';
    osc.frequency.setValueAtTime(1200,ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900,ctx.currentTime+0.12);
    gain.gain.setValueAtTime(0.4,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.18);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime+0.18);
    osc.onended=()=>ctx.close();
  }catch(e){}
}

function showViewer(box){
  playBeep();
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
    const _vkey = currentUser ? "cb-boxes-"+currentUser.uid : "cb-boxes";
    const local=JSON.parse(localStorage.getItem(_vkey)||"[]");
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
  document.getElementById("vBg").style.background=`linear-gradient(135deg,${col},${hexToRgba(col,.6)})`;
  if(box.photo){const vp=document.getElementById("vPhoto");vp.src=box.photo;vp.classList.remove("hidden");}
  // Normalize compressed QR keys
  if(box.n&&!box.name){box.name=box.n;box.number=box.num;box.location=box.loc;box.color=box.col;box.priority=box.pri;box.weight=box.w;if(box.rel)box.related=box.rel;box.items=(box.items||[]).map(i=>typeof i==="object"&&i.t?{text:i.t,done:!!i.d}:i);}
  document.getElementById("vIcon").textContent=getIcon(box.name, box);
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


