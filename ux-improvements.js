(function(){
  // ── 1. Swipe-to-close en modal inferior ──────────────────────────────────
  var overlay = document.getElementById('modalOverlay');
  var modal = overlay ? overlay.querySelector('.modal') : null;
  if(modal){
    var startY = 0, currentY = 0, isDragging = false;
    // Usar el handle real de la preview (modal-preview-handle)
    var handle = modal.querySelector('.modal-preview-handle') || modal.querySelector('.modal-handle') || modal;
    handle.style.cursor = 'grab';
    handle.style.touchAction = 'none';
    handle.addEventListener('touchstart', function(e){
      startY = e.touches[0].clientY; isDragging = true; modal.style.transition = 'none';
    }, {passive:true});
    document.addEventListener('touchmove', function(e){
      if(!isDragging) return;
      currentY = e.touches[0].clientY;
      var dy = Math.max(0, currentY - startY);
      modal.style.transform = 'translateY('+dy+'px)';
    }, {passive:true});
    document.addEventListener('touchend', function(){
      if(!isDragging) return;
      isDragging = false; modal.style.transition = '';
      if(currentY - startY > 80){ overlay.classList.remove('open'); modal.style.transform = ''; }
      else modal.style.transform = '';
    });
    // También en desktop con mouse
    handle.addEventListener('mousedown', function(e){
      startY = e.clientY; isDragging = true; modal.style.transition = 'none'; handle.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', function(e){
      if(!isDragging) return;
      currentY = e.clientY;
      var dy = Math.max(0, currentY - startY);
      modal.style.transform = 'translateY('+dy+'px)';
    });
    document.addEventListener('mouseup', function(){
      if(!isDragging) return;
      isDragging = false; modal.style.transition = ''; handle.style.cursor = 'grab';
      if(currentY - startY > 80){ overlay.classList.remove('open'); modal.style.transform = ''; }
      else modal.style.transform = '';
    });
  }

  // ── 2. Splash stats skeleton ─────────────────────────────────────────────
  var statEls = ['sp-c','sp-o','sp-f'].map(function(id){ return document.getElementById(id); });
  statEls.forEach(function(el){ if(el) el.classList.add('loading'); });
  var _origUpdateSplash = window.updateSplash;
  if(typeof _origUpdateSplash === 'function'){
    window.updateSplash = function(){
      _origUpdateSplash.apply(this, arguments);
      statEls.forEach(function(el){ if(el) el.classList.remove('loading'); });
    };
  } else {
    var _obs = new MutationObserver(function(){
      statEls.forEach(function(el){ if(el && el.textContent !== '—') el.classList.remove('loading'); });
    });
    statEls.forEach(function(el){ if(el) _obs.observe(el,{childList:true,characterData:true,subtree:true}); });
  }

  // ── 3. Toggle grid / lista ─────────────────────────────────────────────
  var _viewMode = localStorage.getItem('bv_view') || 'grid';
  window.setViewMode = function(mode){
    _viewMode = mode;
    localStorage.setItem('bv_view', mode);
    var scroll = document.getElementById('mainScroll');
    if(scroll){
      scroll.classList.toggle('list-view', mode === 'list');
    }
    document.getElementById('viewGrid').classList.toggle('active', mode === 'grid');
    document.getElementById('viewList').classList.toggle('active', mode === 'list');
  };
  // Aplicar al cargar
  document.addEventListener('DOMContentLoaded', function(){
    setViewMode(_viewMode);
  });
  // También aplicar después del primer renderGrid
  // FIX: usar wrapping diferido porque renderGrid está en otro bloque de script
  // y window.renderGrid puede no estar disponible aún en este momento.
  var _rgPatched = false;
  function _patchRenderGrid(){
    if(_rgPatched) return;
    if(typeof window.renderGrid !== 'function') return;
    _rgPatched = true;
    var _orig = window.renderGrid;
    window.renderGrid = function(){
      _orig.apply(this, arguments);
      var scroll = document.getElementById('mainScroll');
      if(scroll) scroll.classList.toggle('list-view', _viewMode === 'list');
    };
  }
  // Intentar inmediatamente y también al cargar el DOM (por si acaso)
  _patchRenderGrid();
  document.addEventListener('DOMContentLoaded', function(){ _patchRenderGrid(); setViewMode(_viewMode); });
  // Fallback: parchear en el primer goMain/renderMain
  var _origGoMain = window.goMain;
  window.goMain = function(){
    _patchRenderGrid();
    if(typeof _origGoMain === 'function') _origGoMain.apply(this, arguments);
    var _f=document.getElementById('aiFab');
    if(_f){_f.style.display='flex';_f.style.opacity='1';}
  };

  // ── 4. Skeleton inicial ───────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function(){
    var scroll = document.getElementById('mainScroll');
    if(!scroll) return;
    var html = '<div class="skel-grid">';
    for(var i=0;i<4;i++){
      html += '<div class="skel-card">'
        +'<div style="display:flex;justify-content:space-between;align-items:center">'
        +'<div class="skel-dot"></div>'
        +'<div class="skel-line w40"></div>'
        +'</div>'
        +'<div class="skel-line w70" style="margin-top:auto"></div>'
        +'<div class="skel-line w50"></div>'
        +'</div>';
    }
    html += '</div>';
    scroll.innerHTML = html;
  });

  // ── 5. AI shimmer ────────────────────────────────────────────────────────
  var aiMessages = document.querySelector('.ai-messages');
  if(aiMessages){
    document.addEventListener('aiPanelOpen', function(){
      if(aiMessages.querySelectorAll('.ai-msg').length === 0){
        var shimmer = document.createElement('div');
        shimmer.className = 'ai-loading-shimmer'; shimmer.id = 'aiShimmer';
        shimmer.innerHTML = '<div class="ai-shimmer-line" style="width:70%"></div><div class="ai-shimmer-line" style="width:90%"></div><div class="ai-shimmer-line" style="width:55%"></div>';
        aiMessages.appendChild(shimmer);
        setTimeout(function(){ var s=document.getElementById('aiShimmer'); if(s) s.remove(); }, 1800);
      }
    });
  }
})();