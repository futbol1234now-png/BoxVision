
# BoxVision 📦

**Organizador inteligente de cajas para mudanzas con QR, IA y sincronización en la nube.**

BoxVision es una Progressive Web App (PWA) que te ayuda a organizar, localizar y gestionar tus cajas durante una mudanza. Funciona completamente offline, genera códigos QR automáticos y sincroniza tus datos de forma segura en la nube.

![BoxVision](https://futbol1234now-png.github.io/BoxVision/icons/logo.png)

---

## ✨ Características Principales

✅ **Offline-First** — Funciona sin internet, sincroniza cuando vuelve la conexión  
✅ **Códigos QR** — Genera QR automáticos para cada caja  
✅ **IA Inteligente** — Sugerencias de contenido y búsqueda por foto  
✅ **PWA Instalable** — Instálalo como app nativa en tu celular  
✅ **Sincronización Firebase** — Tus datos seguros en la nube  
✅ **Búsqueda Avanzada** — Encuentra objetos en cualquier caja al instante  
✅ **Múltiples Vistas** — Grid, lista, por habitación  
✅ **Soporte Voz** — Agrega objetos hablando  
✅ **Tema Oscuro/Claro** — Interfaz adaptable  
✅ **Multiplataforma** — Funciona en celular, tablet y escritorio  

---

## 🚀 Inicio Rápido

### Opción 1: Abrir en navegador (más rápido)
```
1. Ve a: https://futbol1234now-png.github.io/BoxVision/app.html
2. Inicia sesión con Google o correo
3. ¡Comienza a organizar!
```

### Opción 2: Instalar como PWA
```
1. Abre la app en tu navegador (URL arriba)
2. Haz clic en "Instalar" o "Agregar a pantalla de inicio"
3. ¡Tendrás un acceso directo permanente!
```

### Opción 3: Desarrollo local
```bash
# Clona el repositorio
git clone https://github.com/futbol1234now-png/BoxVision.git
cd BoxVision

# Abre app.html en tu navegador (usando un servidor local recomendado)
python -m http.server 8000
# Luego accede a http://localhost:8000/app.html
```

---

## 📋 Requisitos

- **Navegador moderno** (Chrome, Firefox, Safari, Edge — últimas versiones)
- **Conexión a internet** (para autenticación y sincronización)
- **Cuenta Google o correo** (para sincronizar datos)

---

## 🛠️ Estructura del Proyecto

```
BoxVision/
├── app.html              # Aplicación principal (todo integrado)
├── index.html            # Página de inicio
├── viewer.html           # Visor de cajas
├── 404.html              # Página de error
├── privacy.html          # Política de privacidad
├── terms.html            # Términos de servicio
├── manifest.json         # Configuración PWA
├── sw.js                 # Service Worker (offline)
├── config.json           # Configuración de la app
├── icons/                # Iconos y assets
│   └── logo.png          # Logo principal
└── LICENSE               # Licencia exclusiva
```

### Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| **app.html** | Aplicación completa (HTML + JS + CSS) |
| **manifest.json** | Metadatos PWA, nombre, iconos |
| **sw.js** | Service Worker para modo offline |
| **config.json** | Configuración personalizable |

---

## 🔧 Configuración

### Firebase Setup (Sincronización)

Para que la sincronización en la nube funcione, necesitas configurar Firebase:

1. **Ve a Firebase Console**: https://console.firebase.google.com/
2. **Crea un proyecto nuevo** (si no tienes uno)
3. **Habilita Authentication**:
   - Provider: Google
   - Provider: Email/Password
   - Dominio autorizado: `futbol1234now-png.github.io`

4. **Habilita Firestore Database**:
   - Modo: Iniciar en modo prueba (desarrollo)
   - Ubicación: más cercana a ti

5. **Copia tus credenciales** en `app.html` (línea ~2730):
```javascript
firebase.initializeApp({
  apiKey: "TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "TU_ID",
  appId: "TU_APP_ID"
});
```

6. **Configura Firestore Rules**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null 
                          && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### EmailJS Setup (Feedback)

Para que los reportes de feedback funcionen:

1. **Ve a EmailJS**: https://www.emailjs.com/
2. **Crea una cuenta gratis**
3. **Conecta Gmail** en el panel de servicios
4. **Copia tus claves** y reemplaza en `app.html` (línea ~89):
```javascript
window.EMAILJS_PUBLIC_KEY  = 'tu-clave-publica';
window.EMAILJS_SERVICE_ID  = 'service_xxxxx';
window.EMAILJS_TEMPLATE_ID = 'template_xxxxx';
```

---

## 📱 Uso

### Crear una Caja
1. Haz clic en **"+ Nueva caja"**
2. Completa: nombre, número, ubicación, color, prioridad
3. Agrega objetos de varias formas:
   - Escribe el nombre
   - Habla (voz)
   - Toma foto con IA
   - Carga desde galería
   - Pega una lista

### Buscar Objetos
1. Usa la barra de búsqueda
2. Busca por:
   - Nombre del objeto
   - Número de caja
   - Habitación
   - Tags
3. Busca por foto: cámara → toma foto → IA identifica

### Generar QR
1. Abre una caja
2. Haz clic en el icono QR
3. Imprime o comparte el código
4. Escanea para abrir la caja en cualquier dispositivo

### Organizar
- **Vista Grid**: mosaico visual de cajas
- **Vista Lista**: lista detallada
- **Por Habitación**: agrupa por ubicación
- **Ordenar**: por fecha, prioridad, nombre, cantidad de objetos

---

## 🔒 Seguridad

- ✅ Datos encriptados en tránsito (HTTPS)
- ✅ Autenticación Firebase segura
- ✅ Firestore Rules restrictivas (solo tu user)
- ✅ Funciona offline — tus datos locales en tu dispositivo
- ✅ Puedes proteger cajas con contraseña

---

## 🌐 Despliegue

La app ya está desplegada en GitHub Pages:
```
https://futbol1234now-png.github.io/BoxVision/app.html
```

Para desplegar cambios:
```bash
git add .
git commit -m "Tu mensaje"
git push origin main
# Los cambios estarán online en ~30 segundos
```

---

## 🐛 Solución de Problemas

### "Firebase no está disponible"
- Revisa tu conexión a internet
- Verifica que Firebase esté configurado correctamente
- La app funciona offline, pero necesita internet para sincronizar

### "No puedo iniciar sesión"
- Verifica que Google/Email auth esté habilitado en Firebase
- Asegúrate de que el dominio sea autorizado
- Limpia caché del navegador y cookies

### "Los cambios no se guardan"
- Espera a que aparezca el banner "Sincronizado"
- Abre la consola (F12) y busca errores
- Verifica que Firestore rules sean correctas

### "La PWA no se instala"
- Usa HTTPS (GitHub Pages lo ofrece)
- Intenta en Chrome o Edge (mejor soporte)
- En iOS, usa "Agregar a pantalla de inicio" en Safari

---

## 🤝 Contribuir

Este proyecto es de licencia exclusiva. Sin embargo, puedes:
- Reportar bugs en Issues
- Sugerir mejoras
- Contactar al autor para colaboraciones

---

## 📄 Licencia

**Licencia Exclusiva** — Prohibida la reproducción, distribución o modificación sin autorización expresa del autor.

Más detalles: Ver archivo [LICENSE](LICENSE)

---

## 👨‍💻 Autor

**futbol1234now-png**

- GitHub: [@futbol1234now-png](https://github.com/futbol1234now-png)
- Proyecto: [BoxVision](https://github.com/futbol1234now-png/BoxVision)

---

## 📞 Soporte

¿Dudas o problemas?
- Abre un [Issue](https://github.com/futbol1234now-png/BoxVision/issues)
- Usa el formulario de feedback en la app (⚙️ Ajustes → Feedback)
- Revisa [Política de Privacidad](privacy.html)

---

**¡Gracias por usar BoxVision! 🎉**

_Última actualización: 27 de mayo de 2026_
