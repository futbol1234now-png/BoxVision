/* ══════════════════════════════════════════════════════
   Sistema de changelog dinámico — lee config.json
   Para publicar una nueva versión:
     1. Editá config.json en GitHub (version + changelog)
     2. Subí el app.html nuevo
     3. Los usuarios verán el modal automáticamente
   ══════════════════════════════════════════════════════ */

(function(){
  'use strict';

  // Colores por tipo de cambio
  var TYPE_STYLE = {
    fix: { bg:'rgba(255,59,48,.15)',  tag:'cl-tag-fix', label:'Fix'    },
    imp: { bg:'rgba(10,132,255,.15)', tag:'cl-tag-imp', label:'Mejora' },
    new: { bg:'rgba(52,199,89,.15)',  tag:'cl-tag-new', label:'Nuevo'  },
  };

  // Construye el HTML del modal con los datos de config.json
  function _buildChangelog(cfg){
    var badge  = document.getElementById('clVersionBadge');
    var body   = document.getElementById('clBody');
    if(!badge || !body) return;

    badge.textContent = '✦ v' + cfg.version;

    var fixes = (cfg.changelog||[]).filter(function(i){ return i.type==='fix'; });
    var imps  = (cfg.changelog||[]).filter(function(i){ return i.type!=='fix'; });

    function itemHTML(item){
      var s = TYPE_STYLE[item.type] || TYPE_STYLE.imp;
      return '<div class="cl-item">'
        + '<div class="cl-item-icon" style="background:'+s.bg+'">'+item.icon+'</div>'
        + '<div class="cl-item-text">'
        +   '<div class="cl-item-title"><span class="cl-tag '+s.tag+'">'+s.label+'</span>'+_esc(item.title)+'</div>'
        +   '<div class="cl-item-desc">'+_esc(item.desc)+'</div>'
        + '</div>'
        + '</div>';
    }

    var html = '';
    if(fixes.length){
      html += '<div class="cl-section-label">Correcciones</div>';
      html += fixes.map(itemHTML).join('');
    }
    if(imps.length){
      html += '<div class="cl-section-label" style="margin-top:16px">Mejoras</div>';
      html += imps.map(itemHTML).join('');
    }
    body.innerHTML = html;
  }

  function _esc(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Carga config.json con cache-bust para siempre leer la versión más nueva
  function _fetchConfig(cb){
    fetch('./config.json?_=' + Date.now(), { cache:'no-store' })
      .then(function(r){ return r.json(); })
      .then(cb)
      .catch(function(){ cb(null); });
  }

  // Compara versión del servidor con la guardada en localStorage
  function _checkVersion(){
    _fetchConfig(function(cfg){
      if(!cfg || !cfg.version) return;
      var seen = '';
      try{ seen = localStorage.getItem('bv_changelog_seen') || ''; }catch(e){}

      if(seen !== cfg.version){
        // Versión nueva — preparar modal y marcarlo como pendiente
        _buildChangelog(cfg);
        window._changelogVersion  = cfg.version;
        window._changelogPending  = true;
      }
    });
  }

  // ── API pública ──────────────────────────────────────

  window.openChangelog = function(){
    var ov = document.getElementById('changelogOverlay');
    if(!ov) return;
    // Si el body está vacío (ej: abierto desde settings), cargar config primero
    var body = document.getElementById('clBody');
    if(body && !body.children.length){
      _fetchConfig(function(cfg){ if(cfg) _buildChangelog(cfg); });
    }
    ov.style.display = 'flex';
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      ov.classList.add('open');
    }); });
  };

  window.closeChangelog = function(){
    var ov = document.getElementById('changelogOverlay');
    if(!ov) return;
    ov.classList.remove('open');
    setTimeout(function(){ ov.style.display = 'none'; }, 400);
    // Marcar esta versión como vista
    try{
      var v = window._changelogVersion || '';
      if(v) localStorage.setItem('bv_changelog_seen', v);
    }catch(e){}
  };

  // Alias para compatibilidad con el sistema de actualizaciones (SW)
  window.showChangelog = window.openChangelog;

  // Al cargar la página: chequear si hay versión nueva
  document.addEventListener('DOMContentLoaded', _checkVersion);

})();