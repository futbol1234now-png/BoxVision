// ── EmailJS config — reemplaza con tus claves desde emailjs.com ──────────
  // Para activar: crea cuenta en emailjs.com (gratis), crea un servicio Gmail
  // y una plantilla, luego pega las 3 claves aquí.
  window.EMAILJS_PUBLIC_KEY  = 'j068SrmxqARUYifIS';
  window.EMAILJS_SERVICE_ID  = 'service_1hm801u';
  window.EMAILJS_TEMPLATE_ID = 'template_sh65yng';
  // Variables disponibles en tu plantilla EmailJS:
  // {{from_user}}  → email/nombre del usuario que envía feedback
  // {{category}}   → bug | idea | elogio | otro
  // {{message}}    → texto del feedback
  // {{boxes_count}} → número de cajas del usuario
  // {{date}}       → fecha ISO
  // {{app_version}} → versión de la app
  window._emailjsReady = false;
  document.addEventListener('DOMContentLoaded', function(){
    if(window.EMAILJS_PUBLIC_KEY && window.EMAILJS_PUBLIC_KEY !== 'TU_PUBLIC_KEY'){
      try{
        emailjs.init({ publicKey: window.EMAILJS_PUBLIC_KEY });
        window._emailjsReady = true;
        console.log('✅ EmailJS listo');
      }catch(e){ console.warn('EmailJS init error:', e); }
    }
  });