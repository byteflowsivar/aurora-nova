# Guía de Variables - Plantillas Mustache

**Proyecto:** Aurora Nova
**Fecha:** 2025-12-04
**Versión:** 1.0

---

## 1. Variables de Configuración Global

Estas variables deben estar disponibles en **TODAS las plantillas** de email.

### appName
- **Tipo:** `String`
- **Requerida:** ✅ Sí
- **Descripción:** Nombre de la aplicación
- **Valor Típico:** `"Aurora Nova"`
- **Ejemplo:** `{{appName}}`
- **Usado en:** welcome, password-changed, login-notification

### appUrl
- **Tipo:** `String` (URL)
- **Requerida:** ✅ Sí
- **Descripción:** URL base de la aplicación
- **Valor Típico:** `"http://localhost:3000"` o `"https://aurora.nova.local"`
- **Nota:** Debe incluir protocolo (http/https) sin trailing slash
- **Ejemplo:** `{{appUrl}}/admin/dashboard`
- **Usado en:** welcome, password-changed, login-notification

### supportEmail
- **Tipo:** `String` (Email)
- **Requerida:** ✅ Sí
- **Descripción:** Email de contacto para soporte
- **Valor Típico:** `"soporte@aurora.nova.local"`
- **Ejemplo:** `<a href="mailto:{{supportEmail}}">{{supportEmail}}</a>`
- **Usado en:** welcome, password-changed

---

## 2. Variables de Usuario

Estas variables provienen del contexto del usuario.

### firstName
- **Tipo:** `String | null`
- **Requerida:** ❌ No (opcional)
- **Descripción:** Nombre del usuario
- **Valor Típico:** `"Juan"`, `"María"`, `null`
- **Nota:** Puede estar vacío; usar `hasFirstName` para condicionales
- **Ejemplo:** `{{#hasFirstName}}Hola, {{firstName}}{{/hasFirstName}}`
- **Usado en:** welcome

### hasFirstName
- **Tipo:** `Boolean`
- **Requerida:** ✅ Sí (derivada de firstName)
- **Descripción:** Flag que indica si firstName tiene contenido
- **Cómo calcular:** `Boolean(firstName && firstName.trim().length > 0)`
- **Ejemplo en plantilla:**
  ```mustache
  {{#hasFirstName}}
    <h2>Hola, {{firstName}} 👋</h2>
  {{/hasFirstName}}
  {{^hasFirstName}}
    <h2>Hola 👋</h2>
  {{/hasFirstName}}
  ```
- **Usado en:** welcome

---

## 3. Variables de Evento - Por Tipo de Email

### 3.1 Welcome Email (Bienvenida a nuevo usuario)

**Plantilla:** `templates/admin/email/welcome.mustache`

**Contexto:** Se envía cuando un usuario es creado exitosamente

**Variables requeridas:**
```javascript
{
  appName: "Aurora Nova",           // Global
  firstName: "Juan" | null,          // Usuario
  hasFirstName: true | false,        // Usuario (derivada)
  appUrl: "http://localhost:3000",  // Global
  supportEmail: "soporte@..."        // Global
}
```

**Ejemplo de contexto completo:**
```javascript
{
  appName: "Aurora Nova",
  firstName: "Juan",
  hasFirstName: true,
  appUrl: "http://localhost:3000",
  supportEmail: "soporte@aurora.nova.local"
}
```

---

### 3.2 Password Reset Email (Reset de contraseña)

**Plantilla:** `templates/admin/email/password-reset.mustache`

**Contexto:** Se envía cuando usuario solicita reset de contraseña

**Variables requeridas:**
```javascript
{
  resetLink: "https://aurora.nova.local/admin/auth/reset-password?token=abc123xyz..."  // Evento
}
```

**Variables opcionales (recomendadas para futuro):**
```javascript
{
  appName: "Aurora Nova",           // Global (actualmente hardcodeada)
  firstName: "Juan",                // Usuario (actualmente no incluida)
  hasFirstName: true,               // Usuario (actualmente no incluida)
  expirationTime: "30 minutos"      // Evento (actualmente hardcodeada)
}
```

**Ejemplo de contexto (mínimo actual):**
```javascript
{
  resetLink: "https://aurora.nova.local/admin/auth/reset-password?token=..."
}
```

**Nota Importante:** Esta plantilla tiene variables hardcodeadas:
- `appName` está hardcodeada como "Aurora Nova" (línea 4)
- `expirationTime` está hardcodeada como "30 minutos" (línea 16)

Se recomienda migrar estos valores a variables en futuros updates.

---

### 3.3 Password Changed Email (Notificación de cambio de contraseña)

**Plantilla:** `templates/admin/email/password-changed.mustache`

**Contexto:** Se envía después de cambio exitoso de contraseña

**Variables requeridas:**
```javascript
{
  appName: "Aurora Nova",                   // Global
  changedBySelf: true | false,              // Evento (mutuamente excluyente)
  changedByAdmin: false | true,             // Evento (mutuamente excluyente)
  timestamp: "2025-12-04T08:30:00Z",        // Evento (ISO 8601)
  supportEmail: "soporte@aurora.nova.local", // Global
  appUrl: "http://localhost:3000"           // Global
}
```

**Restricción importante:**
- ⚠️ Exactamente **UNA** de `changedBySelf` o `changedByAdmin` debe ser `true`
- No pueden ser ambas `true`
- No pueden ser ambas `false`

**Ejemplo de contexto - Cambio por el usuario:**
```javascript
{
  appName: "Aurora Nova",
  changedBySelf: true,
  changedByAdmin: false,
  timestamp: "2025-12-04T08:30:00Z",
  supportEmail: "soporte@aurora.nova.local",
  appUrl: "http://localhost:3000"
}
```

**Ejemplo de contexto - Cambio por admin:**
```javascript
{
  appName: "Aurora Nova",
  changedBySelf: false,
  changedByAdmin: true,
  timestamp: "2025-12-04T08:30:00Z",
  supportEmail: "soporte@aurora.nova.local",
  appUrl: "http://localhost:3000"
}
```

---

### 3.4 Login Notification Email (Notificación de login)

**Plantilla:** `templates/admin/email/login-notification.mustache`

**Contexto:** Se envía después de cada login exitoso en área admin

**Variables requeridas:**
```javascript
{
  appName: "Aurora Nova",                       // Global
  timestamp: "2025-12-04T08:30:00Z",            // Evento (ISO 8601)
  ipAddress: "192.168.1.1",                     // Evento
  userAgent: "Mozilla/5.0 (Windows NT 10.0...)...", // Evento (máx ~80 caracteres)
  appUrl: "http://localhost:3000"               // Global
}
```

**Restricciones:**
- `timestamp`: Debe estar en formato ISO 8601 con timezone (ej: `2025-12-04T08:30:00Z`)
- `ipAddress`: Debe ser IPv4 o IPv6 válida (ej: `192.168.1.1` o `2001:db8::1`)
- `userAgent`: Recomendado truncar a máximo 80 caracteres para evitar quebrar layout en email clients

**Ejemplo de contexto:**
```javascript
{
  appName: "Aurora Nova",
  timestamp: "2025-12-04T08:30:00Z",
  ipAddress: "192.168.1.100",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
  appUrl: "http://localhost:3000"
}
```

---

## 4. Formatos Requeridos

### Timestamps

**Formato requerido:** ISO 8601 con timezone

**Ejemplos válidos:**
```
2025-12-04T08:30:00Z           (UTC - Recomendado)
2025-12-04T08:30:00-06:00      (Con offset específico)
2025-12-04T08:30:00.123Z       (Con milisegundos)
```

**Ejemplo en JavaScript:**
```javascript
// UTC (recomendado)
const timestamp = new Date().toISOString();  // "2025-12-04T08:30:00.123Z"

// Con timezone específico
const timestamp = new Date().toLocaleString('es-SV');  // "4/12/2025 08:30:00"
// Mejor: usar librería como date-fns para ISO
import { formatISO } from 'date-fns';
const timestamp = formatISO(new Date());
```

### URLs

**Formato requerido:** URL absoluta con protocolo

**Ejemplos válidos:**
```
http://localhost:3000
https://aurora.nova.local
https://aurora.nova.local:8443
```

**NO válidos:**
```
localhost:3000          ❌ Falta protocolo
/admin/dashboard        ❌ URL relativa
aurora.nova.local       ❌ Falta protocolo
```

### Email Addresses

**Formato requerido:** Email válido RFC 5322

**Ejemplos válidos:**
```
soporte@aurora.nova.local
usuario+tag@example.com
info@empresa.com
```

### IP Addresses

**Formatos válidos:**

IPv4 (32-bit):
```
192.168.1.1
10.0.0.0
172.16.0.1
127.0.0.1
```

IPv6 (128-bit):
```
2001:db8::1
::1
fe80::1
```

---

## 5. Checklist de Implementación

### Para cada servicio de email:

```
Variables de Configuración
  ☐ appName obtenido de `process.env.APP_NAME`
  ☐ appUrl obtenido de `process.env.APP_URL`
  ☐ supportEmail obtenido de `process.env.SUPPORT_EMAIL`

Variables del Usuario
  ☐ firstName obtenido de `user.firstName`
  ☐ hasFirstName calculado como `Boolean(user.firstName?.trim().length > 0)`

Variables de Evento (por tipo de email)
  ☐ Todas las variables requeridas presentes
  ☐ Timestamps en formato ISO 8601
  ☐ URLs absolutas con protocolo
  ☐ Restricciones validadas (ej: changedBySelf XOR changedByAdmin)

Rendering
  ☐ Usar librería Mustache para renderizar
  ☐ Validar que todas las variables están presentes en contexto
  ☐ Testing en email client (Litmus, Email on Acid)
```

---

## 6. Ejemplos de Contexto Completo

### Ejemplo 1: Welcome Email con todos los datos

```javascript
const context = {
  appName: "Aurora Nova",
  firstName: "Juan",
  hasFirstName: true,
  appUrl: "http://localhost:3000",
  supportEmail: "soporte@aurora.nova.local"
};

// Renderizar
const html = mustache.render(welcomeTemplate, context);
```

### Ejemplo 2: Password Changed - Cambio por usuario

```javascript
const context = {
  appName: "Aurora Nova",
  changedBySelf: true,
  changedByAdmin: false,
  timestamp: new Date().toISOString(),
  supportEmail: "soporte@aurora.nova.local",
  appUrl: "https://aurora.nova.local"
};

const html = mustache.render(passwordChangedTemplate, context);
```

### Ejemplo 3: Login Notification - Completo

```javascript
const context = {
  appName: "Aurora Nova",
  timestamp: new Date().toISOString(),
  ipAddress: request.ip,  // Capturado del request
  userAgent: request.get('user-agent')?.substring(0, 80),  // Truncado a 80 caracteres
  appUrl: "https://aurora.nova.local"
};

const html = mustache.render(loginNotificationTemplate, context);
```

---

## 7. Integración con NextAuth.js

Si se usa NextAuth.js para autenticación, considerar hooks para emails:

```javascript
// next-auth.config.ts
export const authOptions = {
  providers: [
    CredentialsProvider({
      // ...
    })
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // Aquí podrías capturar IP y User Agent
      if (account) {
        // Login exitoso - enviar email
        await sendLoginNotificationEmail({
          email: user.email,
          firstName: user.firstName,
          timestamp: new Date().toISOString(),
          ipAddress: request.ip,
          userAgent: request.get('user-agent')
        });
      }
      return token;
    }
  }
};
```

---

## 8. Próximos Pasos

1. **Implementar servicio centralizado de email** que use estos contextos
2. **Crear tests** para validar variables de cada plantilla
3. **Agregar validación** en tiempo de compilación (TypeScript)
4. **Documentar endpoints** que envían estos emails
5. **Internacionalización** (i18n) para múltiples idiomas

---

**Fin de Guía de Variables - v1.0**
