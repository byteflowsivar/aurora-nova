# Plantillas de Email - Contexto Admin

**Proyecto:** Aurora Nova - Área Administrativa
**Versión:** 1.0
**Última actualización:** 2025-12-04

---

## 📋 Plantillas Disponibles

Este directorio contiene **4 plantillas de email** para el contexto administrativo:

### 1️⃣ welcome.mustache - Bienvenida a Nuevo Usuario

**Propósito:** Email de bienvenida cuando un usuario admin es creado

**Cuándo se envía:**
- Después de crear un nuevo usuario en `/api/admin/users` (POST)
- Cuando el usuario no existe previamente

**Variables requeridas:**
```javascript
{
  appName: "Aurora Nova",
  firstName: "Juan" | null,
  hasFirstName: true | false,
  appUrl: "http://localhost:3000",
  supportEmail: "soporte@aurora.nova.local"
}
```

**Ejemplo de contexto:**
```javascript
const context = {
  appName: process.env.APP_NAME,
  firstName: newUser.firstName,
  hasFirstName: Boolean(newUser.firstName?.trim().length > 0),
  appUrl: process.env.APP_URL,
  supportEmail: process.env.SUPPORT_EMAIL
};
```

**Dónde implementar:**
- Endpoint: `POST /api/admin/users`
- Tras crear usuario exitosamente
- Ver: `src/app/api/admin/users/route.ts`

**Notas especiales:**
- ✅ Link al dashboard admin: `/admin/dashboard`
- ✅ Personalización con firstName si está disponible
- ✅ Información de características disponibles

---

### 2️⃣ password-reset.mustache - Reset de Contraseña

**Propósito:** Email con link para resetear contraseña

**Cuándo se envía:**
- Cuando usuario solicita reset de contraseña
- Típicamente desde página de login

**Variables requeridas:**
```javascript
{
  resetLink: "https://aurora.nova.local/admin/auth/reset-password?token=..."
}
```

**Variables hardcodeadas (considerar migrar):**
- `appName: "Aurora Nova"` (línea 4)
- `expirationTime: "30 minutos"` (línea 16)

**Ejemplo de contexto:**
```javascript
// Generar token de reset (ej: JWT con expiration)
const resetToken = jwt.sign(
  { userId: user.id, type: 'password-reset' },
  process.env.AUTH_SECRET,
  { expiresIn: '30m' }
);

const resetLink = `${process.env.APP_URL}/admin/auth/reset-password?token=${resetToken}`;

const context = { resetLink };
```

**Dónde implementar:**
- Endpoint: `POST /api/auth/reset-password` (o similar)
- Cuando usuario solicita reset
- Integración con NextAuth.js callbacks

**Notas especiales:**
- ⚠️ Token debe tener expiration (30 minutos recomendado)
- ⚠️ URL debe ser absolutas con protocolo
- ✅ Button fallback con URL copiable
- ⚠️ **FUTURO:** Agregar firstName y appName como variables

---

### 3️⃣ password-changed.mustache - Cambio de Contraseña

**Propósito:** Notificación de que la contraseña fue cambiada

**Cuándo se envía:**
- Después de cambio exitoso de contraseña
- Confirmación de seguridad al usuario

**Variables requeridas:**
```javascript
{
  appName: "Aurora Nova",
  changedBySelf: true | false,        // Mutuamente excluyente
  changedByAdmin: false | true,       // Mutuamente excluyente
  timestamp: "2025-12-04T08:30:00Z",  // ISO 8601
  supportEmail: "soporte@aurora.nova.local",
  appUrl: "http://localhost:3000"
}
```

**Restricciones:**
- ⚠️ **Exactamente UNA** de `changedBySelf` o `changedByAdmin` debe ser `true`
- `timestamp` debe estar en formato ISO 8601 (con timezone)

**Ejemplo de contexto - Cambio por usuario:**
```javascript
const context = {
  appName: process.env.APP_NAME,
  changedBySelf: true,
  changedByAdmin: false,
  timestamp: new Date().toISOString(),
  supportEmail: process.env.SUPPORT_EMAIL,
  appUrl: process.env.APP_URL
};
```

**Ejemplo de contexto - Cambio por admin:**
```javascript
const context = {
  appName: process.env.APP_NAME,
  changedBySelf: false,
  changedByAdmin: true,
  timestamp: new Date().toISOString(),
  supportEmail: process.env.SUPPORT_EMAIL,
  appUrl: process.env.APP_URL
};
```

**Dónde implementar:**
- Endpoint: `POST /api/customer/change-password` (cambio por usuario)
- Endpoint: `PUT /api/admin/users/[id]` (cambio por admin)
- Después de validar y aplicar cambio

**Notas especiales:**
- ✅ Condicionales claros para dos escenarios
- ✅ Box de advertencia en caso de actividad no autorizada
- ✅ Información de soporte incluida
- ⚠️ **IMPORTANTE:** Validar que datos de contexto son mutuamente excluyentes

---

### 4️⃣ login-notification.mustache - Notificación de Login

**Propósito:** Alertar al usuario de un nuevo login

**Cuándo se envía:**
- Después de cada login exitoso en área admin
- ⚠️ Considerar: ¿Enviar siempre o solo en logins nuevos/sospechosos?

**Variables requeridas:**
```javascript
{
  appName: "Aurora Nova",
  timestamp: "2025-12-04T08:30:00Z",           // ISO 8601
  ipAddress: "192.168.1.100",                  // IPv4 o IPv6
  userAgent: "Mozilla/5.0...", // Máx ~80 caracteres
  appUrl: "http://localhost:3000"
}
```

**Restricciones:**
- `timestamp` debe estar en ISO 8601
- `userAgent` debe estar truncado a máximo 80 caracteres
- `ipAddress` puede ser IPv4 o IPv6

**Ejemplo de contexto:**
```javascript
const context = {
  appName: process.env.APP_NAME,
  timestamp: new Date().toISOString(),
  ipAddress: request.ip || request.connection.remoteAddress,
  userAgent: (request.get('user-agent') || '').substring(0, 80),
  appUrl: process.env.APP_URL
};
```

**Dónde implementar:**
- NextAuth.js callback `jwt()` o `session()`
- Endpoint: `POST /api/auth/[...nextauth]`
- Después de autenticar exitosamente
- Capturar IP y User Agent del request

**Notas especiales:**
- ✅ Información de seguridad completa (IP, navegador)
- ✅ Alerta de actividad sospechosa
- ✅ Link a página de inicio (footer)
- ⚠️ **SECURITY:** Truncar userAgent para evitar XSS o inyecciones
- ⚠️ **PRIVACY:** Considerar si enviar siempre o bajo configuración

---

## 🔧 Variables de Configuración Global

Estas variables deben estar disponibles en **TODAS** las plantillas:

| Variable | Valor Esperado | Ejemplo |
|----------|----------------|---------|
| `appName` | Nombre app | `"Aurora Nova"` |
| `appUrl` | URL con protocolo | `"http://localhost:3000"` |
| `supportEmail` | Email valido | `"soporte@aurora.nova.local"` |

**Dónde obtener:**
- `process.env.APP_NAME`
- `process.env.APP_URL`
- `process.env.SUPPORT_EMAIL`

---

## 📝 Cómo Implementar un Email Service

```typescript
// src/lib/email/admin-email.service.ts

import Mustache from 'mustache';
import fs from 'fs';
import path from 'path';

// Helper para leer plantilla
function getTemplate(name: string): string {
  const filePath = path.join(
    process.cwd(),
    'templates/admin/email',
    `${name}.mustache`
  );
  return fs.readFileSync(filePath, 'utf-8');
}

// Helper para variables globales
function getGlobalContext() {
  return {
    appName: process.env.APP_NAME || 'Aurora Nova',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@aurora.local'
  };
}

// Enviar welcome email
export async function sendWelcomeEmail(user: User) {
  const template = getTemplate('welcome');

  const context = {
    ...getGlobalContext(),
    firstName: user.firstName,
    hasFirstName: Boolean(user.firstName?.trim().length > 0)
  };

  const html = Mustache.render(template, context);

  // Enviar con servicio de email (nodemailer, sendgrid, etc.)
  await emailProvider.send({
    to: user.email,
    subject: `¡Bienvenido a ${context.appName}!`,
    html
  });
}

// Enviar password changed email
export async function sendPasswordChangedEmail(
  user: User,
  changedByAdmin: boolean
) {
  const template = getTemplate('password-changed');

  const context = {
    ...getGlobalContext(),
    changedBySelf: !changedByAdmin,
    changedByAdmin,
    timestamp: new Date().toISOString()
  };

  const html = Mustache.render(template, context);

  await emailProvider.send({
    to: user.email,
    subject: 'Tu contraseña ha sido cambiada',
    html
  });
}

// Enviar login notification
export async function sendLoginNotificationEmail(
  user: User,
  request: Request
) {
  const template = getTemplate('login-notification');

  const context = {
    ...getGlobalContext(),
    timestamp: new Date().toISOString(),
    ipAddress: request.ip || 'desconocida',
    userAgent: (request.headers.get('user-agent') || '').substring(0, 80)
  };

  const html = Mustache.render(template, context);

  await emailProvider.send({
    to: user.email,
    subject: 'Nuevo inicio de sesión detectado',
    html
  });
}
```

---

## ✅ Testing

### Test de Rendering

```typescript
// src/__tests__/email/admin-welcome.test.ts

import Mustache from 'mustache';
import fs from 'fs';

describe('Welcome Email Template', () => {
  const template = fs.readFileSync(
    'templates/admin/email/welcome.mustache',
    'utf-8'
  );

  test('renderiza con todas las variables', () => {
    const context = {
      appName: 'Aurora Nova',
      firstName: 'Juan',
      hasFirstName: true,
      appUrl: 'http://localhost:3000',
      supportEmail: 'soporte@test.local'
    };

    const html = Mustache.render(template, context);

    expect(html).toContain('¡Bienvenido a Aurora Nova!');
    expect(html).toContain('Hola, Juan');
    expect(html).toContain('http://localhost:3000/admin/dashboard');
  });

  test('renderiza sin firstName', () => {
    const context = {
      appName: 'Aurora Nova',
      firstName: null,
      hasFirstName: false,
      appUrl: 'http://localhost:3000',
      supportEmail: 'soporte@test.local'
    };

    const html = Mustache.render(template, context);

    expect(html).toContain('Hola');
    expect(html).not.toContain('Hola, null');
  });
});
```

### Test en Email Client

Usar servicios como:
- [Litmus](https://litmus.com/)
- [Email on Acid](https://www.emailonacid.com/)
- [MJML](https://mjml.io/) para preview

---

## 📊 Matriz de Plantillas

| Plantilla | Propósito | Variables Req. | Cuándo Enviar | Status |
|-----------|-----------|----------------|--------------|--------|
| welcome | Bienvenida | 5 | Crear usuario | ✅ Activo |
| password-reset | Reset pass | 1 | Solicitar reset | ✅ Activo |
| password-changed | Notificación cambio | 6 | Cambio exitoso | ✅ Activo |
| login-notification | Alerta login | 5 | Login exitoso | ✅ Activo |

---

## 🚀 Próximos Pasos

1. ✅ Auditoría completa (Fase 5 - Etapa 1)
2. ✅ Reorganización de estructura (Fase 5 - Etapa 2)
3. ✅ Documentación (Fase 5 - Etapa 3)
4. 📋 Validación y fixes (Fase 5 - Etapa 4)
5. 🧪 Testing (Fase 5 - Etapa 5)
6. 📦 Commit y merge (Fase 5 - Etapa 6)

---

**Fin de README - Contexto Admin v1.0**
