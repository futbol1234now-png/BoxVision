/* BoxVision — Sistema de internacionalización (i18n) */

// ── SISTEMA I18N COMPLETO ─────────────────────────────────────────────────────
const LANG_LABELS = {es:'Español', en:'English', pt:'Português', fr:'Français'};
// _currentLang declarado en utils.js

const I18N = {
  es: {
    // Topbar / Nav
    'nav.settings':       'Ajustes',
    'nav.rooms':          '🗺 Habitaciones',
    // Main screen
    'main.search':        'Buscar en todas las cajas...',
    'main.subtitle':      (n,t) => `${n} caja${n!==1?'s':''} · ${t} objetos`,
    'main.empty.title':   'Todavía no tenés cajas',
    'main.empty.desc':    'Crea tu primera caja, ponle un nombre y empieza a organizar lo que guardas.',
    'main.empty.btn':     '+ Crear mi primera caja',
    // Splash
    'splash.lastbox':     'Última caja abierta',
    'splash.newbox':      'Nueva caja',
    'splash.rooms':       'Habitaciones',
    'splash.settings':    'Ajustes',
    // Detail screen
    'detail.add':         'Agregar objeto...',
    'detail.delete':      'Eliminar',
    'detail.edit':        'Editar caja',
    // Form
    'form.preview':       'Nueva caja',
    'form.cancel':        'Cancelar',
    'form.save':          'Guardar caja',
    'form.name':          'Nombre',
    'form.number':        'Número',
    'form.location':      'Ubicación',
    'form.password':      'Contraseña',
    'form.password.opt':  '(opcional)',
    'form.password.hint': 'Si agregas contraseña, se pedirá al abrir la caja',
    'form.password.ph':   'Dejar vacío = sin contraseña',
    // Rooms
    'rooms.cancel':       'Cancelar',
    'rooms.save':         'Guardar',
    // Settings
    'settings.title':     'Ajustes',
    'settings.update.sub':'Buscar la versión más reciente',
    // Lang modal
    'lang.title':         'Selecciona un idioma',
    'lang.cancel':        'Cancelar',
    // Feedback modal
    'feedback.cancel':    'Cancelar',
    // Toasts
    'toast.link.copied':  '📋 Link copiado',
    'toast.sealed':       '🔒 Esta caja está sellada',
    'toast.sealed.short': '🔒 Caja sellada',
    'toast.wait.scan':    '⏱️ Espera un momento antes de escanear de nuevo',
    'toast.img.error':    '❌ No se pudo leer la imagen',
    'toast.offline.scan': '📡 Sin conexión — puedes agregar el objeto manualmente',
    'toast.urgent':       '🔴 Caja marcada como urgente',
  },
  en: {
    // Topbar / Nav
    'nav.settings':       'Settings',
    'nav.rooms':          '🗺 Rooms',
    // Main screen
    'main.search':        'Search all boxes...',
    'main.subtitle':      (n,t) => `${n} box${n!==1?'es':''} · ${t} items`,
    'main.empty.title':   'No boxes yet',
    'main.empty.desc':    'Create your first box, give it a name and start organizing what you pack.',
    'main.empty.btn':     '+ Create my first box',
    // Splash
    'splash.lastbox':     'Last opened box',
    'splash.newbox':      'New box',
    'splash.rooms':       'Rooms',
    'splash.settings':    'Settings',
    // Detail screen
    'detail.add':         'Add item...',
    'detail.delete':      'Delete',
    'detail.edit':        'Edit box',
    // Form
    'form.preview':       'New box',
    'form.cancel':        'Cancel',
    'form.save':          'Save box',
    'form.name':          'Name',
    'form.number':        'Number',
    'form.location':      'Location',
    'form.password':      'Password',
    'form.password.opt':  '(optional)',
    'form.password.hint': 'If you add a password, it will be required when opening the box',
    'form.password.ph':   'Leave empty = no password',
    // Rooms
    'rooms.cancel':       'Cancel',
    'rooms.save':         'Save',
    // Settings
    'settings.title':     'Settings',
    'settings.update.sub':'Check for latest version',
    // Lang modal
    'lang.title':         'Select a language',
    'lang.cancel':        'Cancel',
    // Feedback modal
    'feedback.cancel':    'Cancel',
    // Toasts
    'toast.link.copied':  '📋 Link copied',
    'toast.sealed':       '🔒 This box is sealed',
    'toast.sealed.short': '🔒 Box sealed',
    'toast.wait.scan':    '⏱️ Wait a moment before scanning again',
    'toast.img.error':    '❌ Could not read the image',
    'toast.offline.scan': '📡 No connection — you can add the item manually',
    'toast.urgent':       '🔴 Box marked as urgent',
  }
};

// Obtener traducción
function t(key, ...args){
  const dict = I18N[_currentLang] || I18N['es'];
  const val = dict[key] ?? (I18N['es'][key] ?? key);
  return typeof val === 'function' ? val(...args) : val;
}

// Actualizar todos los elementos con data-i18n en el DOM
function _applyI18N(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.dataset.i18n;
    const attr = el.dataset.i18nAttr; // e.g. "placeholder"
    const val = t(key);
    if(attr) el[attr] = val;
    else el.textContent = val;
  });
  // Casos especiales que se generan dinámicamente
  const searchInput = document.getElementById('searchInput');
  if(searchInput) searchInput.placeholder = t('main.search');
  const addItemInput = document.getElementById('addItemInput');
  if(addItemInput) addItemInput.placeholder = t('detail.add');
  const settingsUpdateSub = document.getElementById('settingsUpdateSub');
  if(settingsUpdateSub && settingsUpdateSub.textContent === I18N['es']['settings.update.sub'] || settingsUpdateSub?.textContent === I18N['en']['settings.update.sub'])
    settingsUpdateSub.textContent = t('settings.update.sub');
}

function openLangModal(){
  ['es','en'].forEach(l=>{
    const el = document.getElementById('langCheck-'+l);
    if(el) el.classList.toggle('visible', l===_currentLang);
  });
  document.getElementById('langModal').style.display='flex';
}
function closeLangModal(){
  document.getElementById('langModal').style.display='none';
}
function setLang(lang){
  if(!I18N[lang]){ showToast('🚧 Idioma no disponible aún','#FF9500'); return; }
  _currentLang = lang;
  localStorage.setItem('cb-lang', lang);
  const lbl = document.getElementById('currentLangLabel');
  if(lbl) lbl.textContent = LANG_LABELS[lang]||lang;
  ['es','en'].forEach(l=>{
    const el = document.getElementById('langCheck-'+l);
    if(el) el.classList.toggle('visible', l===lang);
  });
  _applyI18N();
  closeLangModal();
  showToast('🌐 ' + (LANG_LABELS[lang]||lang), '#0A84FF');
}
function _initLangLabel(){
  const lbl = document.getElementById('currentLangLabel');
  if(lbl) lbl.textContent = LANG_LABELS[_currentLang]||'Español';
  _applyI18N();
}

// ── MODAL FEEDBACK ────────────────────────────────────────────────────────────
