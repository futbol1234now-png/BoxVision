/* BoxVision — Efectos visuales: confetti, toasts, progreso global */

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

// Toast con botón deshacer (7)
function showToastUndo(msg, onUndo){
  // Eliminar toast anterior si existe
  document.getElementById("toastUndo")?.remove();
  const t=document.createElement("div");
  t.id="toastUndo";
  t.style.cssText=`position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#1C1C1E;color:#fff;padding:12px 8px 12px 18px;border-radius:16px;font-size:14px;font-weight:600;z-index:9999;max-width:320px;width:max-content;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,.35),0 1px 0 rgba(255,255,255,.1) inset;animation:toastSpring .4s cubic-bezier(.175,.885,.32,1.275) both;backdrop-filter:blur(16px)`;
  const span=document.createElement("span");span.textContent=msg;
  const btn=document.createElement("button");
  btn.textContent="Deshacer";
  btn.style.cssText="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:10px;padding:6px 12px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit;flex-shrink:0";
  let undone=false;
  btn.onclick=()=>{if(!undone){undone=true;onUndo();t.remove();}};
  t.appendChild(span);t.appendChild(btn);
  document.body.appendChild(t);
  const timer=setTimeout(()=>{t.style.opacity="0";t.style.transition="opacity .3s";setTimeout(()=>t.remove(),300);},4000);
  btn.addEventListener("click",()=>clearTimeout(timer));
}

// Barra de progreso global de mudanza (9)
function renderGlobalProgress(){
  let el=document.getElementById("globalProgressBar");
  const totalObj=boxes.reduce((s,b)=>s+b.items.length,0);
  const doneObj=boxes.reduce((s,b)=>s+b.items.filter(i=>i.done).length,0);
  if(!totalObj){if(el)el.remove();return;}
  const pct=Math.round(doneObj/totalObj*100);
  if(!el){
    el=document.createElement("div");el.id="globalProgressBar";
    el.style.cssText="position:sticky;top:57px;z-index:99;padding:7px 14px 5px;background:var(--bg)";
    // Insertar justo antes del search-wrap
    const sw=document.querySelector(".search-wrap");
    if(sw) sw.parentNode.insertBefore(el,sw);
  }
  el.innerHTML=`<div style="display:flex;align-items:center;gap:9px">
    <div style="flex:1;height:5px;background:var(--border);border-radius:99px;overflow:hidden">
      <div style="height:100%;width:${pct}%;background:${pct>=100?"#34C759":pct>=60?"#0A84FF":"#FF9500"};border-radius:99px;transition:width .5s cubic-bezier(.4,0,.2,1)"></div>
    </div>
    <span style="font-size:11px;font-weight:700;color:var(--muted);white-space:nowrap;letter-spacing:.2px">${doneObj}/${totalObj} sacados · ${pct}%</span>
  </div>`;
}





function shareBoxWhatsApp(){
  const box=boxes.find(b=>b.id===currentBoxId); if(!box) return;
  const payload={n:box.name,num:box.number,loc:box.location,col:box.color,tags:box.tags,
    items:(box.items||[]).slice(0,20).map(i=>({t:i.text.slice(0,40),d:i.done?1:0})),
    date:box.date,note:(box.note||"").slice(0,100),pri:box.priority,w:box.weight,brand:settings.brand};
  const data=btoa(encodeURIComponent(JSON.stringify(payload)));
  // FIX URL: calcular base robustamente — funciona en raíz y en subdirectorios de GitHub Pages
  const pathParts=location.pathname.split("/").filter(Boolean);
  // Si el último segmento tiene extensión (ej: index.html, app.html) quitarlo
  if(pathParts.length && pathParts[pathParts.length-1].includes(".")) pathParts.pop();
  const base=location.origin+(pathParts.length?"/"+pathParts.join("/"):"")+"/";
  const url=base+'viewer.html#view/'+data;
  const items=box.items.length>0?box.items.slice(0,5).map((it,i)=>`${i+1}. ${it.text}`).join("\n")+"\n":"(vacía)\n";
  const msg=`📦 *${box.name}*${box.number?" (#"+box.number+")":""}\n${box.location?"📍 "+box.location+"\n":""}\n${items}\n🔗 Ver todo: ${url}`;
  window.open("https://wa.me/?text="+encodeURIComponent(msg),"_blank");
}


