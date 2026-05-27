# 🐛 Support: Report bugs here

## Cómo reportar un bug correctamente

Ayuda a mejorar BoxVision reportando bugs de forma clara y detallada.

---

## 📋 Plantilla para reportar un bug

**Por favor copia y completa esta plantilla en un nuevo comentario:**

```markdown
## Descripción del problema

[Describe qué pasó de forma clara]

## Pasos para reproducir

1. ...
2. ...
3. ...

## Comportamiento esperado

[Qué debería haber pasado]

## Comportamiento actual

[Qué pasó en realidad]

## Información del entorno

- **Navegador:** (Chrome, Firefox, Safari, Edge)
- **Versión del navegador:** (ej: 125.0)
- **Sistema operativo:** (Windows 11, Mac OS, Android, iOS)
- **Dispositivo:** (Laptop, Tablet, Phone)
- **Acceso:** (Web, PWA instalada)

## Consola (DevTools)

[Abre F12 → Console → Copia errores aquí]

## Screenshot (si aplica)

[Adjunta imagen mostrando el problema]

## Informacion adicional

[Cualquier otra cosa relevante]
```

---

## 🎯 Ejemplo correcto

```markdown
## Descripción del problema

No puedo crear más de 5 cajas. Después de la quinta caja, 
el botón "Nueva caja" no responde.

## Pasos para reproducir

1. Inicia sesión en la app
2. Crea 5 cajas (una, dos, tres, cuatro, cinco)
3. Haz clic en el botón "+ Nueva caja"
4. El botón no hace nada

## Comportamiento esperado

Debería abrir el formulario para crear la 6ta caja

## Comportamiento actual

No pasa nada, el botón no responde

## Información del entorno

- **Navegador:** Chrome 125.0
- **Sistema operativo:** Windows 11
- **Dispositivo:** Laptop
- **Acceso:** PWA instalada

## Consola (DevTools)

`Uncaught TypeError: boxes.length is undefined at saveForm():4520`

## Screenshot

[Screenshot del error]

## Información adicional

Esto ocurre en dos dispositivos distintos
```

---

## ❌ Ejemplo INCORRECTO (no hacer)

```
No funciona nada
```

❌ Muy vago, no se puede reproducir

---

## 📝 Guía detallada

### 1. Descripción clara

**✅ BIEN:**
- "No puedo crear cajas cuando estoy offline"
- "El QR generado es blanco (en blanco sin contenido)"
- "Búsqueda devuelve resultados incorrectos"

**❌ MAL:**
- "No funciona"
- "Bug en la búsqueda"
- "Problema con Firebase"

---

### 2. Pasos para reproducir

Deben ser tan específicos que alguien más pueda hacer exactamente lo mismo.

**✅ BIEN:**
```
1. Abre app en Chrome
2. Inicia sesión con Google
3. Crea una caja llamada "Test"
4. Agrega 10 objetos
5. Cierra sesión
6. Abre DevTools
7. Desactiva WiFi
8. Intenta crear otra caja
9. Verifica consola → aparece error X
```

**❌ MAL:**
```
1. Usa la app
2. Intenta algo
```

---

### 3. Entorno

Importante saber dónde ocurre el error.

**Siempre incluye:**
- Navegador (Chrome, Firefox, Safari, Edge)
- Versión del navegador (ej: 125.0)
- Sistema operativo (Windows, Mac, Linux, Android, iOS)
- Dispositivo (Laptop, Tablet, Phone)
- Si es web o PWA instalada

**Cómo encontrar la versión del navegador:**
- Chrome: ⋮ → Ayuda → Acerca de Google Chrome
- Firefox: ≡ → Ayuda → Acerca de Firefox
- Safari: Safari → Acerca de Safari

---

### 4. Consola (F12)

Los errores en la consola son CRÍTICOS para resolver bugs.

**Cómo obtenerlos:**
1. Presiona **F12** (o Ctrl+Shift+I)
2. Ve al tab **"Console"**
3. Reproduce el problema
4. Busca mensajes en **rojo** (errores)
5. Copia **TODO** el texto del error
6. Pégalo en el Issue

**Ejemplo de error a incluir:**
```
Uncaught TypeError: Cannot read property 'boxes' of undefined
    at saveForm (app.html:4520:15)
    at HTMLDocument.onclick (app.html:8312:8)
```

---

### 5. Screenshot

Una imagen vale mil palabras.

**Cómo adjuntar:**
1. Toma screenshot (Print Screen o Cmd+Shift+4)
2. Haz clic en "Attach files" en GitHub
3. Selecciona la imagen

---

## 🚨 Tipos de bugs comunes

### 🔴 Crítico (hazlo prioritario)

- Pérdida de datos
- App completamente rota
- No puedo iniciar sesión
- Vulnerabilidad de seguridad

**RESPUESTA:** Dentro de 24 horas

### 🟠 Importante

- Funcionalidad rota
- Búsqueda no funciona
- Mensajes de error constantes

**RESPUESTA:** Dentro de 3 días

### 🟡 Normal

- Pequeños errores
- UI inconsistente
- Typos

**RESPUESTA:** Dentro de 1 semana

### 🔵 Bajo

- Sugerencias de mejora
- Cambios cosméticos

**RESPUESTA:** Variable

---

## 📊 Checklist antes de reportar

- [ ] Limpié caché y cookies?
- [ ] Recargué la página?
- [ ] Probé en otro navegador?
- [ ] Probé en incógnito?
- [ ] Leí el README y FAQ?
- [ ] Busqué si alguien ya reportó esto?
- [ ] Incluí todos los pasos?
- [ ] Incluí info del entorno?
- [ ] Adjunté screenshot/error?

---

## 🤝 Gracias por reportar

Tu reporte ayuda a mejorar BoxVision para todos.

**Responderemos lo antes posible.**

---

**Type:** Bug  
**Label:** support, bug-report
