# Características Principales - Aurora Nova v1.0

**Versión**: 1.0.0 Estable
**Última actualización**: Diciembre 2025

## Tabla de Contenidos

1. [Sistema de Autenticación](#sistema-de-autenticación)
2. [Control de Acceso (RBAC)](#control-de-acceso-rbac)
3. [Sistema de Auditoría](#sistema-de-auditoría)
4. [Logging Estructurado](#logging-estructurado)
5. [Gestión de Sesiones](#gestión-de-sesiones)
6. [Menú Dinámico](#menú-dinámico)
7. [Sistema de Eventos](#sistema-de-eventos)
8. [Comunicación por Email](#comunicación-por-email)

---

## Sistema de Autenticación

### Overview

Aurora Nova implementa un sistema de autenticación **híbrido JWT + Database Sessions** que proporciona seguridad y trazabilidad completa.

```
┌─────────────────────────────────────┐
│     Autenticación Híbrida           │
└─────────────────────────────────────┘
         │                 │
         ▼                 ▼
    JWT Token        BD Session
    ───────────      ──────────
    Stateless        Traceable
    15 min exp       Multi-device
    Renovable        Revocable
    Claims           Device info
```

### Características

#### 1. Login/Registro

**Login**:
```typescript
const result = await loginUserAction({
  email: 'user@example.com',
  password: 'SecurePassword123!'
})

// Retorna:
{
  success: true,
  data: {
    sessionToken: '...',
    user: { id, email, name, permissions: [...] }
  }
}
```

**Registro**:
```typescript
const result = await registerUserAction({
  email: 'newuser@example.com',
  password: 'SecurePassword123!',
  firstName: 'John',
  lastName: 'Doe'
})

// Retorna:
{
  success: true,
  data: { userId: '...' }
}
```

**Validaciones**:
- Email debe ser único y válido
- Password mínimo 8 caracteres
- Contraseña debe incluir: mayúscula, minúscula, número
- Nombres no pueden estar vacíos

#### 2. Reset de Contraseña

**Paso 1: Solicitar Reset**
```typescript
await requestPasswordResetAction({
  email: 'user@example.com'
})

// Resultado:
// - Email enviado con link de reset
// - Token genera en 30 minutos
// - AuditLog registrado
```

**Paso 2: Validar Token**
```typescript
const valid = await validatePasswordResetTokenAction({
  token: 'abc123...'
})

// Verifica que:
// - Token existe
// - No ha expirado
// - Pertenece a usuario válido
```

**Paso 3: Cambiar Contraseña**
```typescript
const result = await resetPasswordAction({
  token: 'abc123...',
  newPassword: 'NewPassword456!'
})

// Resultado:
{
  success: true,
  data: { userId: '...' }
}
```

#### 3. Multi-Dispositivo (Multi-Session)

**Ver todas las sesiones**:
```typescript
const sessions = await getCurrentUserSessionsAction()

// Retorna:
[
  {
    sessionToken: '...',
    ipAddress: '192.168.1.1',
    userAgent: 'Chrome/120 (Windows)',
    device: 'Desktop - Chrome Windows',
    createdAt: '2025-12-04T10:00:00Z',
    expiresAt: '2025-12-05T10:00:00Z',
    isCurrent: true
  },
  {
    sessionToken: '...',
    ipAddress: '203.0.113.45',
    userAgent: 'Safari/17 (iPhone)',
    device: 'Mobile - Safari iOS',
    createdAt: '2025-12-03T15:30:00Z',
    expiresAt: '2025-12-04T15:30:00Z',
    isCurrent: false
  }
]
```

**Cerrar sesión específica**:
```typescript
await invalidateSessionAction({
  sessionToken: '...'
})

// Resultado:
// - Sesión se invalida inmediatamente
// - Usuario desconectado en ese dispositivo
// - Otros dispositivos no afectados
```

**Cerrar todas las sesiones excepto la actual**:
```typescript
await closeAllOtherSessionsAction()

// Resultado:
// - Cierra todas excepto la sesión actual
// - Úseful si se detecta compromiso
```

**Cerrar todas las sesiones**:
```typescript
await closeAllSessionsAction()

// Resultado:
// - Usuario completamente desconectado
// - Requiere login nuevamente en todos los dispositivos
```

### Flujo de Autenticación

```
1. Usuario entra email/contraseña
   │
   ▼
2. Validación en cliente (básica)
   │
   ▼
3. loginUserAction (Server Action)
   │
   ├─ Validar schema Zod
   ├─ Buscar usuario en BD
   ├─ Comparar password hash
   ├─ Generar JWT token
   ├─ Guardar session en BD
   ├─ Extraer permisos del user
   └─ Emitir USER_LOGGED_IN evento
   │
   ▼
4. Listener: audit-listener
   │
   └─ Crear AuditLog con:
      - Usuario
      - IP address
      - User agent (device info)
      - Timestamp
   │
   ▼
5. Cliente recibe respuesta
   │
   ├─ Almacena token en sesión
   ├─ Actualiza user state
   └─ Redirige a /admin/dashboard
```

### Configuración

**Archivo**: `src/lib/auth.ts`

```typescript
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  callbacks: {
    async jwt({ token, user }) {
      // Incluir permisos en JWT
      if (user) {
        token.permissions = await getPermissions(user.id)
      }
      return token
    },
    async session({ session, token }) {
      // Incluir info en sesión
      session.user.permissions = token.permissions
      return session
    }
  },
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        return await validateCredentials(credentials)
      }
    })
  ]
}
```

---

## Control de Acceso (RBAC)

### Modelo de Datos

**Tres tablas principales**:

```
┌────────────────────┐
│      User          │
│  ────────────────  │
│ • id (PK)          │
│ • email (UNIQUE)   │
│ • firstName        │
│ • lastName         │
│ • createdAt        │
│ • updatedAt        │
│ • userRoles (FK)   │ ───┐
└────────────────────┘    │
                          │ many-to-many
┌────────────────────┐    │
│      Role          │ ◄──┤
│  ────────────────  │    │
│ • id (PK)          │    │
│ • name (UNIQUE)    │    │
│ • description      │    │
│ • rolePermissions  │    │
│ • userRoles        │ ───┘
└────────────────────┘
        │
        │ many-to-many
        ▼
┌────────────────────┐
│    Permission      │
│  ────────────────  │
│ • id (PK, string)  │
│ • module           │
│ • description      │
│ • rolePermissions  │
└────────────────────┘
```

**Ejemplo**:
```
User "john@example.com"
  ├─ Role "Administrator"
  │  ├─ Permission "user:create"
  │  ├─ Permission "user:read"
  │  ├─ Permission "user:update"
  │  ├─ Permission "user:delete"
  │  ├─ Permission "role:create"
  │  └─ Permission "role:update"
  │
  └─ Role "Auditor"
     └─ Permission "audit:read"
```

### Permisos Predefinidos

**Autenticación**:
- `auth:signin` - Acceso a login
- `auth:register` - Poder registrarse
- `auth:reset_password` - Solicitar reset

**Usuarios**:
- `user:create` - Crear usuarios
- `user:read` - Ver listado y detalle
- `user:update` - Editar usuarios
- `user:delete` - Borrar usuarios

**Roles**:
- `role:create` - Crear roles
- `role:read` - Ver roles
- `role:update` - Editar roles
- `role:delete` - Borrar roles

**Permisos**:
- `permission:read` - Ver permisos
- `permission:assign` - Asignar a roles

**Auditoría**:
- `audit:read` - Ver logs
- `audit:export` - Exportar reportes

**Configuración**:
- `setting:read` - Ver configuración
- `setting:update` - Editar configuración

### Validación de Permisos

**En Server Actions**:
```typescript
export async function deleteUserAction(userId: string) {
  const session = await getCurrentSession()

  // Paso 1: ¿Está autenticado?
  if (!session) {
    throw new Error('Unauthorized')
  }

  // Paso 2: ¿Tiene permiso?
  if (!session.user.permissions.includes('user:delete')) {
    throw new Error('Forbidden')
  }

  // Paso 3: Ejecutar
  return await db.user.delete({ where: { id: userId } })
}
```

**En API Routes**:
```typescript
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession()

  if (!session?.user.permissions.includes('user:delete')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await db.user.delete({ where: { id: params.id } })
  return Response.json({ data: user })
}
```

**En Componentes (Optional - para UX)**:
```typescript
import { PermissionGate } from '@/modules/shared/components'

export function UserActions({ userId }) {
  return (
    <div>
      <PermissionGate permission="user:update">
        <Button onClick={() => editUser(userId)}>Editar</Button>
      </PermissionGate>

      <PermissionGate permission="user:delete">
        <Button variant="destructive" onClick={() => deleteUser(userId)}>
          Eliminar
        </Button>
      </PermissionGate>
    </div>
  )
}
```

### Gestión de Roles

**Crear rol**:
```typescript
const role = await db.role.create({
  data: {
    name: 'Editor',
    description: 'Puede editar contenido',
    rolePermissions: {
      create: [
        { permissionId: 'content:read' },
        { permissionId: 'content:update' },
        { permissionId: 'user:read' }
      ]
    }
  }
})
```

**Asignar rol a usuario**:
```typescript
await db.user.update({
  where: { id: userId },
  data: {
    userRoles: {
      create: { roleId: 'role-id' }
    }
  }
})
```

**Cambiar permisos de rol**:
```typescript
// Quitar permiso
await db.rolePermission.deleteMany({
  where: {
    roleId: 'role-id',
    permissionId: 'permission:id'
  }
})

// Agregar permiso
await db.rolePermission.create({
  data: {
    roleId: 'role-id',
    permissionId: 'new:permission'
  }
})
```

---

## Sistema de Auditoría

### Información Registrada

**Cada acción registra**:

```typescript
interface AuditLog {
  id: string                    // UUID único
  userId: string                // Quién hizo
  action: string                // Qué hizo (user_created, user_updated, etc)
  module: string                // Módulo (users, roles, auth, etc)
  area: string                  // Zona (admin, public, system)
  entityType: string            // Tipo de entidad (User, Role, etc)
  entityId: string              // ID de la entidad modificada
  oldValues?: Record<string, any>   // Valores anteriores
  newValues?: Record<string, any>   // Valores nuevos
  ipAddress: string             // Dirección IP del cliente
  userAgent: string             // User agent del navegador/app
  requestId: string             // ID para correlacionar logs
  timestamp: Date               // Momento exacto
}
```

**Ejemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "user-123",
  "action": "user_updated",
  "module": "users",
  "area": "admin",
  "entityType": "User",
  "entityId": "user-456",
  "oldValues": {
    "firstName": "John",
    "email": "john@old.com"
  },
  "newValues": {
    "firstName": "Jonathan",
    "email": "jonathan@new.com"
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Chrome/120.0 (Windows 10)",
  "requestId": "req-abc123",
  "timestamp": "2025-12-04T14:30:00Z"
}
```

### Acciones Auditadas

**Autenticación**:
- login - Usuario inicia sesión
- logout - Usuario cierra sesión
- register - Nuevo usuario registrado
- password_reset_requested - Solicitud de reset
- password_reset - Contraseña restablecida

**Gestión de Usuarios**:
- user_created - Nuevo usuario creado
- user_updated - Usuario modificado
- user_deleted - Usuario eliminado
- user_role_assigned - Rol asignado
- user_role_removed - Rol removido

**Gestión de Roles**:
- role_created - Nuevo rol creado
- role_updated - Rol modificado
- role_deleted - Rol eliminado

**Permisos**:
- permission_assigned - Permiso asignado a rol
- permission_revoked - Permiso removido de rol

**Configuración**:
- config_updated - Configuración modificada

### Visualizar Auditoría

**Ruta**: `/admin/audit`

**Funcionalidades**:

```
┌─────────────────────────────────────┐
│      FILTROS                        │
├─────────────────────────────────────┤
│ Usuario:    [Dropdown]              │
│ Acción:     [Dropdown]              │
│ Módulo:     [Dropdown]              │
│ Área:       [Dropdown]              │
│ Fecha Desde:[Date Picker]           │
│ Fecha Hasta:[Date Picker]           │
│ [Aplicar Filtros]  [Exportar CSV]   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      TABLA DE RESULTADOS            │
├─────┬──────┬────────┬───────────────┤
│ ID  │User  │Acción  │Timestamp      │
├─────┼──────┼────────┼───────────────┤
│...  │john  │updated │Dec 4, 2:30pm  │
│     │      │user    │               │
└─────┴──────┴────────┴───────────────┘

Clic en fila → Ver detalles completos
```

**Detalles**:

```
User: john@example.com
Action: user_updated
Module: users
Area: admin
Entity: User (id: user-456)
IP: 192.168.1.100
Device: Chrome on Windows 10
Request ID: req-abc123
Timestamp: December 4, 2025 at 2:30 PM

Changes:
─────────────────────
BEFORE:
  firstName: John
  email: john@old.com

AFTER:
  firstName: Jonathan
  email: jonathan@new.com
```

**Exportar Datos**:

```bash
# CSV
auditLog_2025-12-04.csv
"id","userId","action","timestamp","ipAddress"
"..."

# JSON
auditLog_2025-12-04.json
[{
  "id": "...",
  "userId": "...",
  ...
}]
```

---

## Logging Estructurado

### Sistema Pino

Aurora Nova usa **Pino** para logging estructurado en formato JSON.

**Beneficios**:
- Logs estructurados (fácil parsear)
- Request ID para correlación
- Context automático
- Performance tracking
- Níveis: info, warn, error

### Ejemplo de Log

```json
{
  "level": 30,
  "time": "2025-12-04T14:30:00.123Z",
  "pid": 12345,
  "hostname": "app-server",
  "requestId": "req-abc123def456",
  "userId": "user-789",
  "ipAddress": "192.168.1.100",
  "msg": "User created successfully",
  "userId": "new-user-123",
  "email": "newuser@example.com",
  "duration": 45,
  "v": 1
}
```

### Niveles de Log

**ERROR (40)**:
```typescript
logger.error('Database connection failed', {
  error: err.message,
  duration: 5000,
  retries: 3
})
```

**WARN (30)**:
```typescript
logger.warn('Slow query detected', {
  query: 'SELECT...',
  duration: 2500,
  threshold: 1000
})
```

**INFO (20)**:
```typescript
logger.info('User login successful', {
  userId: 'user-123',
  ip: '192.168.1.1',
  device: 'Chrome Windows'
})
```

### Configuración

**Variables de entorno**:
```bash
LOG_LEVEL="info"              # Nivel mínimo
LOG_FILE="./logs/app.log"     # Archivo de salida
LOG_DIR="./logs"              # Carpeta de logs
```

**Almacenamiento**:
- Stdout (consola)
- Archivo local (./logs/app.log)
- Servicios externos (ELK, Datadog, etc - opcionales)

---

## Gestión de Sesiones

### Ver Sesiones Activas

```typescript
const sessions = await getCurrentUserSessionsAction()

// Retorna array de sesiones:
[
  {
    sessionToken: 'abc123...',
    device: 'Chrome on Windows 10',
    ipAddress: '192.168.1.1',
    createdAt: '2025-12-04T10:00:00Z',
    expiresAt: '2025-12-05T10:00:00Z',
    isCurrent: true
  }
]
```

### Cerrar Sesión Remota

Útil si:
- Usuario olvida cerrar sesión en dispositivo público
- Se detecta actividad sospechosa
- Usuario cambia contraseña

```typescript
// Cerrar sesión específica
await invalidateSessionAction({
  sessionToken: 'abc123...'
})

// Usuario automáticamente desconectado en ese dispositivo
```

### Información de Sesión

**Almacenado en BD**:
```
sessionToken   → Token único de sesión
ipAddress      → IP del cliente
userAgent      → Browser/device info
createdAt      → Cuándo se creó
expiresAt      → Cuándo expira (1 día)
```

**Parsing de User Agent**:
```
Raw: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

Parsed:
├─ Browser: Chrome 120
├─ OS: Windows 10
└─ Device: Desktop
```

---

## Menú Dinámico

### Generación Automática

El menú se genera basado en:
- Permisos del usuario
- Items configurados en BD
- Estructura jerárquica

**Items de menú en BD**:

```
Dashboard
├─ Main
│  ├─ Mi Perfil (requires: profile:read)
│  └─ Mis Sesiones (requires: session:read)
│
├─ Admin (requires: any admin:* permission)
│  ├─ Usuarios (requires: user:read)
│  ├─ Roles (requires: role:read)
│  ├─ Permisos (requires: permission:read)
│  └─ Auditoría (requires: audit:read)
│
└─ Configuración (requires: setting:read)
   ├─ Perfil (requires: setting:update)
   └─ Seguridad (requires: setting:update)
```

### Caché

**Problema**: Query a BD en cada render

**Solución**: Caché en memoria con TTL

```typescript
// Primera request
await getMenu(userId)  // Query BD → Result → Cache

// Siguientes requests (1 hora)
await getMenu(userId)  // Cache → Result

// Después 1 hora o invalidación
await getMenu(userId)  // Query BD → Result → Cache
```

### Personalización

**Reordenar items**:
```typescript
await db.menuItem.update({
  where: { id: 'item-123' },
  data: { order: 5 }
})
```

**Agregar permiso requerido**:
```typescript
await db.menuItem.update({
  where: { id: 'item-123' },
  data: { permissionId: 'setting:update' }
})
```

**Crear subitem jerárquico**:
```typescript
await db.menuItem.create({
  data: {
    title: 'Mi Sub-item',
    href: '/path',
    parentId: 'parent-item-id',
    order: 1
  }
})
```

---

## Sistema de Eventos

### Bus de Eventos

Aurora Nova usa un EventBus centralizado para desacoplamiento.

**Eventos disponibles**:

```
USER_REGISTERED
├─ Emitido por: registerUserAction
├─ Listeners:
│  ├─ email-listener → Enviar email bienvenida
│  ├─ audit-listener → Crear AuditLog
│  └─ logger → Log info
└─ Payload: { userId, email, timestamp }

PASSWORD_RESET_REQUESTED
├─ Emitido por: requestPasswordResetAction
├─ Listeners:
│  ├─ email-listener → Enviar email con link
│  └─ audit-listener → Crear AuditLog
└─ Payload: { userId, email, token }

USER_LOGGED_OUT
├─ Emitido por: logoutUserAction
├─ Listeners:
│  ├─ audit-listener → Registrar logout
│  └─ cache-invalidator → Invalidar menú cache
└─ Payload: { userId, sessionToken }

AUDIT_LOG_CREATED
├─ Emitido por: audit-listener (cuando crea log)
├─ Listeners:
│  ├─ logger → Log del audit
│  └─ (extensible)
└─ Payload: { auditLog }
```

### Emitir Evento

```typescript
import { eventBus } from '@/lib/events/event-bus'

export async function registerUserAction(input) {
  const user = await createUser(input)

  // Emitir evento
  eventBus.emit('USER_REGISTERED', {
    userId: user.id,
    email: user.email,
    timestamp: new Date()
  })

  return { success: true, data: { userId: user.id } }
}
```

### Escuchar Evento

```typescript
import { eventBus } from '@/lib/events/event-bus'

// En src/lib/events/listeners/welcome-email-listener.ts
export function setupWelcomeEmailListener() {
  eventBus.on('USER_REGISTERED', async ({ email, userId }) => {
    try {
      await sendWelcomeEmail(email)
      logger.info('Welcome email sent', { userId, email })
    } catch (error) {
      logger.error('Failed to send welcome email', { userId, error })
    }
  })
}

// Inicializar en app startup
setupWelcomeEmailListener()
```

### Extender Sistema

**Crear nuevo evento**:

```typescript
// 1. Definir tipo
export interface MyCustomEvent {
  userId: string
  data: string
  timestamp: Date
}

// 2. Emitir
eventBus.emit<MyCustomEvent>('MY_CUSTOM_EVENT', {
  userId: 'user-123',
  data: 'some data',
  timestamp: new Date()
})

// 3. Escuchar
eventBus.on<MyCustomEvent>('MY_CUSTOM_EVENT', async (event) => {
  logger.info('My custom event triggered', event)
})
```

---

## Comunicación por Email

### Configuración

**Variables de entorno**:
```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@example.com"
```

### Servicio de Email

```typescript
import { emailService } from '@/modules/shared/api/email-service'

await emailService.send({
  to: 'user@example.com',
  subject: 'Welcome!',
  template: 'welcome',
  data: {
    firstName: 'John',
    confirmLink: 'https://...'
  }
})
```

### Plantillas

**Ubicación**: `templates/`

**Ejemplo: welcome.mustache**:
```html
<h1>Bienvenido {{firstName}}!</h1>

<p>Tu cuenta ha sido creada exitosamente.</p>

<a href="{{confirmLink}}">Confirmar Email</a>

<p>O copia este link:</p>
<p>{{confirmLink}}</p>
```

**Renderizado con Mustache**:
```typescript
const template = fs.readFileSync('templates/welcome.mustache', 'utf-8')
const html = Mustache.render(template, {
  firstName: 'John',
  confirmLink: 'https://example.com/confirm?token=...'
})
```

### Emails Automáticos

**Bienvenida**:
- Disparado: `USER_REGISTERED` evento
- Listener: email-listener
- Template: welcome.mustache

**Reset de Contraseña**:
- Disparado: `PASSWORD_RESET_REQUESTED` evento
- Listener: email-listener
- Template: reset-password.mustache
- Incluye: Link con token válido 30 minutos

**Notificación de Login**:
- Disparado: Opcionalmente en `USER_LOGGED_IN`
- Listener: email-listener (configurable)
- Template: new-device-login.mustache
- Propósito: Alertar si login de dispositivo nuevo

---

**Versión**: 1.0.0 Estable
**Última actualización**: Diciembre 2025
