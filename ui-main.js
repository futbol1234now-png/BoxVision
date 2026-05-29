/* BoxVision — Pantalla principal: grid, filtros, tarjetas */

let activeFilter="todo"; let activeSort="default";
function goMain(){showScreen("mainScreen");renderMain();_startClock();const f=document.getElementById("aiFab");if(f){f.style.display="flex";f.style.opacity="1";f.classList.remove("hidden");}
  // Mostrar changelog si hay versión nueva sin ver (primer arranque tras actualización)
  if(window._changelogPending){
    window._changelogPending=false;
    setTimeout(function(){if(typeof window.showChangelog==='function') window.showChangelog();},700);
  }
}
function renderMain(){
  const total=boxes.reduce((s,b)=>s+b.items.length,0);
  document.getElementById("mainSub").textContent = t('main.subtitle', boxes.length, total);
  renderFilters();renderGrid();renderGlobalProgress();
}
function renderFilters(){
  const tags=new Set();boxes.forEach(b=>(b.tags||[]).forEach(t=>tags.add(t)));
  const locs=new Set();boxes.forEach(b=>{if(b.location)locs.add(b.location);});
  const row=document.getElementById("filterRow");
  // FIX XSS: usar data-filter + addEventListener en vez de onclick inline
  // para evitar inyección de código en nombres de ubicaciones/tags con comillas o JS
  const staticPills=[
    {f:"todo",  label:"Todas"},
    {f:"fav",   label:"⭐ Favoritas"},
    {f:"red",   label:"🔴 Urgentes"},
    {f:"done0", label:"📦 Sin sacar"},
  ];
  const locPills=[...locs].map(l=>({f:"loc:"+l, label:"📍 "+l}));
  const tagPills=[...tags].map(t=>({f:t, label:"#"+t}));
  const all=[...staticPills,...locPills,...tagPills];

  row.innerHTML=all.map(p=>`<button class="pill${activeFilter===p.f?" active":""}" data-filter="${esc(p.f)}">${esc(p.label)}</button>`).join("");
  row.querySelectorAll(".pill[data-filter]").forEach(btn=>{
    btn.addEventListener("click",()=>setFilter(btn.dataset.filter));
  });
}
function setFilter(f){activeFilter=f;renderMain();}
// ── Virtual grid — soporta cajas ilimitadas ──────────────────────────────────
const PAGE_SIZE = 40; // cuántas tarjetas renderizar por página
let _gridFiltered = [];   // lista filtrada/ordenada actual
let _gridPage = 0;        // cuántas páginas ya cargadas
let _gridObserver = null; // IntersectionObserver para carga automática

function renderGrid(){
  let filtered=boxes;
  if(activeFilter==="fav") filtered=boxes.filter(b=>b.fav);
  else if(activeFilter==="red") filtered=boxes.filter(b=>b.priority==="red");
  else if(activeFilter==="done0") filtered=boxes.filter(b=>b.items.length===0||b.items.some(i=>!i.done));
  else if(activeFilter.startsWith("loc:")) filtered=boxes.filter(b=>b.location===activeFilter.slice(4));
  else if(activeFilter!=="todo") filtered=boxes.filter(b=>(b.tags||[]).includes(activeFilter));
  filtered=sortBoxes(filtered);
  _gridFiltered=filtered;
  _gridPage=0;

  const scroll=document.getElementById("mainScroll");

  if(!filtered.length){
    scroll.innerHTML=boxes.length===0
      ?`<div class="empty-state">
          <svg class="empty-state-svg" width="140" height="130" viewBox="0 0 140 130" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="boxGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#0A84FF"/>
                <stop offset="100%" stop-color="#5856D6"/>
              </linearGradient>
              <filter id="glow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <!-- cuerpo caja -->
            <rect x="22" y="58" width="96" height="62" rx="12" fill="url(#boxGrad)" opacity=".9" filter="url(#glow)"/>
            <!-- tapa izq -->
            <path d="M22 70 L70 58 L70 38 L22 50 Z" fill="#1a4aaa" opacity=".85"/>
            <!-- tapa der -->
            <path d="M118 70 L70 58 L70 38 L118 50 Z" fill="#3a3aaa" opacity=".85"/>
            <!-- brillo tapa -->
            <path d="M70 38 L118 50 L118 52 L70 40 Z" fill="rgba(255,255,255,.15)"/>
            <!-- cinta -->
            <rect x="58" y="38" width="24" height="82" rx="5" fill="rgba(255,255,255,.18)"/>
            <!-- estrellas flotantes -->
            <circle cx="108" cy="28" r="3" fill="#FFCC00" opacity=".8"><animate attributeName="cy" values="28;22;28" dur="2.5s" repeatCount="indefinite"/><animate attributeName="opacity" values=".8;1;.8" dur="2.5s" repeatCount="indefinite"/></circle>
            <circle cx="30" cy="42" r="2" fill="#34C759" opacity=".7"><animate attributeName="cy" values="42;36;42" dur="2s" begin=".4s" repeatCount="indefinite"/></circle>
            <circle cx="120" cy="55" r="1.5" fill="#AF52DE" opacity=".6"><animate attributeName="cy" values="55;49;55" dur="1.8s" begin=".8s" repeatCount="indefinite"/></circle>
          </svg>
          <h3>Tu primer paso hacia el orden</h3>
          <p>${t('main.empty.desc')}</p>
          <button class="empty-state-btn" onclick="openForm()">${t('main.empty.btn')}</button>
        </div>`
      :`<div style="text-align:center;padding:60px 20px"><div style="font-size:40px;margin-bottom:12px">🔍</div><div style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:4px">Sin resultados</div><div style="font-size:13px;color:var(--muted)">No hay cajas con este filtro</div></div>`;
    _teardownGridObserver();
    return;
  }

  // Renderizar primera página
  scroll.innerHTML="";
  _renderGridPage(scroll);

  // Si hay más páginas, activar carga automática al hacer scroll
  if(_gridFiltered.length > PAGE_SIZE){
    _setupGridObserver(scroll);
  }
}

function _getGridPageItems(){
  const start=_gridPage*PAGE_SIZE;
  const end=Math.min(start+PAGE_SIZE, _gridFiltered.length);
  return _gridFiltered.slice(start,end);
}

function _renderGridPage(scroll){
  if(!scroll) scroll=document.getElementById("mainScroll");
  const items=_getGridPageItems();
  if(!items.length) return;

  const favs=_gridPage===0?items.filter(b=>b.fav):[];
  const rest=_gridPage===0?items.filter(b=>!b.fav):items;
  const hasFavsSection=_gridPage===0&&favs.length>0;

  // Crear fragmento para inserción eficiente
  const frag=document.createDocumentFragment();

  if(hasFavsSection){
    const hdr=document.createElement("div");
    hdr.className="sec-hdr";hdr.textContent="⭐ Favoritas";
    frag.appendChild(hdr);
    const grid=document.createElement("div");
    grid.className="boxes-grid";
    grid.innerHTML=favs.map(boxCard).join("");
    frag.appendChild(grid);
  }

  if(rest.length){
    if(hasFavsSection){
      const hdr=document.createElement("div");
      hdr.className="sec-hdr";hdr.textContent="Todas";
      frag.appendChild(hdr);
    }
    const grid=document.createElement("div");
    grid.className="boxes-grid";
    grid.innerHTML=rest.map(boxCard).join("");
    frag.appendChild(grid);
  }

  // Quitar sentinel anterior si existe
  const old=scroll.querySelector("#gridSentinel");if(old) old.remove();

  scroll.appendChild(frag);

  // Aplicar stagger dinámico a las nuevas tarjetas
  const cards=Array.from(scroll.querySelectorAll(".box-card:not([data-anim])"));
  cards.forEach((c,i)=>{c.style.animationDelay=(i*0.04)+"s";c.dataset.anim="1";});

  _gridPage++;

  // Agregar sentinel para la próxima página si quedan más
  if(_gridPage*PAGE_SIZE < _gridFiltered.length){
    const sentinel=document.createElement("div");
    sentinel.id="gridSentinel";
    sentinel.style.cssText="height:60px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px";
    sentinel.innerHTML='<span style="opacity:.5">Cargando más...</span>';
    scroll.appendChild(sentinel);
    if(_gridObserver) _gridObserver.observe(sentinel);
  }
}

function _setupGridObserver(scroll){
  _teardownGridObserver();
  _gridObserver=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.remove();
        _renderGridPage(scroll);
      }
    });
  },{rootMargin:"200px"});
}

function _teardownGridObserver(){
  if(_gridObserver){_gridObserver.disconnect();_gridObserver=null;}
}
function boxCard(b){
  const col=b.color||"#007AFF";
  const done=b.items.filter(i=>i.done).length,total=b.items.length,pct=total?Math.round(done/total*100):0;
  const tags=(b.tags||[]).slice(0,2).map(t=>`<span class="bc-tag">${esc(t)}</span>`).join("");
  const cardBg = b.photo
    ? `url(${b.photo}) center/cover, linear-gradient(135deg,${col},${hexToRgba(col,.65)})`
    : `linear-gradient(135deg,${col},${hexToRgba(col,.65)})`;
  const hasPhoto = !!b.photo;
  // Progress ring: circunferencia de r=12 → 2π×12 ≈ 75.4
  const R=12, C=2*Math.PI*R, offset=total>0 ? C*(1-pct/100) : C;
  const ringColor = pct>=100?"#34C759":pct>=50?"#0A84FF":"rgba(255,255,255,.7)";
  const ringHtml = total>0 ? `<div class="bc-ring">
    <svg width="34" height="34" viewBox="0 0 34 34">
      <circle class="bc-ring-bg" cx="17" cy="17" r="${R}"/>
      <circle class="bc-ring-fill" cx="17" cy="17" r="${R}"
        stroke="${ringColor}"
        stroke-dasharray="${C.toFixed(1)}"
        stroke-dashoffset="${offset.toFixed(1)}"/>
      <text class="bc-ring-pct" x="17" y="17">${pct}%</text>
    </svg>
  </div>` : "";
  // Lanzar IA en background si la caja no tiene ícono aún
  if(!b.icon) setTimeout(()=>fetchSmartIcon(b), 0);
  return `<div class="box-card${b.priority==="red"?" urgent":""}" data-box-id="${b.id}" style="background:${cardBg}" onclick="openDetail('${b.id}')">
    ${hasPhoto?`<div style="position:absolute;inset:0;background:linear-gradient(160deg,${hexToRgba(col,.8)},${hexToRgba(col,.5)});z-index:0"></div>`:''}
    ${b.priority==="red"?'<div class="bc-urgent-dot" title="Urgente"></div>':""}
    ${hasPhoto?`<img class="bc-thumb" src="${b.photo}" loading="lazy" alt="foto"/><span class="bc-photo-badge">📷</span>`:""}
    ${ringHtml}
    <div class="bc-inner">
      <div class="bc-top">
        <button class="bc-fav" onclick="event.stopPropagation();toggleFavId('${b.id}')">${b.fav?"⭐":"☆"}</button>
        <div class="bc-badges">
          ${b.password?'<span style="font-size:11px">🔐</span>':""}
          ${b.number?`<span class="bc-num">#${esc(b.number)}</span>`:""}
        </div>
      </div>
      <span class="bc-icon">${getIcon(b.name, b)}</span>
      <div class="bc-text">
        <div class="bc-name">${esc(b.name)}</div>
        <div class="bc-sub">${total} objeto${total!==1?"s":""}${done?" · "+done+" sacado"+(done!==1?"s":""):""}${b.location?" · 📍"+esc(b.location):""}</div>
        ${tags?`<div class="bc-tags">${tags}</div>`:""}
      </div>
      <div class="bc-list-badges">
        ${b.fav?'<span style="font-size:14px">⭐</span>':""}
        ${b.password?'<span style="font-size:13px">🔐</span>':""}
        ${b.number?`<span class="bc-num">#${esc(b.number)}</span>`:""}
      </div>
    </div>
  </div>`;
}
