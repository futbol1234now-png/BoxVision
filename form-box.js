/* BoxVision — Formulario crear/editar caja */

function _hideFab(){const f=document.getElementById("aiFab");if(f){f.style.display="none";f.classList.add("hidden");}}
function _showFabForm(){const f=document.getElementById("aiFab");if(f){f.style.display="flex";f.style.opacity="1";f.classList.remove("hidden");}}

function openForm(){
  formMode="new";editingBoxId=null;currentTags=[];selectedColor=COLORS[5];selectedPri="yellow";
  ["fName","fNum","fLoc","fWeight","fPassword"].forEach(id=>document.getElementById(id).value="");
  buildColorGrid();renderTagChips();updatePriBtns();populateRelatedSelect(null);
  updateFormPreview();
  document.getElementById("modalOverlay").classList.add("open");
  _hideFab();
  setTimeout(()=>document.getElementById("fName").focus(),100);
}
function openEditForm(){
  const box=boxes.find(b=>b.id===currentBoxId);if(!box) return;
  formMode="edit";editingBoxId=currentBoxId;currentTags=[...(box.tags||[])];selectedColor=box.color||COLORS[5];selectedPri=box.priority||"yellow";
  document.getElementById("fName").value=box.name||"";
  document.getElementById("fNum").value=box.number||"";
  document.getElementById("fLoc").value=box.location||"";
  document.getElementById("fWeight").value=box.weight||"";
  document.getElementById("fPassword").value=box.password||"";
  buildColorGrid();renderTagChips();updatePriBtns();populateRelatedSelect(box.related);
  updateFormPreview();
  document.getElementById("modalOverlay").classList.add("open");
  _hideFab();
}
function closeForm(){document.getElementById("modalOverlay").classList.remove("open");_showFabForm();}
function closeFormOutside(e){if(e.target===document.getElementById("modalOverlay")) closeForm();}
function populateRelatedSelect(cur){
  document.getElementById("fRelated").innerHTML='<option value="">— Ninguna —</option>'+
    boxes.filter(b=>b.id!==editingBoxId&&b.id!==currentBoxId).map(b=>`<option value="${b.id}"${b.id===cur?" selected":""}>${esc(b.name)}</option>`).join("");
}
const COLOR_NAMES={"#FF3B30":"Rojo","#FF9500":"Naranja","#FFCC00":"Amarillo","#34C759":"Verde","#00C7BE":"Teal","#007AFF":"Azul","#5856D6":"Índigo","#AF52DE":"Púrpura","#FF2D55":"Rosa","#636366":"Gris"};
function buildColorGrid(){
  document.getElementById("colorGrid").innerHTML=COLORS.map(c=>`<div class="cdot-wrap${c===selectedColor?" sel":""}" onclick="selectColor('${c}')"><div class="cdot" style="background:${c}"></div><div class="cdot-name">${COLOR_NAMES[c]||""}</div></div>`).join("");
}
function selectColor(c){selectedColor=c;buildColorGrid();updateFormPreview();}
function setPri(p){selectedPri=p;updatePriBtns();updateFormPreview();}
function updatePriBtns(){["red","yellow","green"].forEach(p=>{document.getElementById("pri-"+p).classList.toggle("sel",p===selectedPri);});}
const PRI_BADGES={red:"🔴 Urgente",yellow:"🟡 Normal",green:"🟢 Sin prisa"};
function updateFormPreview(){
  const name=document.getElementById("fName")?.value||"";
  const loc=document.getElementById("fLoc")?.value||"";
  const num=document.getElementById("fNum")?.value||"";
  const nameEl=document.getElementById("formPreviewName");
  const metaEl=document.getElementById("formPreviewMeta");
  const badgeEl=document.getElementById("formPreviewBadge");
  const bgEl=document.getElementById("formPreviewBg");
  const iconEl=document.getElementById("formPreviewIcon");
  if(nameEl) nameEl.textContent=name||"Nueva caja";
  if(metaEl){
    const parts=[];
    if(loc) parts.push("📍 "+loc);
    if(num) parts.push("#"+num);
    metaEl.textContent=parts.length?parts.join(" · "):"Sin ubicación";
  }
  if(badgeEl) badgeEl.textContent=PRI_BADGES[selectedPri]||"🟡 Normal";
  if(bgEl) bgEl.style.background=`linear-gradient(160deg,${selectedColor},${hexToRgba(selectedColor,.55)} 90%,rgba(88,86,214,.5))`;
  if(iconEl) iconEl.textContent=getIcon(name)||"📦";
}
function renderTagChips(){
  const box=document.getElementById("tagsBox"),field=document.getElementById("tagField");
  box.innerHTML="";
  currentTags.forEach((t,i)=>{const c=document.createElement("span");c.className="tag-chip";c.innerHTML=`${esc(t)}<button onclick="removeTag(${i})">✕</button>`;box.appendChild(c);});
  box.appendChild(field);
}
function handleTagKey(e){if((e.key==="Enter"||e.key===",")&&e.target.value.trim()){e.preventDefault();addTag(e.target.value.trim());e.target.value="";}}
function addTag(t){if(!currentTags.includes(t)){currentTags.push(t);renderTagChips();}}
function removeTag(i){currentTags.splice(i,1);renderTagChips();}
let _savingForm=false;
function saveForm(){
  if(_savingForm) return; // FIX G: prevenir doble tap
  const name=document.getElementById("fName").value.trim();if(!name){alert("Escribe un nombre");return;}
  _savingForm=true;
  try{
    if(formMode==="new"){
      const newBox={id:genId(),name,number:document.getElementById("fNum").value.trim(),
        location:document.getElementById("fLoc").value.trim(),weight:document.getElementById("fWeight").value.trim(),
        color:selectedColor,priority:selectedPri,tags:[...currentTags],related:document.getElementById("fRelated").value||null,
        password:document.getElementById("fPassword").value||null,
        items:[],date:fmtDate(),note:"",photo:null,fav:false,lastUsed:0,history:[],sealed:false,lastModified:Date.now()};
      boxes.push(newBox);
      // Solicitar ícono IA en background
      setTimeout(()=>fetchSmartIcon(newBox), 300);
    }else{
      const box=boxes.find(b=>b.id===editingBoxId);
      if(box){
        // Si cambió el nombre, resetear ícono para que IA recalcule
        if(box.name !== name) delete box.icon;
        Object.assign(box,{name,number:document.getElementById("fNum").value.trim(),location:document.getElementById("fLoc").value.trim(),weight:document.getElementById("fWeight").value.trim(),color:selectedColor,priority:selectedPri,tags:[...currentTags],related:document.getElementById("fRelated").value||null,password:document.getElementById("fPassword").value||null,lastModified:Date.now()});
        if(!box.icon) setTimeout(()=>fetchSmartIcon(box), 300);
      }
    }
    const _mode=formMode, _id=editingBoxId;
    saveData();closeForm();
    // Actualizar contadores del splash al instante (ya están en boxes[])
    updateSplashCounters && updateSplashCounters();
    setTimeout(()=>{
      _savingForm=false; // FIX G
      if(_mode==="new"){showToast("✅ Caja guardada","#34C759");goMain();}
      else{showToast("✏️ Cambios guardados","#34C759");openDetail(_id);}
    },50);
  }catch(e){
    // FIX BUG #1: si cualquier error ocurre, siempre desbloquear el formulario
    _savingForm=false;
    console.warn("saveForm error:",e);
    showToast("❌ Error al guardar, intenta de nuevo","#FF3B30");
  }
}
