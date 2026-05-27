# 🔧 Support: Technical issues and debugging

## Problemas técnicos y soluciones

### ❌ Problema: "Los datos no se guardan"

**Soluciones paso a paso:**

1. **Abre DevTools (F12)**
   - Windows: F12 o Ctrl+Shift+I
   - Mac: Cmd+Option+I

2. **Ve a tab "Console"**
   - Busca mensajes de error en rojo
   - Copia los errores exactos

3. **Verifica si hay error de Firebase**
   - ¿Dice "Firebase no disponible"?
   - ¿"Firestore error"?

4. **Intenta guardar nuevamente**
   - Observa si aparece error en consola
   - Reporta el error exacto en este Issue

5. **Si no ves error:**
   - Los datos SÍ se están guardando
   - Recarga la página para verificar

---

### ❌ Problema: "La PWA no se instala"

**Soluciones por navegador:**

**Chrome/Edge (recomendado):**
- ✅ Debe mostrar botón "Instalar" arriba a la derecha
- ✅ Si no aparece:
  1. Recarga la página (Ctrl+R)
  2. Espera 3 segundos
  3. Busca el icono de descarga
  4. Si aún no aparece, revisa debajo (menú ⋮)

**Firefox:**
- Firefox no tiene soporte PWA perfecto
- Alternativa: Crea acceso directo manualmente

**Safari (Mac/iOS):**
- En Mac: No instala como PWA, pero funciona en web
- En iOS: Usa "Compartir" → "Agregar a pantalla de inicio"

**Android (sin navegador específico):**
- Si Firefox/Chrome bloqueean, intenta Samsung Internet
- O accede a través de Chrome

---

### ❌ Problema: "La app va lenta o lag"

**Soluciones de optimización:**

1. **Limpia localStorage:**
   - DevTools (F12) → Tab "Application"
   - Click derecho en "Local Storage"
   - Click en "Storage" → "Clear site data"
   - Recarga la página

2. **Limpia caché:**
   - Chrome: Ctrl+Shift+Delete
   - Selecciona "Todas las cookies..."
   - Haz clic en "Borrar datos"

3. **Descarga datos pesados:**
   - Si tienes cientos de cajas:
   - Exporta a backup
   - Elimina cajas antiguas
   - Esto acelera la carga

4. **Reinicia tu dispositivo:**
   - A veces el navegador tiene memory leaks
   - Cierra todas las pestañas
   - Reinicia el dispositivo

---

### ❌ Problema: "La app dice 'Sin conexión' pero tengo internet"

**Soluciones:**

1. **Verifica tu internet:**
   - Abre Google en otra pestaña
   - ¿Carga normalmente?

2. **Recarga la página:**
   - Ctrl+R (o Cmd+R en Mac)

3. **Revisa el indicador offline:**
   - Debe desaparecer cuando hay internet
   - Si persiste, recarga el navegador

4. **Comprueba si Firebase está online:**
   - Abre la consola (F12)
   - Busca mensajes de conexión a Firebase
   - Si dice "offline", espera o reinicia

---

### ❌ Problema: "Error 404 al cargar app.html"

**Soluciones:**

1. **Verifica la URL:**
   - ¿Es: `https://futbol1234now-png.github.io/BoxVision/app.html`?
   - Sin typos en el nombre

2. **El servidor está caído:**
   - GitHub Pages tiene 99.99% uptime
   - Si persiste más de 1 hora, contacta a GitHub

3. **Acceso local:**
   - Descarga el repo: `git clone https://github.com/futbol1234now-png/BoxVision.git`
   - Sirve localmente: `python -m http.server 8000`
   - Accede: `http://localhost:8000/app.html`

---

### ❌ Problema: "Los QR no funcionan"

**Soluciones:**

1. **Genera el QR nuevamente:**
   - Abre la caja → Icono QR → Genera nuevo

2. **Escanea correctamente:**
   - Buena iluminación
   - Mantén estable
   - Enfoca el código completo

3. **Prueba con otra app de QR:**
   - A veces la app de escaneo tiene problemas
   - Intenta Google Lens o otra app

4. **Verifica que el QR tenga datos:**
   - Abre DevTools (F12) → Console
   - Copia el QR y valida en: qrserver.com

---

### ❌ Problema: "Búsqueda por foto no funciona"

**Soluciones:**

1. **Verifica que tengas IA habilitada:**
   - Abre Settings → Verifica API key
   - Si no hay, configura Groq API

2. **Toma foto clara:**
   - Buena iluminación
   - Objeto visible y enfocado
   - Tamaño > 100px

3. **Intenta de nuevo:**
   - A veces la IA tarda
   - Espera 5 segundos

4. **Reinicia la app:**
   - Cierra y abre nuevamente

---

### ❌ Problema: "Voice input (micrófono) no funciona"

**Soluciones:**

1. **Dale permisos al micrófono:**
   - Navegador debe pedir permiso
   - Haz clic en "Permitir"

2. **Revisa configuración:**
   - Windows: Settings → Privacy → Microphone
   - Mac: System Preferences → Security & Privacy → Microphone
   - Android/iOS: Settings de app

3. **Prueba en otro navegador:**
   - Chrome tiene mejor soporte

4. **El micrófono esté conectado:**
   - Prueba en otra app (Google Meet, etc.)

---

### ❌ Problema: "Sincronización muy lenta"

**Soluciones:**

1. **Conexión a internet lenta:**
   - Cambia a WiFi si usas datos
   - Revisa velocidad en speedtest.net

2. **Demasiadas cajas:**
   - Si tienes 1000+ cajas, la sincronización tarda
   - Es normal, la app está procesando

3. **Firebase está lento:**
   - A veces Firebase tarda (rare)
   - Espera o intenta más tarde

---

## 🔍 Debugging avanzado

**Para reportar un bug técnico, incluye:**

```
DevTools Console Error:
[Aquí copia el error rojo]

Network Status:
- Online/Offline?
- Velocidad internet?

Steps to reproduce:
1. ...
2. ...
3. ...

Expected vs Actual:
- Esperaba: ...
- Pasó: ...

Browser & System:
- Navegador: Chrome 125
- Sistema: Windows 11
- Dispositivo: Laptop/Mobile
```

---

**¿Tu problema no está aquí? Comenta con detalles y ayudaremos.**

**Type:** Bug  
**Label:** support, troubleshooting
