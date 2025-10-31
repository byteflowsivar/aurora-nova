# Sistema Híbrido de Autenticación - JWT + Database Tracking

**Proyecto:** Aurora Nova
**Módulo:** auth_and_authz
**Fecha:** 2025-10-31
**Versión:** 1.0

---

## Resumen Ejecutivo

Aurora Nova implementa un **sistema híbrido de autenticación** que combina lo mejor de dos mundos:

1. **JWT (JSON Web Tokens)**: Para autenticación rápida sin consultas a BD
2. **Database Session Tracking**: Para gestión manual de sesiones y auditoría

Este enfoque permite:
- ✅ Alto rendimiento (JWT no requiere BD en cada request)
- ✅ Control total sobre sesiones (invalidación manual, gestión de dispositivos)
- ✅ Auditoría completa (IP, UserAgent, timestamps)
- ✅ Seguridad granular (validación opcional en BD para rutas sensibles)

---

## Arquitectura del Sistema

### Componentes Principales

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ 1. Login (email/password + IP + UserAgent)
       ▼
┌──────────────────────┐
│   Server Action      │
│   loginUser()        │
└──────┬───────────────┘
       │ 2. signIn() con metadata
       ▼
┌──────────────────────┐
│   Auth.js Provider   │
│   authorize()        │
└──────┬───────────────┘
       │ 3. Validar credenciales
       ▼
┌──────────────────────┐
│   Auth.js Callback   │
│   jwt()              │
└──────┬───────────────┘
       │ 4. Generar sessionToken UUID
       │ 5. Crear registro en tabla session
       │ 6. Agregar sessionToken al JWT
       ▼
┌──────────────────────┐
│   JWT firmado        │
│   + Cookie HTTP      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│   Middleware         │
│   - Validación JWT   │
│   - Validación BD *  │
│   - RBAC checks      │
└──────────────────────┘

* Solo para rutas sensibles
```

---

## Flujo de Autenticación

### 1. Login (Crear Sesión)

**Archivo**: `src/actions/auth.ts` → `loginUser()`

```typescript
// 1. Usuario ingresa credenciales
const result = await loginUser({
  email: "user@example.com",
  password: "Password123"
})

// 2. Server action obtiene metadata del request
const ipAddress = headers().get("x-forwarded-for")
const userAgent = headers().get("user-agent")

// 3. Pasa credenciales + metadata a Auth.js
await signIn("credentials", {
  email,
  password,
  ipAddress,  // ← Metadata para sistema híbrido
  userAgent   // ← Metadata para sistema híbrido
})

// 4. Auth.js callback JWT crea sesión en BD
// Ver: src/lib/auth.ts → callbacks.jwt()
const sessionToken = generateSessionToken()  // UUID
await createSession({
  sessionToken,
  userId: user.id,
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  ipAddress,
  userAgent
})

// 5. sessionToken se guarda en JWT
token.sessionToken = sessionToken

// 6. Cliente recibe JWT en cookie
// 7. Sesión queda registrada en tabla `session`
```

**Tabla `session` después del login:**

| sessionToken | userId | expires | createdAt | ipAddress | userAgent |
|---|---|---|---|---|---|
| uuid-1234... | user-id | 2025-11-30 | 2025-10-31 12:00 | 192.168.1.100 | Mozilla/5.0... |

---

### 2. Request Autenticado (Validación)

**Archivo**: `src/middleware.ts`

```typescript
// En cada request a ruta protegida:

// 1. VALIDACIÓN RÁPIDA (JWT)
const session = await auth()  // Verifica firma y expiración del JWT
if (!session?.user) {
  redirect("/auth/signin")  // JWT inválido o expirado
}

// 2. VALIDACIÓN ESTRICTA (BD) - Solo para rutas sensibles
if (isStrictRoute(pathname)) {
  const sessionToken = session.sessionToken
  const isValid = await isSessionValid(sessionToken)

  if (!isValid) {
    redirect("/auth/signin?reason=session_invalidated")
    // Sesión fue cerrada manualmente aunque JWT siga válido
  }
}

// 3. Continuar con request
return NextResponse.next()
```

**Rutas con validación estricta** (configurables):
- `/admin`
- `/users`
- `/roles`
- `/settings/security`

**Trade-off**: Validación estricta agrega 1 query a BD por request, pero asegura que sesiones invalidadas manualmente no puedan acceder.

---

### 3. Logout (Invalidar Sesión)

**Archivo**: `src/actions/auth.ts` → `logoutUser()`

```typescript
// 1. Obtener sessionToken de la sesión actual
const session = await auth()
const sessionToken = session.sessionToken

// 2. Eliminar registro de tabla session
await deleteSession(sessionToken)

// 3. Eliminar cookie JWT
await signOut()

// Resultado:
// - JWT eliminado del cliente
// - Registro eliminado de tabla session
// - Si alguien tiene una copia del JWT, no podrá acceder a rutas con validación estricta
```

---

## Gestión de Sesiones

Aurora Nova provee funciones completas para gestión de sesiones activas.

### Listar Sesiones Activas

**Archivo**: `src/actions/session-management.ts`

```typescript
const sessions = await getCurrentUserSessions()

// Retorna:
[
  {
    sessionToken: "uuid-1234...",
    userId: "user-id",
    expires: Date,
    createdAt: Date,
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Windows NT 10.0...",
    isCurrent: true,     // ← Sesión actual
    browser: "Chrome",   // ← Parseado de userAgent
    os: "Windows",       // ← Parseado de userAgent
    device: "Desktop"    // ← Parseado de userAgent
  },
  {
    sessionToken: "uuid-5678...",
    isCurrent: false,
    browser: "Safari",
    os: "iOS",
    device: "Mobile"
  }
]
```

**Uso en UI**: Mostrar lista de dispositivos activos al usuario.

---

### Invalidar Sesión Específica (Logout Remoto)

```typescript
// Usuario cierra sesión en otro dispositivo
const result = await invalidateSession("uuid-5678...")

// Resultado:
// - Registro eliminado de tabla session
// - Ese dispositivo no podrá acceder a rutas con validación estricta
// - JWT sigue válido, pero sesión inválida en BD
```

**Caso de uso**: "Cerrar sesión en iPhone"

---

### Cerrar Todas las Sesiones (Excepto Actual)

```typescript
// Usuario sospecha actividad no autorizada
const result = await closeAllOtherSessions()

// Resultado:
// - Elimina TODAS las sesiones del usuario excepto la actual
// - Otros dispositivos quedan desautenticados
// - Sesión actual sigue funcionando
```

**Caso de uso**: "Cerrar sesión en todos los dispositivos"

---

### Cerrar Todas las Sesiones (Incluyendo Actual)

```typescript
// Cambio de contraseña o situación de seguridad
const result = await closeAllSessions()

// Resultado:
// - Elimina TODAS las sesiones del usuario
// - Incluso la actual queda invalidada
// - Usuario debe hacer login nuevamente
```

**Caso de uso**: Después de cambiar contraseña

---

## Estructura de Base de Datos

### Tabla `session`

**Archivo**: `database/schema.sql`

```sql
CREATE TABLE "session" (
    "sessionToken" TEXT PRIMARY KEY,           -- UUID generado en login
    "userId" UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "expires" TIMESTAMP NOT NULL,              -- Fecha de expiración
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,                          -- IP del cliente
    "userAgent" TEXT                           -- UserAgent del navegador
);

CREATE INDEX idx_session_user_id ON "session"("userId");
CREATE INDEX idx_session_expires ON "session"("expires");
CREATE INDEX idx_session_created_at ON "session"("createdAt");
```

**Características**:
- Índice en `userId`: Listar sesiones por usuario (O(log n))
- Índice en `expires`: Limpiar sesiones expiradas eficientemente
- Índice en `createdAt`: Ordenar sesiones por antigüedad
- Cascade delete: Si se elimina usuario, se eliminan sus sesiones

---

## Seguridad y Consideraciones

### ¿Por qué Sistema Híbrido?

| Aspecto | Solo JWT | Solo BD | **Híbrido** |
|---|---|---|---|
| **Rendimiento** | ✅ Excelente | ❌ 1 query/request | ✅ Configurable |
| **Invalidación manual** | ❌ No posible | ✅ Inmediata | ✅ Inmediata |
| **Gestión de dispositivos** | ❌ No | ✅ Sí | ✅ Sí |
| **Auditoría** | ❌ Limitada | ✅ Completa | ✅ Completa |
| **Escalabilidad** | ✅ Excelente | ⚠️ Depende de BD | ✅ Excelente |

---

### Escenarios de Uso

#### Escenario 1: Usuario Normal en Dashboard

```
Request → Middleware
  ├─ Validación JWT ✅ (rápida, sin BD)
  ├─ /dashboard no requiere validación estricta
  └─ Allow
```

**Costo**: 0 queries a BD por request

---

#### Escenario 2: Admin en Panel de Usuarios

```
Request → Middleware
  ├─ Validación JWT ✅ (rápida, sin BD)
  ├─ /users requiere validación estricta
  ├─ Validación BD ✅ (1 query: isSessionValid)
  └─ Allow
```

**Costo**: 1 query a BD por request (solo rutas sensibles)

---

#### Escenario 3: Usuario Cierra Sesión en Otro Dispositivo

```
Dispositivo A: Hace logout remoto de Dispositivo B
  └─ deleteSession(sessionTokenB)
     └─ DELETE FROM session WHERE sessionToken = ?

Dispositivo B: Intenta acceder a /users
  ├─ Validación JWT ✅ (token aún válido)
  ├─ Validación BD ❌ (sesión no existe en BD)
  └─ Redirect a /auth/signin
```

**Resultado**: Invalidación inmediata aunque JWT siga válido

---

### Protección contra Ataques

#### 1. Robo de JWT (Token Leakage)

**Problema**: Atacante obtiene copia del JWT (XSS, man-in-the-middle, etc.)

**Mitigación**:
- ✅ Cookie `httpOnly`: JWT no accesible desde JavaScript
- ✅ Cookie `secure`: Solo transmitida por HTTPS
- ✅ Validación estricta en rutas sensibles: Atacante puede usar JWT, pero no puede acceder a rutas admin sin sesión válida en BD
- ✅ Usuario puede cerrar sesión remotamente: `closeAllOtherSessions()`

---

#### 2. Sesión Hijacking

**Problema**: Atacante usa sesión activa de otro usuario

**Mitigación**:
- ✅ IP tracking: Detectar cambios de IP (futuro)
- ✅ UserAgent tracking: Detectar cambios de navegador
- ✅ `createdAt`: Auditoría de cuándo se creó sesión
- ✅ Cierre manual: Usuario puede ver dispositivos activos y cerrar sesiones sospechosas

---

#### 3. Session Fixation

**Problema**: Atacante fuerza al usuario a usar sessionToken conocido

**Mitigación**:
- ✅ sessionToken generado server-side: Cliente no puede influir
- ✅ UUID v4: Impredecible y único
- ✅ Nuevo sessionToken en cada login: No se reutilizan tokens

---

## Configuración y Variables

### Variables de Entorno

```env
# Auth.js (JWT)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Base de Datos
DATABASE_URL=postgresql://user:password@localhost:5432/aurora_nova_db
```

### Configuración de Validación Estricta

**Archivo**: `src/middleware.ts`

```typescript
// Rutas con validación estricta (configurable)
const strictValidationRoutes = [
  '/admin',
  '/users',
  '/roles',
  '/settings/security',
  '/settings/password',
]

// Habilitar validación estricta GLOBAL (para testing)
const ENABLE_STRICT_VALIDATION_GLOBALLY = false  // true = todas las rutas verifican BD
```

**Recomendación**:
- Producción: `false` (solo rutas sensibles)
- Testing/Staging: `true` (máxima seguridad)

---

## Mantenimiento

### Limpieza de Sesiones Expiradas

**Archivo**: `src/lib/prisma/session-queries.ts`

```typescript
// Ejecutar periódicamente (cron job)
const count = await cleanExpiredSessions()
console.log(`${count} sesiones expiradas eliminadas`)
```

**Recomendación**: Ejecutar diariamente via cron job o serverless function

**SQL equivalente**:
```sql
DELETE FROM session WHERE expires < NOW();
```

---

### Monitoreo

**Queries útiles para administradores**:

```typescript
// Contar sesiones activas por usuario
await countActiveSessions(userId)

// Listar sesiones por IP sospechosa
await prisma.session.findMany({
  where: { ipAddress: "suspicious-ip" }
})

// Sesiones más antiguas
await prisma.session.findMany({
  orderBy: { createdAt: 'asc' },
  take: 10
})
```

---

## Archivos del Sistema

### Core

| Archivo | Descripción |
|---|---|
| `src/lib/auth.ts` | Configuración Auth.js + callbacks híbridos |
| `src/lib/auth-types.ts` | Extensiones de tipos para Auth.js + sessionToken |
| `src/middleware.ts` | Validación JWT + BD opcional |

### Queries y Utilidades

| Archivo | Descripción |
|---|---|
| `src/lib/prisma/session-queries.ts` | Queries Prisma para gestión de sesiones |
| `src/lib/utils/session-utils.ts` | Generación de tokens, parse de UserAgent |
| `src/lib/types/session.ts` | Tipos TypeScript para sesiones |

### Actions

| Archivo | Descripción |
|---|---|
| `src/actions/auth.ts` | loginUser, logoutUser con sistema híbrido |
| `src/actions/session-management.ts` | Gestión de sesiones (listar, invalidar, etc.) |

### Database

| Archivo | Descripción |
|---|---|
| `database/schema.sql` | Tabla session con campos híbridos |
| `prisma/schema.prisma` | Modelo Prisma de Session |

---

## API Reference

### Server Actions

#### `loginUser(input)`
```typescript
await loginUser({
  email: "user@example.com",
  password: "Password123"
})
// Crea JWT + registro en tabla session
```

#### `logoutUser()`
```typescript
await logoutUser()
// Elimina JWT + registro de session
```

#### `getCurrentUserSessions()`
```typescript
const sessions = await getCurrentUserSessions()
// Retorna sesiones activas con detalles parseados
```

#### `invalidateSession(sessionToken)`
```typescript
await invalidateSession("uuid-1234...")
// Cierra sesión específica (logout remoto)
```

#### `closeAllOtherSessions()`
```typescript
await closeAllOtherSessions()
// Cierra todas excepto actual
```

#### `closeAllSessions()`
```typescript
await closeAllSessions()
// Cierra TODAS (incluyendo actual)
```

---

### Queries

#### `createSession(data)`
```typescript
await createSession({
  sessionToken: "uuid-1234...",
  userId: "user-id",
  expires: new Date(),
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla..."
})
```

#### `isSessionValid(sessionToken)`
```typescript
const valid = await isSessionValid("uuid-1234...")
// true si existe y no expiró
```

#### `getUserSessions(userId, includeExpired)`
```typescript
const sessions = await getUserSessions("user-id", false)
// Lista sesiones del usuario
```

#### `deleteSession(sessionToken)`
```typescript
await deleteSession("uuid-1234...")
// Elimina sesión específica
```

#### `cleanExpiredSessions()`
```typescript
const count = await cleanExpiredSessions()
// Elimina todas las sesiones expiradas
```

---

## Testing

### Caso de Prueba 1: Login y Logout

```typescript
// 1. Login
const loginResult = await loginUser({
  email: "test@example.com",
  password: "Test123456"
})
expect(loginResult.success).toBe(true)

// 2. Verificar sesión en BD
const sessions = await getCurrentUserSessions()
expect(sessions).toHaveLength(1)
expect(sessions[0].ipAddress).toBeDefined()

// 3. Logout
const logoutResult = await logoutUser()
expect(logoutResult.success).toBe(true)

// 4. Verificar sesión eliminada
const sessionsAfter = await getCurrentUserSessions()
expect(sessionsAfter).toHaveLength(0)
```

### Caso de Prueba 2: Invalidación Remota

```typescript
// 1. Login desde dos dispositivos
await loginUser({ ... })  // Device A
await loginUser({ ... })  // Device B

// 2. Verificar 2 sesiones
const sessions = await getCurrentUserSessions()
expect(sessions).toHaveLength(2)

// 3. Cerrar sesión en Device B desde Device A
const sessionB = sessions.find(s => !s.isCurrent)
await invalidateSession(sessionB.sessionToken)

// 4. Device B intenta acceder
// → JWT válido pero sesión inválida en BD
// → Redirect a /auth/signin
```

---

## Próximos Pasos

### Mejoras Futuras (Opcional)

1. **Device Fingerprinting**: Detectar cambios de dispositivo más precisos
2. **Geo-location**: Alertar login desde ubicación inusual
3. **2FA Integration**: Requerir 2FA en cambio de sesiones
4. **Session Analytics**: Dashboard de sesiones activas para admin
5. **Remember Me**: Sesiones de larga duración opcionales

---

## Referencias

- Auth.js Documentation: https://authjs.dev/
- JWT Best Practices: https://tools.ietf.org/html/rfc8725
- OWASP Session Management: https://owasp.org/www-community/Session_Management_Cheat_Sheet
- ADR-001: PostgreSQL 18+ como BD principal
- ADR-002: UUID v7 para identificadores

---

**Última Actualización**: 2025-10-31
**Autor**: Equipo de Desarrollo Aurora Nova
