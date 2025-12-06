# Arquitectura de Aurora Nova v1.0

**Versión**: 1.0.0 Estable
**Última actualización**: Diciembre 2025

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Patrones Arquitectónicos](#patrones-arquitectónicos)
3. [Estructura de Capas](#estructura-de-capas)
4. [Módulos Principales](#módulos-principales)
5. [Flujos de Datos](#flujos-de-datos)
6. [Seguridad](#seguridad)
7. [Rendimiento](#rendimiento)
8. [Escalabilidad](#escalabilidad)

---

## Visión General

Aurora Nova es una aplicación full-stack construida con arquitectura modular, basada en Next.js 16 y React 19. Se divide en tres capas principales:

```
┌─────────────────────────────────────────────┐
│          Presentación (React UI)            │
│  Componentes, Hooks, Estado del cliente     │
└────────────────┬────────────────────────────┘
                 │ HTTP/REST
┌────────────────▼────────────────────────────┐
│      Server Actions & API Routes            │
│  Validación, Lógica de negocio, Permisos    │
└────────────────┬────────────────────────────┘
                 │ SQL
┌────────────────▼────────────────────────────┐
│    Base de Datos (PostgreSQL + Prisma)      │
│  Datos persistentes, RBAC, Auditoría        │
└─────────────────────────────────────────────┘
```

### Principios de Diseño

1. **Seguridad Primero**: Validación en servidor, RBAC, auditoría automática
2. **Observabilidad**: Logging estructurado, rastreo de requests, métricas
3. **Modularidad**: Código independiente, bajo acoplamiento, fácil de entender
4. **Type-Safety**: TypeScript strict, validación con Zod en todos los límites
5. **Escalabilidad**: Diseño stateless, caché estratégico, BD optimizada

---

## Patrones Arquitectónicos

### 1. Module-First Architecture

**Organización por módulos de negocio**

```
src/modules/
├── shared/         # Código compartido (tipos, hooks, UI común)
├── admin/          # Panel administrativo
└── public/         # Funcionalidades públicas
```

**Ventajas**:
- Cada módulo contiene su lógica completa
- Bajo acoplamiento entre módulos
- Fácil localizar donde cambiar algo
- Escalable: agregar módulos sin afectar existentes

**Reglas**:
- `shared/` puede usarse en cualquier módulo
- `admin/` NO puede importar de `public/`
- Cada módulo es autónomo

### 2. Container/Presentation Pattern

**Separación entre lógica y presentación**

```
admin/components/
├── containers/
│   └── user-list-container.tsx      # Smart: conecta datos
│       │
│       ├─ Fetch datos con actions
│       ├─ Maneja loading/errors
│       └─ Pasa datos a presentational
│
└── presentational/
    └── user-list-table.tsx          # Dumb: UI pura
        │
        ├─ Props-driven
        ├─ Sin llamadas API
        └─ Fácil de testear
```

**Container (Inteligente)**:
```typescript
'use client'
export function UserListContainer() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetchUsersList()
  }, [])

  return <UserListTable users={users} />
}
```

**Presentational (Tonta)**:
```typescript
export function UserListTable({ users }: Props) {
  return (
    <table>
      {users.map(u => <tr key={u.id}>{u.name}</tr>)}
    </table>
  )
}
```

**Ventajas**:
- Fácil de testear (presentational es puro)
- Reutilizable (otros containers pueden usar mismo presentational)
- Claro dónde está la lógica

### 3. Server-Driven Security

**Nunca confiar en el cliente para seguridad**

```
Cliente → Request → Servidor
                    │
                    ├─ Validar autenticación
                    ├─ Validar permiso específico
                    ├─ Ejecutar lógica
                    └─ Retornar datos seguros
```

**Implementación**:

```typescript
// ✅ CORRECTO: Validar en servidor
export async function deleteUserAction(id: string) {
  const session = await getCurrentSession()

  // Verificar autenticación
  if (!session) throw new Error('Unauthorized')

  // Verificar permiso
  if (!session.user.permissions.includes('user:delete')) {
    throw new Error('Forbidden')
  }

  // Ejecutar acción segura
  return await db.user.delete({ where: { id } })
}
```

```typescript
// ❌ INCORRECTO: Validar en cliente
export function UserDeleteButton({ userId, canDelete }) {
  if (!canDelete) return null  // ← NO es seguro!

  return <button onClick={() => deleteUser(userId)} />
}
```

**Reglas**:
- Siempre validar permisos en servidor
- Nunca confiar en datos del cliente
- Encriptar datos sensibles en tránsito (HTTPS)
- Rate limiting en endpoints críticos

### 4. Unified Error Handling

**Respuesta uniforme para todas las acciones**

```typescript
// Tipo universal
interface ActionResponse<T> {
  success: boolean
  data?: T
  error?: string
  fieldErrors?: Record<string, string>  // Para validación
}
```

**Uso**:

```typescript
// Server Action
export async function createUserAction(input: unknown) {
  const parsed = userSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors
    }
  }

  try {
    const user = await db.user.create({ data: parsed.data })
    return { success: true, data: user }
  } catch (error) {
    return { success: false, error: 'Error creating user' }
  }
}
```

**Cliente**:

```typescript
const result = await createUserAction(formData)

if (result.success) {
  // Éxito
  router.push('/users')
} else if (result.fieldErrors) {
  // Errores de validación
  setFieldErrors(result.fieldErrors)
} else {
  // Error general
  toast.error(result.error)
}
```

### 5. Event-Driven Architecture

**Desacoplamiento mediante eventos**

```
Usuario registrado
       │
       ├─ Evento: USER_REGISTERED
       │
       ├─ Listener: Enviar email bienvenida
       ├─ Listener: Crear entrada en auditoría
       └─ Listener: Actualizar estadísticas
```

**Implementación**:

```typescript
// Emitir evento
import { eventBus } from '@/lib/events/event-bus'

await db.user.create({ data })
eventBus.emit('USER_REGISTERED', { userId, email })
```

```typescript
// Escuchar evento
eventBus.on('USER_REGISTERED', async ({ userId, email }) => {
  await sendWelcomeEmail(email)
})
```

**Ventajas**:
- Desacoplamiento: Email service no conoce de auth service
- Extensibilidad: Agregar listeners sin modificar código existente
- Testing: Listeners pueden testearse independientemente

### 6. Arquitectura de Capas (Layered Architecture)

```
┌──────────────────────────────────┐
│      Presentación (UI)           │ Components, Pages
│  Next.js Pages, React Components │
├──────────────────────────────────┤
│     Aplicación (Actions)         │ Server Actions
│  Lógica de negocio, Orquestación │ Validación con Zod
├──────────────────────────────────┤
│    Dominio (Services/Queries)    │ Business logic
│  Reglas de negocio específicas   │ Auditoría, Email
├──────────────────────────────────┤
│       Datos (Prisma)             │ ORM
│  Acceso a base de datos          │ Modelos
└──────────────────────────────────┘
```

---

## Estructura de Capas

### Capa de Presentación (Presentational Layer)

**Responsabilidad**: Mostrar UI al usuario

**Ubicación**: `app/` y `modules/*/components/presentational`

**Componentes**:
- Pages (app/admin/users/page.tsx)
- Layouts (app/layout.tsx)
- Components (modules/admin/components/)

**Características**:
- Server Components por defecto (Next.js 16)
- Client Components solo donde sea necesario ('use client')
- Props-driven
- Sin lógica de negocio

**Ejemplo**:

```typescript
// app/admin/users/page.tsx
import { UserListContainer } from '@/modules/admin/components/containers'

export default function UsersPage() {
  return <UserListContainer />
}
```

### Capa de Aplicación (Application Layer)

**Responsabilidad**: Orquestar acciones, validar entrada

**Ubicación**: `src/actions/` y `app/api/`

**Componentes**:
- Server Actions (async functions marked with 'use server')
- API Routes (app/api/*/route.ts)

**Características**:
- Ejecutan en servidor únicamente
- Validación con Zod
- Manejo de errores uniforme
- Respuestas tipadas (ActionResponse<T>)

**Ejemplo Server Action**:

```typescript
// src/actions/users.ts
'use server'

import { createUserSchema } from '@/modules/shared/validations'
import { db } from '@/lib/prisma/connection'

export async function createUserAction(input: unknown) {
  // 1. Validar entrada
  const parsed = createUserSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors
    }
  }

  // 2. Validar permisos (server)
  const session = await getCurrentSession()
  if (!session?.user?.permissions.includes('user:create')) {
    return { success: false, error: 'No autorizado' }
  }

  // 3. Ejecutar lógica
  const user = await createUserService(parsed.data)

  // 4. Retornar respuesta
  return { success: true, data: user }
}
```

### Capa de Dominio (Domain Layer)

**Responsabilidad**: Lógica de negocio específica

**Ubicación**: `src/modules/*/services` y `src/lib/`

**Componentes**:
- Services (audit-service.ts, email-service.ts)
- Helpers (audit-helpers.ts, permission-utils.ts)
- Queries (user-queries.ts, role-queries.ts)
- Listeners (event listeners)

**Características**:
- Lógica pura de negocio
- Sin dependencia de HTTP/REST
- Reutilizable
- Fácil de testear

**Ejemplo Service**:

```typescript
// src/modules/admin/services/audit-service.ts
export async function createAuditLog(params: CreateAuditLogParams) {
  const auditLog = await db.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      module: params.module,
      entityId: params.entityId,
      oldValues: params.oldValues,
      newValues: params.newValues,
      // ... más campos
    }
  })

  // Emitir evento
  eventBus.emit('AUDIT_LOG_CREATED', auditLog)

  return auditLog
}
```

### Capa de Datos (Data Layer)

**Responsabilidad**: Acceso a base de datos

**Ubicación**: `src/lib/prisma/` y `prisma/schema.prisma`

**Componentes**:
- Prisma Client (ORM)
- Schema (definiciones de modelos)
- Migrations (cambios de BD)

**Características**:
- Single Prisma Client instance
- Type-safe queries
- Migrations versionadas

**Ejemplo**:

```typescript
// src/lib/prisma/connection.ts
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const db = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db
}
```

---

## Módulos Principales

### Módulo Shared (Compartido)

**Propósito**: Código reutilizable entre todos los módulos

```
shared/
├── api/              # Queries y servicios compartidos
├── types/            # Tipos TypeScript compartidos
├── validations/      # Esquemas Zod
├── hooks/            # React hooks personalizados
├── utils/            # Funciones utilitarias
├── components/       # Componentes reutilizables
└── constants/        # Constantes (rutas, permisos, etc)
```

**Ejemplos**:
- `useAuth()` hook para acceder a sesión
- `LoginForm` componente compartido
- Validaciones de email, contraseña
- Tipos de sesión, usuario
- Constantes de API routes

**Regla**: Anything that's shared across modules lives here.

### Módulo Admin

**Propósito**: Panel administrativo de la aplicación

```
admin/
├── components/
│   ├── containers/   # Smart components conectados
│   └── presentational/  # UI components puros
├── services/         # Queries y helpers específicos admin
├── hooks/            # Hooks admin (use-audit-logs, etc)
├── types/            # Tipos específicos admin
├── utils/            # Helpers admin (permission-utils, etc)
└── layout/           # Layout del panel admin
```

**Funcionalidades**:
1. **Dashboard**: Panel principal con stats
2. **Gestión de Usuarios**: CRUD completo
3. **Gestión de Roles**: Roles y permisos
4. **Auditoría**: Visualización de logs
5. **Configuración**: Settings globales

**Flujo típico**:

```
User clicks "Create User"
       │
       ├─ Container: UserCreateContainer
       │           │
       │           └─ Calls: createUserAction()
       │
       ├─ Action validates: createUserSchema.parse()
       │
       ├─ Action checks: hasPermission('user:create')
       │
       ├─ Action executes: createUserService()
       │
       └─ Action emits: USER_CREATED event
```

### Módulo Public

**Propósito**: Funcionalidades públicas (sin autenticación)

```
public/
├── components/
│   ├── containers/
│   └── presentational/
├── services/
├── hooks/
├── types/
├── utils/
└── layout/
```

**Rutas públicas**:
- `/` - Página inicio
- `/auth/signin` - Login
- `/auth/register` - Registro
- `/auth/forgot-password` - Reset contraseña
- `/about` - Información

---

## Flujos de Datos

### Flujo de Autenticación

```
┌─────────────────────────────────────┐
│  User submits login form            │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  LoginForm (Client Component)       │
│  - Valida entrada (básico)          │
│  - Llama: loginAction()             │
└────────────────┬────────────────────┘
                 │ (Server Action)
                 ▼
┌─────────────────────────────────────┐
│  loginUserAction                    │
│  - Valida schema Zod                │
│  - Busca usuario en BD              │
│  - Compara hash de password         │
│  - Genera JWT token                 │
│  - Crea session en BD               │
│  - Emite USER_LOGGED_IN             │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  Listener: audit-listener           │
│  - Crea AuditLog                    │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  Cliente recibe token               │
│  - Almacena en localStorage         │
│  - Redirige a /admin/dashboard      │
└─────────────────────────────────────┘
```

### Flujo de Creación de Usuario

```
┌──────────────────────────────────────┐
│  Admin abre form de crear usuario    │
└────────────────┬─────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  UserCreateForm (Component)          │
│  - Form fields (email, name, etc)    │
│  - Llamada: createUserAction()       │
└────────────────┬─────────────────────┘
                 │ (Server Action)
                 ▼
┌──────────────────────────────────────┐
│  createUserAction                    │
│  1. Validar input (Zod)              │
│  2. Validar permisos (user:create)   │
│  3. Hash password (bcryptjs)         │
│  4. Crear en BD                      │
│  5. Emitir USER_CREATED              │
└────────────────┬─────────────────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
      ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│ email-listener   │  │ audit-listener   │
│                  │  │                  │
│ - Send welcome   │  │ - Log creation   │
│   email          │  │ - Who, what, when
└──────────────────┘  └──────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  Cliente recibe respuesta            │
│  - Toast de éxito                    │
│  - Actualiza lista de usuarios       │
└──────────────────────────────────────┘
```

### Flujo de Auditoría

```
Cualquier acción → audit-listener → Crea AuditLog

AuditLog campos:
├── id: UUID
├── userId: Quién hizo
├── action: Qué hizo (login, user_create, user_update, etc)
├── module: Módulo (auth, users, roles, etc)
├── area: Zona (admin, public, system)
├── entityId: Qué se modificó
├── oldValues: Valores antes
├── newValues: Valores después
├── ipAddress: IP del cliente
├── userAgent: Dispositivo/browser
├── requestId: Correlación de logs
└── timestamp: Cuándo
```

**Acceso a auditoría**:
- `/admin/audit` - Tabla con filtros
- Exportación a CSV/JSON
- Búsqueda de cambios

---

## Seguridad

### 1. Autenticación

**Tipo**: Hybrid JWT + Database Sessions

```
┌──────────────────────────────────────┐
│  Usuario login                       │
└────────────────┬─────────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │  Auth.js v5     │
        │  Credentials    │
        │  Provider       │
        └────────┬────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
      ▼                     ▼
   JWT Token          BD Session
   (Stateless)        (Traceable)
   ├─ Expedido por    ├─ sessionToken
   │  servidor        ├─ ipAddress
   ├─ Contiene        ├─ userAgent
   │  claims (perms)  ├─ createdAt
   ├─ Firmado         ├─ expiresAt
   ├─ Expira en       └─ userId
   │  15 min
   └─ Renovable
```

**Validación en cada request**:
```typescript
// Server Action
const session = await getCurrentSession()
if (!session) return { error: 'Unauthorized' }
if (!session.user.permissions.includes('action:do')) {
  return { error: 'Forbidden' }
}
```

### 2. Control de Acceso (RBAC)

**Modelo**:
```
User → [many-to-many] → Role → [many-to-many] → Permission
```

**Ejemplo**:
```
Admin User
├─ has Role "Administrator"
│  └─ has Permissions:
│     ├─ user:create
│     ├─ user:read
│     ├─ user:update
│     ├─ user:delete
│     ├─ role:create
│     └─ role:update
│
└─ has Role "Auditor"
   └─ has Permission:
      └─ audit:read
```

**Validación**:

```typescript
// En middleware
export const authMiddleware = async (req) => {
  const session = await getCurrentSession()

  const requiredPermission = getRequiredPermission(req.path)
  const hasPermission = session.user.permissions.includes(
    requiredPermission
  )

  if (!hasPermission) {
    return new Response('Forbidden', { status: 403 })
  }
}
```

### 3. Validación de Entrada

**Herramienta**: Zod

```typescript
// Todos los inputs validados
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8).regex(/[A-Z]/).regex(/[0-9]/).regex(/[!@#$]/),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100)
})

// Uso:
const result = createUserSchema.safeParse(input)
if (!result.success) {
  return { fieldErrors: result.error.flatten().fieldErrors }
}
```

### 4. Protección de Datos

**En tránsito**: HTTPS (TLS 1.3+)
**En reposo**: PostgreSQL (encryption at rest)
**Contraseñas**: bcryptjs (rounds: 12)
**Tokens**: HMAC-SHA256

**Ejemplo hash**:
```typescript
import bcrypt from 'bcryptjs'

// Hash: ~100ms
const hashed = await bcrypt.hash(password, 12)

// Comparar: ~100ms (timing-safe)
const isValid = await bcrypt.compare(password, hashed)
```

### 5. Rate Limiting

```typescript
// Por IP en API endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 100                     // 100 requests
})

app.use('/api/', limiter)
```

### 6. Auditoría Automática

**Qué se audita**:
- Autenticación (login, logout, reset password)
- Gestión de usuarios (create, update, delete)
- Gestión de roles y permisos
- Cambios de configuración

**Información registrada**:
- Usuario que hizo la acción
- Acción específica
- Timestamp exacto
- IP y dispositivo
- Request ID para correlación
- Valores antes y después (para updates)

---

## Rendimiento

### 1. Caché de Menú Dinámico

**Problema**: BD query en cada request para menú

**Solución**: Caché en memoria invalidable

```typescript
// src/lib/menu/menu-cache.ts
class MenuCache {
  private cache = new Map<string, MenuItem[]>()

  async getMenu(userId: string) {
    // 1. Verificar caché
    if (this.cache.has(userId)) {
      return this.cache.get(userId)
    }

    // 2. Si no existe, traer de BD
    const menu = await db.menuItem.findMany({
      where: { users: { some: { id: userId } } }
    })

    // 3. Guardar en caché
    this.cache.set(userId, menu)

    // 4. Invalidar tras 1 hora
    setTimeout(() => this.cache.delete(userId), 60 * 60 * 1000)

    return menu
  }

  invalidate(userId: string) {
    this.cache.delete(userId)
  }
}
```

### 2. Optimización de Queries

**Lazy loading de relaciones**:

```typescript
// ❌ Ineficiente: N+1 problem
const users = await db.user.findMany()
for (const user of users) {
  const roles = await db.role.findMany({
    where: { users: { some: { id: user.id } } }
  })
}

// ✅ Eficiente: Include relaciones
const users = await db.user.findMany({
  include: {
    roles: {
      include: { permissions: true }
    },
    sessions: { take: 5 }
  }
})
```

### 3. Streaming de Responses

**Para grandes datasets**:

```typescript
// app/api/admin/audit/route.ts
export async function GET(req: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      const cursor = await db.auditLog.findMany({
        take: 1000,
        skip: 0,
        orderBy: { timestamp: 'desc' }
      })

      cursor.forEach(log => {
        controller.enqueue(`${JSON.stringify(log)}\n`)
      })

      controller.close()
    }
  })

  return new Response(stream)
}
```

### 4. Image Optimization

**Usar Next.js Image**:

```typescript
import Image from 'next/image'

// ✅ Optimizado automáticamente
<Image
  src={user.avatar}
  alt={user.name}
  width={40}
  height={40}
  quality={75}
  priority={false}
/>
```

### 5. Code Splitting

**Automatic en Next.js**:
- Cada ruta es un chunk separado
- Componentes lazy-loadeable con `dynamic()`

```typescript
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(
  () => import('@/components/heavy-chart'),
  { loading: () => <Skeleton /> }
)
```

---

## Escalabilidad

### 1. Arquitectura Stateless

**Beneficio**: Escalar horizontalmente (múltiples instancias)

```
  Client Request
      │
      ▼
  ┌─────────┬─────────┬─────────┐
  │ Instance│ Instance│ Instance│
  │   #1    │   #2    │   #3    │
  └────┬────┴────┬────┴────┬────┘
       │         │         │
       └─────────┴────┬────┘
                      │
                      ▼
             Shared Database
                (PostgreSQL)
```

**Ninguna instancia mantiene estado**:
- Sessions guardadas en BD, no en memoria
- JWT tokens verificados por algoritmo, no en cache
- Caché de menú se invalida automáticamente

### 2. Database Scaling

**Índices**:
```sql
-- Índice en frecuentes búsquedas
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_session_token ON "Session"("sessionToken");
CREATE INDEX idx_audit_user_date ON "AuditLog"("userId", "timestamp");
```

**Particionamiento** (si crece mucho):
```sql
-- Particionar auditoría por fecha
PARTITION BY RANGE (YEAR(timestamp))
```

**Read Replicas**:
```
Write: Primary Database
 ├─ Read Replica #1
 ├─ Read Replica #2
 └─ Read Replica #3
```

### 3. Event Queue para Operaciones Pesadas

**Para no bloquear request**:

```typescript
// ✅ Mejorado: Enviar email en background
export async function registerUserAction(input) {
  const user = await createUser(input)

  // En vez de: await sendWelcomeEmail(user.email)
  // Poner en cola asíncrona:
  eventBus.emit('USER_REGISTERED', { userId: user.id, email: user.email })

  // El listener procesa en background
  return { success: true }
}
```

### 4. Monitor y Logs Centralizados

```typescript
// Pino logs se envían a:
// - Stdout (stdout + búsqueda en logs)
// - Archivo local (./logs/)
// - Servicios externos (DataDog, ELK, Loki, etc)

logger.info('User created', {
  userId: user.id,
  email: user.email,
  timestamp: new Date(),
  requestId: req.id
})
```

### 5. CDN para Assets Estáticos

```typescript
// Next.js detecta y comprime automáticamente
// Imágenes se optimizan en build time
// CSS/JS se minifican y tree-shake automático
```

---

## Decisiones de Diseño

### Por qué Next.js 16?

- **SSR built-in**: Mejor SEO y performance
- **Server Components**: Reducir JS en cliente
- **Server Actions**: Simplificar comunicación servidor
- **API Routes**: Backend integrado
- **Middleware**: Validación centralizada
- **Incrementalidad**: Adoptar features progresivamente

### Por qué TypeScript Strict?

- **Type Safety**: Detectar errores en compilación
- **DX**: Autocomplete y refactoring seguro
- **Documentación**: Types sirven como documentación

### Por qué Auth.js?

- **Flexible**: Soporta múltiples estrategias
- **Secure**: Maneja tokens de forma segura
- **Modern**: Soporta OAuth2, OIDC
- **Sessions**: Manage automático

### Por qué Prisma?

- **Type Safety**: Genera tipos automáticamente
- **DX**: Schema clara y migraciones automáticas
- **Performance**: Query optimization
- **Relations**: Fácil manejar relaciones

### Por qué Zod?

- **Type Safety**: Validación en runtime + tipos TS
- **Error Messages**: Mensajes de error claros
- **Composable**: Schemas se pueden composición

---

**Versión**: 1.0.0 Estable
**Última actualización**: Diciembre 2025
