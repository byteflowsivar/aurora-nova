# Sistema RBAC de Permisos - Aurora Nova

**Última actualización**: 2025-10-31
**Estado**: ✅ Implementado (T012)
**Autor**: Claude Code

---

## 📋 Tabla de Contenidos

1. [Resumen](#resumen)
2. [Arquitectura](#arquitectura)
3. [Conceptos Clave](#conceptos-clave)
4. [Esquema de Base de Datos](#esquema-de-base-de-datos)
5. [Capas del Sistema](#capas-del-sistema)
6. [Uso - Database Queries](#uso---database-queries)
7. [Uso - Server-Side Utils](#uso---server-side-utils)
8. [Uso - Client Hooks](#uso---client-hooks)
9. [Uso - UI Components](#uso---ui-components)
10. [Uso - Server Actions](#uso---server-actions)
11. [Uso - Middleware](#uso---middleware)
12. [Ejemplos Completos](#ejemplos-completos)
13. [Mejores Prácticas](#mejores-prácticas)
14. [Consideraciones de Seguridad](#consideraciones-de-seguridad)

---

## Resumen

Aurora Nova implementa un sistema completo de **Control de Acceso Basado en Roles (RBAC)** que permite:

- ✅ Gestión granular de permisos a nivel de módulo y acción
- ✅ Roles flexibles con múltiples permisos
- ✅ Usuarios con múltiples roles
- ✅ Verificación de permisos en servidor y cliente
- ✅ Componentes React declarativos para control de UI
- ✅ Middleware con lógica AND/OR para protección de rutas
- ✅ Server actions protegidas con decoradores
- ✅ Type-safety completo con TypeScript

---

## Arquitectura

### Diagrama del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE USUARIO                          │
│  • UI Components (Client)                                    │
│  • React Hooks                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│               CAPA DE APLICACIÓN                            │
│  • Server Actions                                           │
│  • Server Components                                        │
│  • Middleware (Next.js)                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                CAPA DE LÓGICA                               │
│  • Permission Utils (hasPermission, etc.)                   │
│  • Authorization Helpers (requirePermission, etc.)          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              CAPA DE DATOS                                  │
│  • Prisma Queries (getUserPermissions, etc.)                │
│  • PostgreSQL Database                                      │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Verificación

```
1. Usuario solicita recurso
         ↓
2. Middleware verifica autenticación (JWT)
         ↓
3. Middleware verifica permisos para la ruta (opcional)
         ↓
4. Server Action/Component verifica permisos específicos
         ↓
5. Queries a BD obtienen permisos del usuario
         ↓
6. Verificación lógica (AND/OR)
         ↓
7. Acceso concedido o denegado
```

---

## Conceptos Clave

### Permisos (Permissions)

Los permisos siguen el formato **`module:action`**:

- **`module`**: Área funcional del sistema (user, role, permission, system)
- **`action`**: Operación permitida (create, read, update, delete, list, manage)

Ejemplos:
- `user:create` - Crear usuarios
- `user:update` - Actualizar usuarios
- `role:manage` - Gestionar roles completamente
- `system:admin` - Acceso total al sistema

### Roles (Roles)

Los roles agrupan permisos y se asignan a usuarios:

```typescript
interface Role {
  id: string
  name: string        // Ej: "Admin", "Editor", "Viewer"
  description: string | null
  permissions: string[]  // Array de permission IDs
}
```

### Usuarios (Users)

Los usuarios pueden tener múltiples roles:

```typescript
// Un usuario puede ser:
// - "Admin" → [system:admin, user:manage, role:manage, ...]
// - "Editor" → [user:read, user:update, role:read, ...]
// - Ambos roles simultáneamente (permisos combinados)
```

### Lógica AND vs OR

El sistema soporta dos modos de verificación:

**AND (requireAll: true)**
```typescript
// Usuario DEBE tener AMBOS permisos
['user:update', 'role:assign'] // → Puede editar usuarios Y asignar roles
```

**OR (requireAll: false)**
```typescript
// Usuario DEBE tener AL MENOS UNO
['user:create', 'user:update'] // → Puede crear O editar usuarios
```

---

## Esquema de Base de Datos

### Tablas Principales

```sql
-- Permisos del sistema
CREATE TABLE "permission" (
    "id" TEXT PRIMARY KEY,           -- Semantic ID: 'user:create'
    "module" TEXT NOT NULL,          -- 'user', 'role', 'system'
    "description" TEXT
);

-- Roles
CREATE TABLE "role" (
    "id" UUID PRIMARY KEY DEFAULT uuidv7(),
    "name" TEXT UNIQUE NOT NULL,
    "description" TEXT
);

-- Relación Rol ↔ Permiso
CREATE TABLE "role_permission" (
    "role_id" UUID NOT NULL REFERENCES "role"(id) ON DELETE CASCADE,
    "permission_id" TEXT NOT NULL REFERENCES "permission"(id) ON DELETE CASCADE,
    PRIMARY KEY ("role_id", "permission_id")
);

-- Relación Usuario ↔ Rol
CREATE TABLE "user_role" (
    "user_id" UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "role_id" UUID NOT NULL REFERENCES "role"(id) ON DELETE CASCADE,
    "created_by" UUID REFERENCES "user"(id),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("user_id", "role_id")
);
```

### Consulta de Permisos

```sql
-- Obtener todos los permisos de un usuario
SELECT DISTINCT rp."permission_id"
FROM "role_permission" rp
INNER JOIN "user_role" ur ON ur."role_id" = rp."role_id"
WHERE ur."user_id" = $1;
```

---

## Capas del Sistema

### 1. Database Layer (Prisma Queries)
- **Ubicación**: `src/lib/prisma/permission-queries.ts`
- **Propósito**: Queries optimizadas a PostgreSQL
- **Funciones**: 15+ funciones para CRUD de permisos

### 2. Business Logic Layer (Utils)
- **Ubicación**: `src/lib/utils/permission-utils.ts`
- **Propósito**: Lógica de verificación reutilizable
- **Funciones**: Server (async) y Client (sync) helpers

### 3. Authorization Layer (Server Helpers)
- **Ubicación**: `src/lib/server/require-permission.ts`
- **Propósito**: Enforcing de permisos con errores
- **Funciones**: requirePermission, withPermission, etc.

### 4. Presentation Layer (Hooks & Components)
- **Hooks**: `src/lib/hooks/use-permissions.ts`
- **Components**: `src/components/auth/permission-gate.tsx`
- **Propósito**: UI reactivo basado en permisos

### 5. Routing Layer (Middleware)
- **Ubicación**: `src/middleware.ts`
- **Propósito**: Protección de rutas con configuración granular
- **Features**: AND/OR logic, dynamic routes, debugging

---

## Uso - Database Queries

### Archivo: `src/lib/prisma/permission-queries.ts`

```typescript
import {
  getUserPermissions,
  userHasPermission,
  userHasAnyPermission,
  userHasAllPermissions,
  getUserPermissionsDetailed,
  getUserRolesWithPermissions,
  getAllPermissions,
  getPermissionsByModule,
  permissionExists
} from '@/lib/prisma/permission-queries'

// Obtener permisos de usuario (array de IDs)
const permissions = await getUserPermissions(userId)
// → ['user:create', 'user:read', 'role:list']

// Verificar un permiso
const canCreate = await userHasPermission(userId, 'user:create')
// → true | false

// Verificar múltiples (OR)
const canManage = await userHasAnyPermission(userId, [
  'user:create',
  'user:update'
])
// → true si tiene al menos uno

// Verificar múltiples (AND)
const result = await userHasAllPermissions(userId, [
  'user:update',
  'role:assign'
])
// → { hasPermission: boolean, missingPermissions?: string[] }

// Obtener permisos con detalles
const detailed = await getUserPermissionsDetailed(userId)
// → [{ id: 'user:create', module: 'user', description: '...' }]

// Obtener roles con permisos
const roles = await getUserRolesWithPermissions(userId)
// → [{ id, name, description, permissions: [...] }]

// Catálogo de permisos
const allPerms = await getAllPermissions()
const userPerms = await getPermissionsByModule('user')

// Verificar existencia
const exists = await permissionExists('user:create')
```

---

## Uso - Server-Side Utils

### Archivo: `src/lib/utils/permission-utils.ts`

```typescript
import {
  hasPermission,
  hasPermissions,
  hasAnyPermission,
  hasAllPermissions,
  getPermissions,
  // Client-side helpers (para cuando ya tienes los permisos)
  checkPermission,
  checkAnyPermission,
  checkAllPermissions
} from '@/lib/utils/permission-utils'

// ========================================
// SERVER-SIDE (async, consulta BD)
// ========================================

// Verificar un permiso
const canCreate = await hasPermission(userId, 'user:create')

// Verificar múltiples con opciones
const result = await hasPermissions(
  userId,
  ['user:create', 'user:update'],
  { requireAll: false }  // OR por defecto: true (AND)
)

// Shortcuts
const canManage = await hasAnyPermission(userId, ['user:create', 'user:update'])
const fullResult = await hasAllPermissions(userId, ['user:update', 'role:assign'])

// Obtener permisos
const perms = await getPermissions(userId)

// ========================================
// CLIENT-SIDE (sync, usa permisos cached)
// ========================================

const userPermissions = ['user:create', 'user:read', 'role:list']

// Verificar un permiso
const canCreate = checkPermission(userPermissions, 'user:create')

// Verificar múltiples (OR)
const canManage = checkAnyPermission(userPermissions, [
  'user:create',
  'user:update'
])

// Verificar múltiples (AND)
const result = checkAllPermissions(userPermissions, [
  'user:create',
  'user:update'
])
// → { hasPermission: boolean, missingPermissions?: string[] }
```

---

## Uso - Client Hooks

### Archivo: `src/lib/hooks/use-permissions.ts`

```typescript
'use client'

import {
  useUserPermissions,
  usePermission,
  useAnyPermission,
  useAllPermissions,
  usePermissions,
  useIsAdmin,
  useCurrentUser
} from '@/lib/hooks/use-permissions'

function MyComponent() {
  // Obtener permisos del usuario desde sesión
  const permissions = useUserPermissions()
  // → string[] | undefined (undefined durante carga)

  // Verificar un permiso
  const canCreate = usePermission('user:create')
  // → boolean | undefined

  // Verificar múltiples (OR)
  const canManage = useAnyPermission(['user:create', 'user:update'])
  // → boolean | undefined

  // Verificar múltiples (AND) con detalles
  const result = useAllPermissions(['user:update', 'role:assign'])
  // → PermissionCheckResult | undefined
  // { hasPermission: boolean, missingPermissions?: string[] }

  // Flexible (soporta AND y OR)
  const resultAny = usePermissions(['user:create', 'user:update'], false)
  const resultAll = usePermissions(['user:update', 'role:assign'], true)

  // Shortcut para admin
  const isAdmin = useIsAdmin()
  // → boolean | undefined

  // Info completa del usuario
  const { userId, permissions, isLoading, isAuthenticated } = useCurrentUser()

  // Renderizado condicional
  if (canCreate === undefined) return <Skeleton />
  if (!canCreate) return <AccessDenied />

  return <CreateUserButton />
}
```

---

## Uso - UI Components

### Archivo: `src/components/auth/permission-gate.tsx`

```typescript
'use client'

import {
  PermissionGate,
  RequireAnyPermission,
  RequireAllPermissions,
  ProtectedComponent,
  AdminOnly,
  InversePermissionGate
} from '@/components/auth'

function MyPage() {
  return (
    <>
      {/* Gate básico - un solo permiso */}
      <PermissionGate permission="user:create">
        <CreateUserButton />
      </PermissionGate>

      {/* Con fallback y unauthorized */}
      <PermissionGate
        permission="user:delete"
        fallback={<Skeleton />}
        unauthorized={<Alert>No tienes permiso</Alert>}
      >
        <DeleteButton />
      </PermissionGate>

      {/* Requiere AL MENOS UNO (OR) */}
      <RequireAnyPermission permissions={['user:create', 'user:update']}>
        <UserManagementPanel />
      </RequireAnyPermission>

      {/* Requiere TODOS (AND) */}
      <RequireAllPermissions permissions={['user:update', 'role:assign']}>
        <AdvancedUserEditor />
      </RequireAllPermissions>

      {/* Con mensaje de permisos faltantes */}
      <RequireAllPermissions
        permissions={['user:create', 'user:update', 'user:delete']}
        showMissingPermissions
      >
        <FullUserManagement />
      </RequireAllPermissions>

      {/* Componente flexible */}
      <ProtectedComponent
        permissions={['user:create', 'user:update']}
        mode="any"  // 'any' | 'all'
        fallback={<Skeleton />}
        unauthorized={<AccessDenied />}
      >
        <UserForm />
      </ProtectedComponent>

      {/* Shortcut para admin */}
      <AdminOnly unauthorized={<Alert>Solo administradores</Alert>}>
        <SystemConfigPanel />
      </AdminOnly>

      {/* Gate inverso - mostrar si NO tiene permiso */}
      <InversePermissionGate permission="premium:access">
        <UpgradeBanner />
      </InversePermissionGate>
    </>
  )
}
```

---

## Uso - Server Actions

### Archivo: `src/lib/server/require-permission.ts`

```typescript
import {
  requireAuth,
  getCurrentUserId,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireAdmin,
  withPermission,
  withAuth,
  withAdmin,
  PermissionDeniedError,
  UnauthenticatedError
} from '@/lib/server'

// ========================================
// 1. Verificación manual con errores
// ========================================

export async function createUser(data: CreateUserInput) {
  // Lanza error si no autenticado o sin permiso
  const userId = await requirePermission('user:create')

  // Usuario autenticado y con permiso, continuar...
  const user = await prisma.user.create({ data })
  return successResponse(user)
}

export async function manageUser(id: string, data: UpdateUserInput) {
  // Requiere AL MENOS UNO (OR)
  await requireAnyPermission(['user:create', 'user:update'])

  // ...
}

export async function advancedOperation() {
  // Requiere TODOS (AND)
  await requireAllPermissions(['user:update', 'role:assign'])

  // ...
}

export async function dangerousSystemOp() {
  // Shortcut para admin
  await requireAdmin()

  // ...
}

// ========================================
// 2. HOFs (Higher-Order Functions)
// ========================================

// Envolver server action con verificación automática
export const createUser = withPermission(
  ['user:create'],
  async (data: CreateUserInput) => {
    // Esta función solo se ejecuta si tiene el permiso
    const user = await prisma.user.create({ data })
    return successResponse(user)
  }
)

// Múltiples permisos (AND por defecto)
export const dangerousAction = withPermission(
  ['user:delete', 'system:admin'],
  async (userId: string) => {
    await deleteUser(userId)
    return successResponse()
  }
)

// Múltiples permisos (OR)
export const manageAction = withPermission(
  ['user:create', 'user:update'],
  async (data: any) => {
    // ...
  },
  { requireAll: false }  // OR
)

// Solo requiere autenticación (no permisos específicos)
export const getUserProfile = withAuth(async (userId: string) => {
  const profile = await prisma.user.findUnique({ where: { id: userId } })
  return successResponse(profile)
})

// Shortcut para admin
export const systemConfig = withAdmin(async (config: SystemConfig) => {
  await updateSystemConfig(config)
  return successResponse()
})

// ========================================
// 3. Manejo de errores
// ========================================

try {
  await requirePermission('user:delete')
} catch (error) {
  if (error instanceof PermissionDeniedError) {
    console.error('Permisos faltantes:', error.missingPermissions)
    console.error('Permisos requeridos:', error.requiredPermissions)
  }

  if (error instanceof UnauthenticatedError) {
    console.error('Usuario no autenticado')
  }
}
```

---

## Uso - Middleware

### Archivo: `src/middleware.ts`

```typescript
// Configuración de permisos por ruta
const permissionRoutes: Record<string, RoutePermissionConfig> = {
  // Rutas específicas primero (más específica = mayor prioridad)
  '/users/create': {
    permissions: ['user:create'],
    mode: 'any',
  },
  '/users/[id]/edit': {
    permissions: ['user:update'],
    mode: 'any',
  },
  '/users': {
    permissions: ['user:list', 'user:read'],
    mode: 'any',  // Puede listar O leer
  },

  // Rutas de roles
  '/roles/[id]/permissions': {
    permissions: ['role:update', 'permission:manage'],
    mode: 'all',  // Requiere AMBOS permisos
  },
  '/roles': {
    permissions: ['role:list', 'role:read'],
    mode: 'any',
  },

  // Rutas admin
  '/admin/system': {
    permissions: ['system:admin', 'system:config'],
    mode: 'all',  // Requiere AMBOS
  },
  '/admin': {
    permissions: ['system:admin', 'user:manage', 'role:manage'],
    mode: 'any',  // Cualquier permiso de gestión
  },
}

// El middleware automáticamente:
// 1. Valida autenticación (JWT)
// 2. Valida sesión en BD (opcional, para rutas sensibles)
// 3. Verifica permisos con lógica AND/OR
// 4. Soporta rutas dinámicas como /users/[id]/edit
// 5. Redirecciona a /auth/error con información de error
```

**Features del Middleware:**

- ✅ Soporta rutas dinámicas: `/users/[id]/edit`, `/roles/[...slug]`
- ✅ Lógica AND/OR por ruta
- ✅ Validación híbrida (JWT + BD opcional)
- ✅ Debugging en desarrollo (muestra permisos faltantes en URL)
- ✅ Ordenamiento por especificidad (más específica primero)

---

## Ejemplos Completos

### Ejemplo 1: Gestión de Usuarios

```typescript
// ========================================
// SERVER ACTIONS
// ========================================
'use server'

import { requirePermission, withPermission } from '@/lib/server'
import { SYSTEM_PERMISSIONS } from '@/lib/types/permissions'

// Opción 1: Verificación manual
export async function createUser(data: CreateUserInput) {
  await requirePermission(SYSTEM_PERMISSIONS.USER_CREATE)

  const user = await prisma.user.create({ data })
  return successResponse(user)
}

// Opción 2: HOF (recomendado)
export const updateUser = withPermission(
  [SYSTEM_PERMISSIONS.USER_UPDATE],
  async (id: string, data: UpdateUserInput) => {
    const user = await prisma.user.update({ where: { id }, data })
    return successResponse(user)
  }
)

export const deleteUser = withPermission(
  [SYSTEM_PERMISSIONS.USER_DELETE],
  async (id: string) => {
    await prisma.user.delete({ where: { id } })
    return successResponse()
  }
)

// ========================================
// SERVER COMPONENT
// ========================================
import { requirePermission } from '@/lib/server'

export default async function UsersPage() {
  // Verificar permiso en server component
  await requirePermission('user:list')

  const users = await prisma.user.findMany()

  return (
    <div>
      <h1>Usuarios</h1>
      <UsersList users={users} />

      {/* Botones protegidos por permisos */}
      <ProtectedCreateButton />
    </div>
  )
}

// ========================================
// CLIENT COMPONENT
// ========================================
'use client'

import { usePermission } from '@/lib/hooks/use-permissions'
import { PermissionGate } from '@/components/auth'

function ProtectedCreateButton() {
  const canCreate = usePermission('user:create')

  if (canCreate === undefined) return <Skeleton />
  if (!canCreate) return null

  return <Button onClick={handleCreate}>Crear Usuario</Button>
}

// O más declarativo:
function UserManagementPanel() {
  return (
    <>
      <PermissionGate
        permission="user:create"
        fallback={<Skeleton />}
      >
        <CreateUserButton />
      </PermissionGate>

      <PermissionGate permission="user:update">
        <EditUserButton />
      </PermissionGate>

      <PermissionGate
        permission="user:delete"
        unauthorized={<Alert>Solo admins pueden eliminar</Alert>}
      >
        <DeleteUserButton />
      </PermissionGate>
    </>
  )
}
```

### Ejemplo 2: Editor Avanzado (Múltiples Permisos)

```typescript
// Server Action requiere AMBOS permisos
export const assignRoleToUser = withPermission(
  ['user:update', 'role:assign'],
  async (userId: string, roleId: string) => {
    await prisma.userRole.create({
      data: { userId, roleId }
    })
    return successResponse()
  }
  // mode 'all' por defecto
)

// Client Component
'use client'

function AdvancedUserEditor({ userId }: { userId: string }) {
  const result = useAllPermissions(['user:update', 'role:assign'])

  if (!result) return <Skeleton />

  if (!result.hasPermission) {
    return (
      <Alert severity="error">
        Permisos insuficientes. Faltan:
        {result.missingPermissions?.join(', ')}
      </Alert>
    )
  }

  return (
    <div>
      <UserBasicInfo userId={userId} />
      <RoleAssignment userId={userId} />  {/* Solo visible con ambos permisos */}
    </div>
  )
}

// O declarativo:
function AdvancedUserEditorDeclarative() {
  return (
    <RequireAllPermissions
      permissions={['user:update', 'role:assign']}
      showMissingPermissions  // Muestra permisos faltantes automáticamente
    >
      <AdvancedEditor />
    </RequireAllPermissions>
  )
}
```

### Ejemplo 3: Dashboard Multi-Rol

```typescript
'use client'

import {
  RequireAnyPermission,
  PermissionGate,
  AdminOnly
} from '@/components/auth'

export default function Dashboard() {
  return (
    <div className="dashboard">
      {/* Visible para cualquier permiso de gestión */}
      <RequireAnyPermission
        permissions={['user:manage', 'role:manage', 'system:admin']}
      >
        <ManagementPanel />
      </RequireAnyPermission>

      {/* Visible solo para admins */}
      <AdminOnly>
        <SystemStats />
      </AdminOnly>

      {/* Visible para gestores de usuarios */}
      <PermissionGate permission="user:manage">
        <UserActivityLog />
      </PermissionGate>

      {/* Visible para gestores de roles */}
      <PermissionGate permission="role:manage">
        <RoleManagement />
      </PermissionGate>
    </div>
  )
}
```

---

## Mejores Prácticas

### 1. Usar Constants para Permisos

```typescript
// ✅ BUENO
import { SYSTEM_PERMISSIONS } from '@/lib/types/permissions'

await requirePermission(SYSTEM_PERMISSIONS.USER_CREATE)

// ❌ MALO (typos, sin autocompletado)
await requirePermission('user:create')
```

### 2. Verificar Permisos en Múltiples Capas

```typescript
// Capa 1: Middleware (protección de ruta)
// → /users/create requiere 'user:create'

// Capa 2: Server Action (lógica de negocio)
export const createUser = withPermission(['user:create'], async (data) => {
  // ...
})

// Capa 3: UI (experiencia de usuario)
<PermissionGate permission="user:create">
  <CreateUserButton />
</PermissionGate>
```

**Razón**: Defensa en profundidad (defense in depth)

### 3. Usar HOFs para Server Actions

```typescript
// ✅ BUENO (declarativo, reutilizable)
export const createUser = withPermission(
  ['user:create'],
  async (data) => { /* ... */ }
)

// ❌ MALO (imperativo, verbose)
export async function createUser(data) {
  await requirePermission('user:create')
  // ...
}
```

### 4. Componentes Declarativos en UI

```typescript
// ✅ BUENO (legible, mantenible)
<PermissionGate permission="user:create">
  <CreateButton />
</PermissionGate>

// ❌ MALO (imperativo, verbose)
function MyComponent() {
  const canCreate = usePermission('user:create')
  if (canCreate === undefined) return <Skeleton />
  if (!canCreate) return null
  return <CreateButton />
}
```

### 5. Granularidad Apropiada

```typescript
// ✅ BUENO (permisos granulares)
'user:create'
'user:read'
'user:update'
'user:delete'

// ❌ MALO (muy general)
'user:manage'  // ¿Qué puede hacer exactamente?
```

**Razón**: Permite mayor control y flexibilidad

### 6. Nombrar Permisos Consistentemente

```typescript
// ✅ BUENO (patrón consistente)
'user:create'
'role:create'
'permission:create'

// ❌ MALO (inconsistente)
'createUser'
'new_role'
'permission.add'
```

### 7. Cachear Permisos en Cliente

```typescript
// ✅ BUENO (usa hooks que cachean)
const canCreate = usePermission('user:create')
const canUpdate = usePermission('user:update')

// ❌ MALO (múltiples fetches)
const canCreate = await hasPermission(userId, 'user:create')
const canUpdate = await hasPermission(userId, 'user:update')
```

**Razón**: Los hooks obtienen permisos de la sesión (ya cacheada)

---

## Consideraciones de Seguridad

### 1. Nunca confiar solo en el Cliente

```typescript
// ❌ INSEGURO
'use client'
function DeleteButton({ userId }) {
  const canDelete = usePermission('user:delete')

  // El usuario puede manipular esto en devtools!
  if (!canDelete) return null

  return <Button onClick={() => deleteUserDirect(userId)}>Delete</Button>
}

// ✅ SEGURO
'use client'
function DeleteButton({ userId }) {
  const canDelete = usePermission('user:delete')
  if (!canDelete) return null  // Solo UX, no seguridad

  return <Button onClick={() => deleteUserServerAction(userId)}>Delete</Button>
}

// Server Action (verificación real)
export const deleteUserServerAction = withPermission(
  ['user:delete'],
  async (userId: string) => {
    await prisma.user.delete({ where: { id: userId } })
    return successResponse()
  }
)
```

### 2. Validar Permisos en TODAS las Server Actions

```typescript
// ❌ INSEGURO (no verifica permisos)
export async function deleteUser(id: string) {
  await prisma.user.delete({ where: { id } })
}

// ✅ SEGURO
export const deleteUser = withPermission(
  ['user:delete'],
  async (id: string) => {
    await prisma.user.delete({ where: { id } })
  }
)
```

### 3. Usar Validación Híbrida para Rutas Sensibles

```typescript
// middleware.ts
const strictValidationRoutes = [
  '/admin',
  '/users',
  '/roles',
  '/settings/security',
  '/settings/password',
]

// Estas rutas verifican:
// 1. JWT válido (rápido)
// 2. Sesión existe en BD (estricto)
// 3. Permisos correctos (granular)
```

**Razón**: Evita acceso con JWT válido pero sesión invalidada

### 4. No exponer IDs de Permisos Sensibles

```typescript
// ❌ MALO
<div data-permissions="system:admin,user:delete">
  Área administrativa
</div>

// ✅ BUENO
<PermissionGate permission="system:admin">
  <AdminArea />
</PermissionGate>
```

### 5. Logging de Accesos Denegados

```typescript
export async function requirePermission(permission: string) {
  const userId = await requireAuth()
  const has = await hasPermission(userId, permission)

  if (!has) {
    // Log intento de acceso denegado
    await auditLog({
      userId,
      action: 'PERMISSION_DENIED',
      permission,
      timestamp: new Date()
    })

    throw new PermissionDeniedError([permission])
  }

  return userId
}
```

### 6. Rotación de Permisos en Cambios Sensibles

```typescript
// Al cambiar contraseña, invalidar TODAS las sesiones
export async function changePassword(userId: string, newPassword: string) {
  await requirePermission('user:update')

  // Actualizar contraseña
  await updateUserPassword(userId, newPassword)

  // Invalidar todas las sesiones
  await deleteAllUserSessions(userId)

  return successResponse()
}
```

---

## Testing del Sistema de Permisos

### Tests Unitarios

```typescript
// Ejemplo: Verificar queries
describe('getUserPermissions', () => {
  it('debe retornar permisos de usuario con múltiples roles', async () => {
    const permissions = await getUserPermissions(testUserId)

    expect(permissions).toContain('user:create')
    expect(permissions).toContain('role:read')
    expect(permissions).toHaveLength(5)
  })
})

// Ejemplo: Verificar lógica AND
describe('checkAllPermissions', () => {
  it('debe retornar false si falta un permiso', () => {
    const userPerms = ['user:create', 'user:read']
    const result = checkAllPermissions(userPerms, [
      'user:create',
      'user:delete'  // ¡No tiene este!
    ])

    expect(result.hasPermission).toBe(false)
    expect(result.missingPermissions).toEqual(['user:delete'])
  })
})
```

### Tests de Integración

```typescript
// Ejemplo: Verificar server action protegida
describe('createUser server action', () => {
  it('debe denegar acceso sin permiso', async () => {
    // Usuario sin 'user:create'
    await expect(createUser(testData)).rejects.toThrow(PermissionDeniedError)
  })

  it('debe permitir crear con permiso', async () => {
    // Usuario con 'user:create'
    const result = await createUser(testData)

    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('id')
  })
})
```

### Tests E2E

```typescript
// Ejemplo: Verificar middleware protege ruta
test('usuario sin permiso no puede acceder a /users/create', async ({ page }) => {
  // Login como usuario sin 'user:create'
  await page.goto('/auth/signin')
  await loginAsViewer(page)

  // Intentar acceder a ruta protegida
  await page.goto('/users/create')

  // Debe redirigir a error
  await expect(page).toHaveURL(/\/auth\/error/)
  await expect(page.locator('text=Permisos insuficientes')).toBeVisible()
})
```

---

## Referencias

- **Prisma Queries**: `src/lib/prisma/permission-queries.ts`
- **Utils**: `src/lib/utils/permission-utils.ts`
- **Server Helpers**: `src/lib/server/require-permission.ts`
- **Hooks**: `src/lib/hooks/use-permissions.ts`
- **Components**: `src/components/auth/permission-gate.tsx`
- **Middleware**: `src/middleware.ts`
- **Types**: `src/lib/types/permissions.ts`

---

**Fin de la documentación** 🎉
