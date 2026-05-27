# 🚨 Support: Critical issues and emergencies

## Problemas Críticos y Emergencias

**⚠️ USE ESTE ISSUE SOLO PARA PROBLEMAS CRÍTICOS**

Ejemplos de "crítico":
- ❌ Pérdida completa de datos
- ❌ No puedo acceder a mis cajas guardadas
- ❌ La app está completamente rota
- ❌ No puedo iniciar sesión y es urgente
- ❌ Vulnerabilidad de seguridad
- ❌ Cajas desaparecieron sin razón

**NO es crítico:**
- ✅ Un pequeño bug de UI
- ✅ Una typo
- ✅ Una función lenta
- ✅ Preguntas generales

---

## 🆘 Si tu problema es crítico

### Paso 1: NO PANIC 🤍

Calma. Los datos de Box Vision están diseñados para ser recuperables.

### Paso 2: Verifica si es realmente crítico

```
¿Qué pasó?              ¿Es crítico?
Perdí datos             ❌ SÍ (CRÍTICO)
No aparece un botón     ✅ NO (reporta en Issues)
No puedo entrar         ❌ SÍ (CRÍTICO)
La app está lenta       ✅ NO (reporta en Issues)
Alguien accedió mi cuenta ❌ SÍ (CRÍTICO)
```

### Paso 3: Intenta soluciones rápidas

**Antes de reportar como "crítico", intenta:**

1. **Recarga la página**
   - Ctrl+R (o Cmd+R en Mac)
   - Espera 30 segundos

2. **Limpia caché**
   - Ctrl+Shift+Delete
   - Borra cookies del sitio
   - Recarga

3. **Prueba en incógnito**
   - Ctrl+Shift+N (Chrome)
   - Cmd+Shift+N (Mac)
   - Intenta acceder

4. **Intenta en otro navegador**
   - Chrome, Firefox, Safari, Edge
   - ¿El problema persiste?

5. **Verifica internet**
   - ¿Puedo acceder a Google?
   - ¿WiFi está funcionando?

**Si probaste todo y persiste → Es crítico**

### Paso 4: Reporta correctamente

**COPIA Y COMPLETA:**

```markdown
## 🚨 PROBLEMA CRÍTICO

### ¿Qué pasó?
[Descripción clara del problema]

### ¿Cuándo pasó?
[Fecha y hora aproximada]

### Pasos exactos para reproducir (si es posible)
1. ...
2. ...
3. ...

### Datos afectados
- Cantidad de cajas perdidas: ___
- ¿Dónde estaban guardadas?
  - ☐ Firebase (nube)
  - ☐ Dispositivo local
  - ☐ Ambas
- ¿Son datos únicos (irreemplazables)?

### Información de contacto
- Email: [tu email para contacto urgente]
- Mejor hora para contactar: [ej: 9am-5pm UTC]

### Información técnica
- Navegador: [Chrome, Firefox, etc.]
- Sistema: [Windows, Mac, Android, iOS]
- Dispositivo: [Laptop, Phone, Tablet]

### DevTools Console
[F12 → Console → Copia errores aquí]

### Screenshots
[Adjunta imágenes del problema]

### He probado
- [ ] Limpié caché
- [ ] Recargué la página
- [ ] Probé en incógnito
- [ ] Probé en otro navegador
- [ ] Verifiqué internet
```

---

## 📞 Tipos de Emergencias

### 1. Pérdida de Datos

**⚠️ CRÍTICO**

**Qué NO hagas:**
- ❌ Cierres sesión
- ❌ Desinstales la app
- ❌ Limpies datos del navegador
- ❌ Pagues dinero

**Qué hagas:**
1. Recarga la página lentamente
2. Abre DevTools y busca errores
3. Reporta AQUÍ con:
   - Screenshots del error
   - Última cosa que guardaste
   - Si ves algo en indexedDB (DevTools → Application → Storage)

**Recuperación:**
- Los datos están en Firestore (nube)
- El admin puede restaurar desde backup

---

### 2. No puedo iniciar sesión

**⚠️ CRÍTICO si es urgente**

**Intenta primero:**
1. Limpia cajas de correo (spam)
2. Revisa si el correo es correcto
3. Intenta recuperar contraseña
4. Intenta con Google Sign-In

**Si persiste:**
```markdown
- Email de la cuenta: [ocultado]
- Último acceso exitoso: [fecha]
- Mensaje de error: [copia exacta]
- ¿Probaste recuperar contraseña? Sí/No
```

---

### 3. Alguien accedió mi cuenta

**🚨 MUY CRÍTICO**

**Haz esto AHORA:**
1. Cambia tu contraseña de Google
2. Revisa actividad de Google: myaccount.google.com
3. Desactiva sesiones en otros dispositivos
4. Cambia contraseña de BoxVision

**Luego reporta:**
```markdown
- ¿Cuándo notaste el acceso?
- ¿Qué cajas fueron modificadas?
- ¿Datos elimidos o copiados?
- ¿Ubicación geográfica extraña?
```

**Nuestro equipo:**
- Revisará logs (si es posible)
- Ayudará a restaurar datos
- Documentará el incidente

---

### 4. Vulnerabilidad de Seguridad

**🚨 MUY MUY CRÍTICO**

**NO hagas público el detalles en Issues**

En su lugar:
1. **Contacta privadamente:** futbol1234now-png@github.com
2. Describe la vulnerabilidad
3. Proporciona pasos para reproducir
4. Espera respuesta (24-48 horas)

**Respuesta esperada:**
- Acuse de recibo en 24 horas
- Plan de corrección en 48 horas
- Parche en 1 semana (según severidad)

---

## ⏰ SLA (Tiempo de Respuesta)

| Severidad | Ejemplos | Respuesta |
|-----------|----------|-----------|
| 🚨 CRÍTICO | Datos perdidos, no entra, hackeo | 2-4 horas |
| 🔴 ALTO | App rota, error constante | 4-8 horas |
| 🟠 MEDIO | Feature no funciona bien | 24 horas |
| 🟡 BAJO | Typo, UI raro | 72 horas |

---

## 📋 Responsabilidades Limitadas

**Por favor revisa:**
- [Terms of Service](../terms.html)
- [Privacy Policy](../privacy.html)
- [LICENSE](../LICENSE)

**En resumen:**
- La app se proporciona "AS IS"
- Usas bajo tu riesgo
- Haz backup regularmente
- No somos responsables de pérdida de datos causada por:
  - Tu negligencia (olvidaste contraseña)
  - Terceros (tu dispositivo fue hackeado)
  - Actos de Dios (caída de Firebase)

---

## ✅ Checklist antes de reportar CRÍTICO

- [ ] Probé todas las soluciones básicas?
- [ ] Es realmente crítico y urgente?
- [ ] Incluí toda la info necesaria?
- [ ] Incluí screenshots?
- [ ] Incluí info técnica?
- [ ] DevTools Console errors?
- [ ] Contacto (email)?

---

## 💪 Estamos aquí para ayudar

Si algo sale mal, haremos todo lo posible por ayudarte.

**No dudes en reportar.**

---

**IMPORTANTE:** Relee esto antes de comentar. Solo reporta AQUÍ si es realmente crítico.

**Type:** Bug  
**Label:** support, critical, urgent
