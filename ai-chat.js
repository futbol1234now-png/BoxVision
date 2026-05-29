/* BoxVision — Box IA: asistente de mudanzas con Llama 3.3 */

// aiOpen declarado en utils.js
// aiHistory declarado en utils.js
// aiStreaming declarado en utils.js

// AI_INTRO declarado en utils.js

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
    fab.style.display = "flex"; fab.style.opacity = "1";
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
    const WORKER_BASE = BOX_IA_WORKER;
    const res=await fetch(WORKER_BASE+"/models");
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
  // Guardar key cifrada en sessionStorage y marcar como conectado en localStorage
  const inp = document.getElementById("aiKeyInput");
  const key = inp ? inp.value.trim() : "";
  if(key) _saveGroqKey(key); // sessionStorage ofuscado — no queda en texto plano
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
  localStorage.removeItem("boxia_key"); // limpiar legacy si existía
  _clearGroqKey(); // FIX SEGURIDAD: limpiar sessionStorage
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
    div.innerHTML = `<div class="ai-msg-avatar"><span style="position:relative;z-index:1;font-size:12px">✦</span></div><div class="ai-bubble"></div>`;
    msgs.appendChild(div);
    const bubble = div.querySelector(".ai-bubble");
    if(animate) typewriterHTML(bubble, sanitizeAI(html));
    else bubble.innerHTML = sanitizeAI(html);
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
  let lastFrame = 0;
  const CHAR_DELAY = 8; // ms per character

  function tick(ts){
    // FIX: cancelar si el elemento ya no está en el DOM (panel IA cerrado durante respuesta)
    if(!el.isConnected){ el.innerHTML = full; return; }

    if(!lastFrame) lastFrame = ts;
    const elapsed = ts - lastFrame;
    // Avanzar tantos caracteres como correspondan al tiempo transcurrido
    const charsToAdd = Math.max(1, Math.floor(elapsed / CHAR_DELAY));
    lastFrame = ts;

    for(let c = 0; c < charsToAdd && i < full.length; c++){
      const ch = full[i];
      if(ch === "<") insideTag = true;
      rendered += ch;
      if(insideTag && ch === ">") insideTag = false;
      i++;
    }

    if(i >= full.length){
      el.innerHTML = full;
      return;
    }

    if(!insideTag){
      el.innerHTML = rendered + "<span class='ai-cursor'>▋</span>";
      const msgs = document.getElementById("aiMessages");
      if(msgs) msgs.scrollTop = 99999;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function aiShowTyping(){
  const msgs = document.getElementById("aiMessages");
  const div = document.createElement("div");
  div.className = "ai-msg bot"; div.id = "aiTyping";
  div.innerHTML = `<div class="ai-msg-avatar"><span style="position:relative;z-index:1;font-size:12px">✦</span></div><div class="ai-bubble"><div class="ai-typing"><span></span><span></span><span></span></div></div>`;
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
  const locationList = [...new Set(boxes.map(b=>b.location).filter(Boolean))]; // BUG FIX #3: renombrado para no pisar la variable global 'rooms'
  // FIX D: limitar snapshot — max 30 cajas y 10 items por caja para no saturar el contexto
  const boxList = boxes.slice(0,30).map(b=>({
    nombre:b.name, numero:b.number||null, ubicacion:b.location||null,
    prioridad:b.priority==="red"?"urgente":b.priority==="green"?"baja":"normal",
    objetos:b.items.slice(0,10).map(i=>i.text+(i.done?" [sacado]":"")),
    sellada:b.sealed, favorita:b.fav, peso:b.weight||null, tags:b.tags||[]
  }));
  const snapshotNote = boxes.length>30?`\n(Mostrando 30 de ${boxes.length} cajas)`:"";
  return `CONTEXTO DE MUDANZA (${new Date().toLocaleDateString("es-PE",{weekday:"long",day:"numeric",month:"long"})}):
- Cajas: ${boxes.length} | Objetos: ${totalItems} | Sacados: ${doneItems} | Progreso: ${pct}%
- Urgentes: ${urgent} | Habitaciones: ${locationList.join(", ")||"sin asignar"}${snapshotNote}
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
    const WORKER_AI_URL = BOX_IA_WORKER + "/chat";
    const res = await fetch(WORKER_AI_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"llama-3.3-70b-versatile",
        max_tokens:1000,
        messages:[
          {role:"system", content:`Eres Box IA, asistente experto en mudanzas y organización de cajas. Responde siempre en español (Perú). Usa HTML básico para formato: <b>, <br>. Sin markdown con asteriscos. Sé conciso, útil y empático. Cuando busques objetos revisa todas las cajas. Puedes dar consejos de organización y anticipar necesidades del usuario.\n\n${buildContextSnapshot()}`},
          ...aiHistory.slice(-20).map(m=>({role:m.role, content:m.content})) // FIX C: max 20 msgs
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
  if(isViewer){
    fab.classList.add("hidden");
    fab.style.display = "none";
  } else {
    fab.classList.remove("hidden");
    if(!aiOpen){
      fab.style.display = "flex";
      fab.style.opacity = "1";
    }
  }
}

window.addEventListener("hashchange",()=>{route();updateFABVisibility();});
document.addEventListener("DOMContentLoaded",applySplashGradient);
// route() se llama desde onAuthStateChanged tras el login
