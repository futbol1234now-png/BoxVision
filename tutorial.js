/* BoxVision — Tutorial de onboarding */

// ═══ TUTORIAL ═══
let tutStep=0;
const TUT_TOTAL=7;

async function initTutorial(){
  const uid=currentUser?.uid||"guest";
  // Primero verificar local (rápido)
  const seenLocal=localStorage.getItem("cb-tutorial-done-"+uid)||localStorage.getItem("cb-tutorial-done");
  if(seenLocal) return; // Ya visto → no mostrar

  // Si hay Firestore, verificar también ahí (para dispositivos nuevos)
  if(db && currentUser){
    try{
      const doc=await db.collection("users").doc(currentUser.uid).get();
      if(doc.exists && doc.data().tutorialDone){
        // Ya lo vio en otro dispositivo → guardar local y no mostrar
        localStorage.setItem("cb-tutorial-done-"+uid,"1");
        return;
      }
    }catch(e){}
  }

  // No lo ha visto nunca → mostrar
  document.getElementById("tutorial").classList.add("active");
  tutStep=0;
  setTimeout(initTutSwipe,100);
}

function initTutSwipe(){
  const slides=document.getElementById("tutSlides");
  if(!slides) return;
  let startX=0,startY=0;
  slides.addEventListener("touchstart",e=>{startX=e.touches[0].clientX;startY=e.touches[0].clientY;},{passive:true});
  slides.addEventListener("touchend",e=>{
    const dx=e.changedTouches[0].clientX-startX;
    const dy=Math.abs(e.changedTouches[0].clientY-startY);
    if(Math.abs(dx)>50&&dy<80){
      if(dx<0&&tutStep<TUT_TOTAL-1) goTut(tutStep+1);
      else if(dx>0&&tutStep>0) goTut(tutStep-1);
    }
  },{passive:true});
}

function goTut(step){
  const slides=document.querySelectorAll('.tut-slide');
  slides.forEach((s,i)=>{
    s.classList.remove('active','prev','next');
    if(i<step) s.classList.add('prev');
    else if(i===step) s.classList.add('active');
    else s.classList.add('next');
  });
  // Actualizar dots
  document.querySelectorAll('.tut-dot').forEach((d,i)=>{
    d.classList.toggle('active', i%TUT_TOTAL===step);
  });
  tutStep=step;
}

function nextTut(){
  if(tutStep<TUT_TOTAL-1) goTut(tutStep+1);
  else finishTut();
}

function finishTut(){
  const uid=currentUser?.uid||"guest";
  localStorage.setItem("cb-tutorial-done-"+uid,"1");
  // Guardar en Firestore para que no salga en otros dispositivos
  if(db && currentUser){
    db.collection("users").doc(currentUser.uid).set({tutorialDone:true},{merge:true}).catch(()=>{});
  }
  const tut=document.getElementById("tutorial");
  tut.style.opacity="0";
  tut.style.transition="opacity .3s";
  setTimeout(()=>{tut.classList.remove("active");tut.style.opacity="";tut.style.transition="";},300);
}


function funnyEmpty(){
  const msgs=[
    {e:"👀",t:"Aquí no hay nada… todavía",s:"Agrega el primer objeto arriba"},
    {e:"🦗",t:"Grillos. Solo grillos.",s:"Esta caja está más vacía que mis bolsillos"},
    {e:"🌵",t:"Desierto total",s:"Ni una piedra. Agrega algo."},
    {e:"🕳️",t:"El vacío te observa",s:"Dale vida a esta caja con algo"},
    {e:"📭",t:"Caja fantasma",s:"Existe pero no contiene nada... aún"},
    {e:"🥚",t:"Vacía como un huevo… sin yema",s:"Rellénala con lo que necesitas"},
  ];
  const m=msgs[Math.floor(Math.random()*msgs.length)];
  return `<div style="padding:24px 16px;text-align:center"><div style="font-size:36px;margin-bottom:8px">${m.e}</div><div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px">${m.t}</div><div style="font-size:13px;color:var(--muted)">${m.s}</div></div>`;
}


