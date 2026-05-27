
## Problemas comunes de login y sus soluciones

### ❌ Problema: "Error al iniciar sesión"

**Soluciones:**
1. **Limpia caché y cookies**
   - Chrome: Ctrl+Shift+Delete → Selecciona "Cookies y otros datos de sitios"
   - Firefox: Preferences → Privacy → Cookies and Site Data → Borrar

2. **Intenta con otra cuenta de Google**
   - A veces el problema es con esa cuenta específica
   - Prueba crear una nueva o con otro email

3. **Verifica conexión a internet**
   - Abre Google en otra pestaña
   - Si Google no carga, recarga tu internet

4. **Prueba en modo incógnito**
   - Abre nueva ventana incógnita (Ctrl+Shift+N)
   - Intenta iniciar sesión sin extensiones que interfieran

---

### ❌ Problema: "Firebase no disponible"

**Soluciones:**
1. **Espera 30 segundos y recarga**
   - Firebase a veces tarda en responder

2. **Verifica que Firebase esté configurado**
   - El admin debe haber completado la configuración en Firebase Console
   - Ver README.md → Setup Firebase

3. **Usa modo local si Firebase está caído**
   - La app funciona sin Firebase en localStorage
   - Los datos se sincronizarán cuando Firebase vuelva

---

### ❌ Problema: "Email/contraseña incorrectos"

**Soluciones:**
1. **Verifica que estés en el tab correcto**
   - ¿Estás en "Iniciar sesión" o "Registrarse"?

2. **Cuidado con mayúsculas/minúsculas**
   - El email es case-insensitive pero la contraseña NO
   - Asegúrate que Caps Lock no esté activado

3. **Si olvidaste contraseña**
   - Haz clic en "Olvidé mi contraseña"
   - Revisa tu email (spam también)
   - Sigue el enlace de recuperación

4. **Revisa que la cuenta exista**
   - ¿Ya te registraste antes?
   - Intenta en "Registrarse" primero

---

### ❌ Problema: "No recibo el correo de recuperación"

**Soluciones:**
1. **Revisa spam/correo no deseado**
   - Busca por "BoxVision" o "Firebase"
   - Agrégalo a contactos seguros

2. **Espera 5 minutos**
   - Los correos pueden tardar

3. **Intenta de nuevo**
   - Haz clic nuevamente en "Olvidé contraseña"

4. **Si persiste, contacta al admin**
   - Abre un Issue con el problema

---

### ❌ Problema: "Tu cuenta está deshabilitada"

**Causas:**
- Violaciones de términos
- Múltiples intentos fallidos de login
- Admin la deshabilitó manualmente

**Soluciones:**
1. Contacta al admin inmediatamente
2. Verifica que cumpliste los términos de servicio (terms.html)

---

### ❌ Problema: "Demasiados intentos de login"

**Causa:** Intentaste iniciar sesión más de 8 veces con error

**Soluciones:**
1. **Espera 5 minutos** antes de intentar de nuevo
2. Verifica tu contraseña correctamente
3. Intenta en incógnito
4. Si el problema persiste, usa recuperación de contraseña

---

### ❌ Problema: "Popup de Google bloqueado"

**Causa:** Tu navegador o extensión bloqueó el popup de login

**Soluciones:**
1. **Permite popups para este sitio:**
   - Haz clic en el icono de bloqueo (arriba a la derecha)
   - Permite popups

2. **Desactiva extensiones:**
   - Prueba en modo incógnito (sin extensiones)

3. **Usa otro navegador:**
   - Prueba Chrome, Firefox o Edge

---

## 📋 Antes de reportar

**Por favor incluye:**
- Navegador y versión
- Sistema operativo
- Mensaje de error exacto (screenshot si es posible)
- Pasos para reproducir

---

**¿Aún tienes problemas? Comenta aquí y ayudaremos.**

**Type:** Bug  
**Label:** support, question
