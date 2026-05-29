/* BoxVision — Sistema de habitaciones (drag & drop) */

// ═══ ROOMS v2.5 — Sistema mejorado ═══

// Emojis para habitaciones
const ROOM_EMOJIS = ['🛏','🛋','🍳','🚿','📚','🚗','🌿','🏋','💼','👶','🎮','🎨','🧺','🔧','🍽','🪴','🛠','📦','🎵','🌟'];
const ROOM_COLORS = ['#0A84FF','#5856D6','#34C759','#FF9500','#FF3B30','#AF52DE','#FF2D55','#30B0C7','#FF6B35','#00C7BE'];

var _roomModalMode   = null; // "add" | "rename"
var _roomModalId     = null;
var _roomModalEmoji  = '🏠';
var _roomDetailId    = null;

function goRoom(){
  showScreen("roomScreen");
  renderRoom();
  // Inicializar emoji grid si no está
  _initEmojiGrid();
}

function _initEmojiGrid(){
  var grid = document.getElementById("roomEmojiGrid");
  if(!grid || grid.children.length > 0) return;
  grid.innerHTML = ROOM_EMOJIS.map(function(e){
    return `<button class="room-emoji-opt${e===_roomModalEmoji?' sel':''}" onclick="_selectRoomEmoji('${e}')">${e}</button>`;
  }).join("");
}

function _selectRoomEmoji(emoji){
  _roomModalEmoji = emoji;
  document.querySelectorAll(".room-emoji-opt").forEach(function(btn){
    btn.classList.toggle("sel", btn.textContent === emoji);
  });
}

// ── Modal ──────────────────────────────────────────────────────────
function _openRoomModal(title, prefill, prefillEmoji){
  var overlay = document.getElementById("roomModalOverlay");
  var sheet   = document.getElementById("roomModalSheet");
  var inp     = document.getElementById("roomModalInput");
  document.getElementById("roomModalTitle").textContent = title;
  inp.value = prefill || "";
  _roomModalEmoji = prefillEmoji || '🏠';
  // Reiniciar emojis con selección correcta
  var grid = document.getElementById("roomEmojiGrid");
  if(grid){
    grid.innerHTML = ROOM_EMOJIS.map(function(e){
      return `<button class="room-emoji-opt${e===_roomModalEmoji?' sel':''}" onclick="_selectRoomEmoji('${e}')">${e}</button>`;
    }).join("");
  }
  overlay.style.display = "flex";
  requestAnimationFrame(function(){ sheet.style.transform = "translateY(0)"; });
  setTimeout(function(){ inp.focus(); inp.select(); }, 350);
}

function closeRoomModal(){
  var sheet   = document.getElementById("roomModalSheet");
  var overlay = document.getElementById("roomModalOverlay");
  sheet.style.transform = "translateY(100%)";
  setTimeout(function(){ overlay.style.display = "none"; }, 320);
  _roomModalMode = null; _roomModalId = null;
}

function confirmRoomModal(){
  var n = (document.getElementById("roomModalInput").value || "").trim().slice(0,50);
  if(!n){ document.getElementById("roomModalInput").focus(); return; }
  if(_roomModalMode === "add"){
    var colorIdx = rooms.length % ROOM_COLORS.length;
    rooms.push({id:genId(), name:n, emoji:_roomModalEmoji, color:ROOM_COLORS[colorIdx], boxIds:[]});
  } else if(_roomModalMode === "rename"){
    var r = rooms.find(function(x){ return x.id === _roomModalId; });
    if(r){ r.name = n; r.emoji = _roomModalEmoji; }
  }
  saveRooms(); renderRoom(); closeRoomModal();
  showToast(_roomModalMode==="add"?"🏠 Habitación creada":"✏️ Habitación actualizada","#34C759");
}

function addRoom(){
  _roomModalMode="add"; _roomModalId=null; _roomModalEmoji='🏠';
  _openRoomModal("Nueva habitación","","🏠");
}

// ── Render principal ────────────────────────────────────────────────
function renderRoom(){
  const assigned = new Set(rooms.flatMap(r=>r.boxIds));
  const unassigned = boxes.filter(b=>!assigned.has(b.id));

  // Stats globales
  const totalBoxes = boxes.length;
  const assignedCount = assigned.size;
  const totalItems = boxes.reduce((s,b)=>s+b.items.length,0);
  const doneItems = boxes.reduce((s,b)=>s+b.items.filter(i=>i.done).length,0);
  const pct = totalItems>0?Math.round(doneItems/totalItems*100):0;
  var statsEl = document.getElementById("roomGlobalStats");
  if(statsEl){
    statsEl.innerHTML=`
      <div class="rgs-pill" style="border-top:2px solid #0A84FF"><div class="rgs-val" style="color:#0A84FF">${rooms.length}</div><div class="rgs-lbl">Cuartos</div></div>
      <div class="rgs-pill" style="border-top:2px solid #5856D6"><div class="rgs-val" style="color:#5856D6">${assignedCount}/${totalBoxes}</div><div class="rgs-lbl">Asignadas</div></div>
      <div class="rgs-pill" style="border-top:2px solid #34C759"><div class="rgs-val" style="color:#34C759">${pct}%</div><div class="rgs-lbl">Desempacado</div></div>
    `;
  }

  // Topbar sub
  var topSub = document.getElementById("roomTopbarSub");
  if(topSub) topSub.textContent = rooms.length + " cuarto"+(rooms.length!==1?"s":"")+" · "+unassigned.length+" sin asignar";

  // Chips sin asignar
  document.getElementById("unassignedChips").innerHTML=
    unassigned.length
      ? unassigned.map(b=>chipHtml(b,"unassigned")).join("")
      : '<div style="color:var(--muted);font-size:13px;padding:4px 0;display:flex;align-items:center;gap:6px">✅ Todas las cajas están asignadas</div>';

  // Grid de habitaciones
  if(!rooms.length){
    document.getElementById("roomGrid").innerHTML=`
      <div style="grid-column:1/-1;text-align:center;padding:40px 20px">
        <div style="font-size:40px;margin-bottom:12px">🏠</div>
        <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px">Sin habitaciones aún</div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:20px">Crea tu primer cuarto para organizar las cajas</div>
        <button onclick="addRoom()" style="background:linear-gradient(135deg,#0A84FF,#5856D6);color:#fff;border:none;border-radius:14px;padding:13px 24px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 16px rgba(10,132,255,.35)">+ Crear habitación</button>
      </div>`;
  } else {
    document.getElementById("roomGrid").innerHTML = rooms.map(function(room){
      return _roomCellHtml(room, boxes);
    }).join("");
  }

  // Activar drag-and-drop en chips
  document.querySelectorAll(".room-box-chip").forEach(function(chip){
    chip.draggable=true;
    chip.ondragstart=function(e){
      e.dataTransfer.setData("text/plain",JSON.stringify({boxId:chip.dataset.id,from:chip.dataset.room}));
      chip.style.opacity=".5";
    };
    chip.ondragend=function(){ chip.style.opacity=""; };
  });
}

function _roomCellHtml(room, boxes){
  const color = room.color || '#0A84FF';
  const emoji = room.emoji || '🏠';
  const roomBoxes = room.boxIds.map(bid=>boxes.find(x=>x.id===bid)).filter(Boolean);
  const totalItems = roomBoxes.reduce((s,b)=>s+b.items.length,0);
  const doneItems  = roomBoxes.reduce((s,b)=>s+b.items.filter(i=>i.done).length,0);
  const pct = totalItems>0?Math.round(doneItems/totalItems*100):0;
  // Preview de cajas (máx 3 + contador)
  const previewBoxes = roomBoxes.slice(0,3);
  const extra = roomBoxes.length - previewBoxes.length;
  const chipsHtml = previewBoxes.map(function(b){
    return `<div class="room-box-chip-mini"><span>${getIcon(b.name,b)}</span><span style="overflow:hidden;text-overflow:ellipsis">${esc(b.name)}</span></div>`;
  }).join("") + (extra>0?`<div class="room-cell-more">+${extra} más</div>`:"");

  return `<div class="room-cell" id="room-${room.id}"
    ondragover="event.preventDefault();event.currentTarget.classList.add('drag-over')"
    ondragleave="event.currentTarget.classList.remove('drag-over')"
    ondrop="dropBox(event,'${room.id}')"
    onclick="_openRoomDetail('${room.id}')">

    <!-- Borde superior coloreado -->
    <div style="height:3px;background:linear-gradient(90deg,${color},${color}88);border-radius:24px 24px 0 0;flex-shrink:0"></div>

    <!-- Header coloreado -->
    <div class="room-cell-header">
      <div class="room-cell-header-bg" style="background:${color}"></div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;position:relative;z-index:1">
        <div class="room-cell-emoji">${emoji}</div>
        <!-- Badge de progreso si hay objetos -->
        ${totalItems>0?`<div style="background:rgba(0,0,0,.25);backdrop-filter:blur(8px);border:0.5px solid rgba(255,255,255,.15);border-radius:99px;padding:3px 8px;font-size:10px;font-weight:800;color:#fff;flex-shrink:0;margin-top:2px">${pct}%</div>`:""}
      </div>
      <div class="room-cell-name-row">
        <div class="room-cell-name">${esc(room.name)}</div>
        <div class="room-cell-actions" onclick="event.stopPropagation()">
          <button class="room-cell-btn room-cell-btn-edit" onclick="event.stopPropagation();renameRoom('${room.id}')" title="Renombrar">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar
          </button>
          <button class="room-cell-btn room-cell-btn-del" onclick="event.stopPropagation();deleteRoom('${room.id}')" title="Eliminar">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            Borrar
          </button>
        </div>
      </div>
    </div>

    <!-- Cuerpo -->
    <div class="room-cell-body">
      <div class="room-cell-count">
        <span class="room-cell-count-dot" style="background:${color}"></span>
        ${roomBoxes.length} caja${roomBoxes.length!==1?"s":""} · ${totalItems} obj.
      </div>
      ${totalItems>0?`
        <div class="room-cell-prog">
          <div class="room-cell-prog-fill" style="width:${pct}%;background:linear-gradient(90deg,${color},${color}cc)"></div>
        </div>
      `:""}
      <div class="room-box-chips-preview">
        ${roomBoxes.length ? chipsHtml : '<div class="room-cell-empty">Arrastra cajas aquí</div>'}
      </div>
    </div>
  </div>`;
}

function chipHtml(b, room){
  return `<div class="room-box-chip" data-id="${b.id}" data-room="${room}">
    <span class="room-chip-icon">${getIcon(b.name, b)}</span>
    <span class="room-chip-name">${esc(b.name)}</span>
    ${b.number?`<span style="font-size:10px;background:var(--accent);color:#fff;border-radius:4px;padding:1px 5px">#${esc(b.number)}</span>`:""}
  </div>`;
}

function dropBox(e, toId){
  e.preventDefault();e.currentTarget.classList.remove("drag-over");
  try{
    const {boxId,from}=JSON.parse(e.dataTransfer.getData("text/plain"));
    if(from!=="unassigned"){const fr=rooms.find(r=>r.id===from);if(fr)fr.boxIds=fr.boxIds.filter(id=>id!==boxId);}
    if(toId!=="unassigned"){const tr=rooms.find(r=>r.id===toId);if(tr&&!tr.boxIds.includes(boxId))tr.boxIds.push(boxId);}
    else rooms.forEach(r=>{r.boxIds=r.boxIds.filter(id=>id!==boxId);});
    saveRooms();renderRoom();
    showToast("📦 Caja movida","#34C759");
  }catch(err){}
}

function renameRoom(id){
  var r=rooms.find(function(x){return x.id===id;});
  if(!r) return;
  _roomModalMode="rename"; _roomModalId=id;
  _openRoomModal("Renombrar habitación", r.name, r.emoji||'🏠');
}

function deleteRoom(id){
  _showConfirm({
    icon:"🗂️",
    title:"Eliminar habitación",
    msg:"Las cajas asignadas pasarán a <strong>Sin asignar</strong>.",
    confirmLabel:"Eliminar",
    confirmColor:"#FF3B30",
    onConfirm:function(){
      rooms=rooms.filter(function(r){return r.id!==id;});
      saveRooms(); renderRoom();
      // Cerrar panel detalle si estaba abierto para esta habitación
      if(_roomDetailId === id) closeRoomDetail();
      showToast("Habitación eliminada","#636366");
    }
  });
}

// ── Panel de detalle ────────────────────────────────────────────────
function _openRoomDetail(id){
  var room = rooms.find(function(r){return r.id===id;});
  if(!room) return;
  _roomDetailId = id;
  var color = room.color || '#0A84FF';
  var emoji = room.emoji || '🏠';
  var roomBoxes = room.boxIds.map(function(bid){return boxes.find(function(x){return x.id===bid;});}).filter(Boolean);
  var totalItems = roomBoxes.reduce(function(s,b){return s+b.items.length;},0);
  var doneItems  = roomBoxes.reduce(function(s,b){return s+b.items.filter(function(i){return i.done;}).length;},0);
  var pct = totalItems>0?Math.round(doneItems/totalItems*100):0;

  // Hero
  document.getElementById("roomDetailEmoji").textContent = emoji;
  document.getElementById("roomDetailName").textContent = room.name;
  document.getElementById("roomDetailMeta").textContent = roomBoxes.length+" caja"+(roomBoxes.length!==1?"s":"")+" · "+totalItems+" objeto"+(totalItems!==1?"s":"");
  document.getElementById("roomDetailHeroBg").style.background = color;

  // Stats
  document.getElementById("roomDetailStats").innerHTML=`
    <div class="rds-card"><div class="rds-val">${roomBoxes.length}</div><div class="rds-lbl">Cajas</div></div>
    <div class="rds-card"><div class="rds-val">${totalItems}</div><div class="rds-lbl">Objetos</div></div>
    <div class="rds-card"><div class="rds-val" style="color:#34C759">${pct}%</div><div class="rds-lbl">Listo</div></div>
  `;

  // Progreso
  document.getElementById("roomDetailProgPct").textContent = pct+"%";
  document.getElementById("roomDetailProgFill").style.width = pct+"%";
  document.getElementById("roomDetailProgFill").style.background = pct===100?"#34C759":color;

  // Lista de cajas
  document.getElementById("roomDetailBoxList").innerHTML = roomBoxes.length
    ? roomBoxes.map(function(b){
        var bTotal = b.items.length;
        var bDone  = b.items.filter(function(i){return i.done;}).length;
        var bPct   = bTotal>0?Math.round(bDone/bTotal*100):0;
        var isDone = bTotal>0 && bDone===bTotal;
        return `<div class="room-detail-box-item" onclick="closeRoomDetail();setTimeout(function(){openDetail('${b.id}')},200)">
          <div class="room-dbi-icon">${getIcon(b.name,b)}</div>
          <div class="room-dbi-info">
            <div class="room-dbi-name">${esc(b.name)}</div>
            <div class="room-dbi-sub">${bTotal} objeto${bTotal!==1?"s":""} · ${bDone} sacado${bDone!==1?"s":""}</div>
          </div>
          <span class="room-dbi-badge ${isDone?'done':'pending'}">${isDone?'✓ Listo':bPct+'%'}</span>
        </div>`;
      }).join("")
    : `<div style="text-align:center;padding:32px 20px;color:var(--muted)">
        <div style="font-size:32px;margin-bottom:10px">📭</div>
        <div style="font-size:14px;font-weight:600">Sin cajas asignadas</div>
        <div style="font-size:12px;margin-top:4px">Arrastra cajas desde "Sin asignar"</div>
       </div>`;

  // Botones de acción
  document.getElementById("roomDetailEditBtn").onclick = function(){ closeRoomDetail(); setTimeout(function(){renameRoom(id);},220); };
  document.getElementById("roomDetailDeleteBtn").onclick = function(){ deleteRoom(id); };

  // Abrir panel
  var panel = document.getElementById("roomDetailPanel");
  panel.style.display = "block";
  requestAnimationFrame(function(){
    panel.classList.add("open");
  });
}

function closeRoomDetail(){
  var panel = document.getElementById("roomDetailPanel");
  panel.classList.remove("open");
  setTimeout(function(){ panel.style.display = "none"; }, 320);
  _roomDetailId = null;
}

