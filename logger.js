(function(){
  console.log('🎯 BoxVision v2.2 - Sistema de Logs Mejorado Iniciado');
  
  window._appLogs = [];
  window._appStats = { errors: 0, warnings: 0, loads: 0 };
  
  var originalError = window.onerror;
  
  window.onerror = function(msg, src, line, col, err){
    if(!msg) return false;
    var logEntry = {
      type: 'error',
      msg: String(msg).substring(0,100),
      src: src ? src.substring(Math.max(0,src.length-40)) : 'unknown',
      line: line,
      col: col,
      time: new Date().toLocaleTimeString()
    };
    window._appLogs.push(logEntry);
    window._appStats.errors++;
    
    if(window._appLogs.length % 10 === 0){
      try{
        localStorage.setItem('bv_logs', JSON.stringify(window._appLogs.slice(-50)));
      }catch(e){}
    }
    return false;
  };
  
  window.addEventListener('unhandledrejection', function(evt){
    if(evt.reason){
      var msg = String(evt.reason).substring(0,100);
      window._appLogs.push({
        type: 'unhandled',
        msg: msg,
        time: new Date().toLocaleTimeString()
      });
      window._appStats.errors++;
    }
  });
  
  window._viewLogs = function(){
    console.clear();
    console.table(window._appLogs);
    console.log('📊 Estadísticas:', window._appStats);
    console.log('📦 Total logs:', window._appLogs.length);
  };
  
  window._sendFeedback = function(msg){
    if(!msg){
      console.error('❌ Especifica un mensaje: _sendFeedback("Tu mensaje")');
      return;
    }
    var feedbacks = JSON.parse(localStorage.getItem('bv_feedbacks') || '[]');
    feedbacks.push({
      timestamp: new Date().toISOString(),
      message: msg,
      browser: navigator.userAgent.substring(0,80),
      logs: window._appLogs.slice(-5)
    });
    localStorage.setItem('bv_feedbacks', JSON.stringify(feedbacks));
    console.log('✅ Feedback guardado (#'+feedbacks.length+')');
    console.log('💾 Exporta con: _exportFeedback()');
  };
  
  window._exportFeedback = function(){
    var feedbacks = JSON.parse(localStorage.getItem('bv_feedbacks') || '[]');
    if(feedbacks.length === 0){
      console.warn('⚠️ No hay feedback para exportar');
      return;
    }
    var json = JSON.stringify(feedbacks, null, 2);
    console.log('%c📋 COPIAR TODO LO SIGUIENTE Y ENVIAR A EMAIL:', 'color:green;font-size:14px;font-weight:bold');
    console.log(json);
    console.log('%cFin del feedback', 'color:green;font-weight:bold');
  };
  
  window._clearFeedback = function(){
    localStorage.removeItem('bv_feedbacks');
    console.log('✓ Feedback limpiado');
  };
  
  window._getHealth = function(){
    var checks = {
      'mainScreen': !!document.getElementById('mainScreen'),
      'searchInput': !!document.getElementById('searchInput'),
      'viewToggle': !!document.querySelector('.view-toggle'),
      'topbar': !!document.querySelector('.topbar'),
      'mainScroll': !!document.getElementById('mainScroll')
    };
    var ok = Object.values(checks).filter(v=>v).length;
    console.log('%c🏥 SALUD DE LA APP:', 'color:blue;font-weight:bold');
    console.table(checks);
    console.log('Status: '+ok+'/5 componentes OK');
    return ok === 5;
  };
  
  console.log('%c✅ Comandos disponibles:', 'color:green;font-size:12px;font-weight:bold');
  console.log('  _viewLogs() .......... Ver últimos 50 errores');
  console.log('  _sendFeedback("msg") . Guardar feedback');
  console.log('  _exportFeedback() ... Exportar para email');
  console.log('  _clearFeedback() .... Limpiar feedback');
  console.log('  _getHealth() ........ Ver salud de app');
})();