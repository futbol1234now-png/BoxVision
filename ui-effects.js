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


// showToast movida a utils.js

// ANIMO_MSGS movida a utils.js
// animoToast movida a utils.js

// Toast con botón deshacer (7)
// showToastUndo movida a utils.js

// Barra de progreso global de mudanza (9)
// renderGlobalProgress movida a utils.js





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


