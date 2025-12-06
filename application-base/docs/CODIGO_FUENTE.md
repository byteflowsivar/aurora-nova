# Documentación de Código Fuente - Aurora Nova v1.0

**Versión**: 1.0.0 Estable
**Última actualización**: Diciembre 2025
**Lenguaje de código**: Inglés (TypeScript)
**Lenguaje de documentación**: Español

## Tabla de Contenidos

1. [Estructura General](#estructura-general)
2. [Módulos Principales](#módulos-principales)
3. [Patrones de Código](#patrones-de-código)
4. [Servicios y Librerías](#servicios-y-librerías)
5. [Flujos de Datos](#flujos-de-datos)
6. [Tipos y Interfaces](#tipos-y-interfaces)
7. [Convenciones de Código](#convenciones-de-código)

---

## Estructura General

### Árbol de Directorios

```
src/
├── __tests__/                          # Suite de tests
│   ├── unit/                           # Tests unitarios
│   └── integration/                    # Tests de integración
│
├── actions/                            # Server Actions (RSC)
│   ├── auth.ts                         # Login, registro, logout
│   ├── session-management.ts           # Gestión de sesiones
│   └── ...
│
├── app/                                # Next.js App Router
│   ├── admin/                          # Zona administrativa
│   │   ├── auth/                       # Autenticación
│   │   │   ├── signin/page.tsx         # Login
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   ├── (protected)/                # Rutas protegidas por middleware
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   ├── roles/page.tsx
│   │   │   ├── permissions/page.tsx
│   │   │   ├── audit/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── layout.tsx                  # Admin layout
│   │   └── error.tsx                   # Error handling
│   │
│   ├── api/                            # API Routes
│   │   ├── auth/                       # Endpoints de autenticación
│   │   │   ├── [...nextauth]/route.ts  # NextAuth handler
│   │   │   ├── reset-password/route.ts
│   │   │   └── validate-reset-token/route.ts
│   │   │
│   │   ├── admin/                      # APIs administrativas (protegidas)
│   │   │   ├── users/
│   │   │   │   ├── route.ts            # GET: listar, POST: crear
│   │   │   │   └── [id]/route.ts       # GET, PUT, DELETE
│   │   │   ├── roles/route.ts
│   │   │   ├── permissions/route.ts
│   │   │   ├── menu/route.ts
│   │   │   └── audit/route.ts          # GET con filtros
│   │   │
│   │   ├── customer/                   # APIs de usuario autenticado
│   │   │   ├── profile/route.ts
│   │   │   ├── menu/route.ts
│   │   │   └── change-password/route.ts
│   │   │
│   │   └── public/                     # APIs públicas
│   │       └── health/route.ts         # Health check
│   │
│   ├── (public)/                       # Zona pública
│   │   ├── page.tsx                    # Página inicio
│   │   ├── about/page.tsx
│   │   └── ...
│   │
│   ├── layout.tsx                      # Layout raíz
│   ├── error.tsx                       # Error boundary global
│   ├── not-found.tsx                   # 404 handler
│   └── page.tsx                        # Home
│
├── lib/                                # Librerías y servicios
│   ├── auth.ts                         # Configuración NextAuth v5
│   ├── auth-utils.ts                   # Utilidades de autenticación
│   ├── auth-types.ts                   # Tipos de autenticación
│   ├── config.ts                       # Configuración central
│   ├── env.ts                          # Variables de entorno validadas
│   ├── rate-limiter.ts                 # Rate limiting por IP
│   │
│   ├── logger/                         # Sistema de logging Pino
│   │   ├── structured-logger.ts        # Logger con contexto
│   │   ├── helpers.ts                  # Funciones helper
│   │   ├── request-id.ts               # Tracking de request ID
│   │   ├── types.ts                    # Tipos de logging
│   │   └── index.ts                    # Exportaciones
│   │
│   ├── events/                         # Event Bus (event-driven)
│   │   ├── event-bus.ts                # Singleton EventEmitter
│   │   ├── event-area.ts               # Enumeración de áreas
│   │   ├── types.ts                    # Tipos de eventos
│   │   ├── listeners/                  # Event listeners
│   │   │   ├── audit-listener.ts       # Auto-auditoría
│   │   │   ├── email-listener.ts       # Envío de emails
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── menu/                           # Sistema de menú dinámico
│   │   ├── get-menu-server.ts          # Obtener menú del servidor
│   │   ├── menu-cache.ts               # Caché en memoria
│   │   └── types.ts
│   │
│   ├── prisma/                         # ORM y acceso a BD
│   │   ├── connection.ts               # Conexión singleton
│   │   ├── queries.ts                  # Queries reutilizables
│   │   ├── types.ts                    # Tipos derivados del schema
│   │   └── index.ts
│   │
│   ├── server/                         # Utilidades del servidor
│   │   ├── index.ts
│   │   └── require-permission.ts       # Middleware de permisos
│   │
│   └── utils.ts                        # Utilidades generales
│
├── modules/                            # Módulos por funcionalidad (3 zonas)
│   │
│   ├── shared/                         # COMPARTIDO (usado por todos)
│   │   ├── api/                        # Queries y servicios
│   │   │   ├── api-helpers.ts          # Manejo centralizado de errores
│   │   │   ├── email-service.ts        # Servicio de email (Nodemailer)
│   │   │   ├── session-queries.ts      # Queries de sesiones
│   │   │   ├── user-queries.ts         # Queries de usuarios
│   │   │   └── index.ts
│   │   │
│   │   ├── components/                 # Componentes reutilizables
│   │   │   ├── layout/                 # Componentes de layout
│   │   │   │   ├── header.tsx
│   │   │   │   ├── footer.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   └── ...
│   │   │   ├── presentational/         # Componentes UI puros
│   │   │   │   ├── login-form.tsx
│   │   │   │   ├── register-form.tsx
│   │   │   │   ├── permission-gate.tsx # Gate de permisos
│   │   │   │   ├── not-authorized.tsx
│   │   │   │   └── ...
│   │   │   └── utils/
│   │   │
│   │   ├── constants/                  # Constantes de la app
│   │   │   ├── api-routes.ts           # Rutas API
│   │   │   ├── permissions.ts          # Permisos definidos
│   │   │   └── ...
│   │   │
│   │   ├── hooks/                      # React hooks personalizados
│   │   │   ├── use-auth.ts             # Acceso a autenticación
│   │   │   ├── use-debounce.ts         # Debounce de valores
│   │   │   ├── use-mobile.ts           # Detección de móvil
│   │   │   └── index.ts
│   │   │
│   │   ├── types/                      # Tipos compartidos
│   │   │   ├── auth.ts                 # Tipos de autenticación
│   │   │   ├── session.ts              # Tipos de sesión
│   │   │   ├── action-response.ts      # Respuestas de acciones
│   │   │   └── index.ts
│   │   │
│   │   ├── utils/                      # Funciones utilitarias
│   │   │   ├── session-utils.ts        # Helpers de sesión
│   │   │   ├── user-agent-parser.ts    # Parser de user agent
│   │   │   └── ...
│   │   │
│   │   ├── validations/                # Esquemas Zod
│   │   │   ├── auth.ts                 # Validaciones de auth
│   │   │   ├── profile.ts              # Validaciones de perfil
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts                    # Barrel exports
│   │
│   ├── admin/                          # MÓDULO ADMINISTRATIVO
│   │   ├── components/                 # Componentes admin
│   │   │   ├── containers/             # Componentes inteligentes
│   │   │   │   ├── account-info-container.tsx
│   │   │   │   ├── app-sidebar-container.tsx
│   │   │   │   ├── audit-log-table-container.tsx
│   │   │   │   ├── audit-filters-container.tsx
│   │   │   │   ├── logout-button-container.tsx
│   │   │   │   ├── change-password-form-container.tsx
│   │   │   │   ├── profile-form-container.tsx
│   │   │   │   ├── user-dialog-container.tsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   └── presentational/         # Componentes puros
│   │   │       ├── sidebar.tsx
│   │   │       ├── user-form.tsx
│   │   │       ├── role-card.tsx
│   │   │       ├── audit-table.tsx
│   │   │       └── ...
│   │   │
│   │   ├── hooks/                      # Hooks específicos
│   │   │   ├── use-audit-logs.ts       # Fetch logs con paginación
│   │   │   └── index.ts
│   │   │
│   │   ├── services/                   # Lógica de negocio
│   │   │   ├── audit-service.ts        # Servicio de auditoría
│   │   │   ├── audit-helpers.ts        # Helpers de auditoría
│   │   │   ├── permission-queries.ts   # Queries de permisos
│   │   │   ├── permission-utils.ts     # Helpers de permisos
│   │   │   ├── menu-queries.ts         # Queries de menú
│   │   │   └── index.ts
│   │   │
│   │   ├── types/                      # Tipos específicos
│   │   │   ├── audit.ts                # Tipos de auditoría
│   │   │   ├── menu.ts                 # Tipos de menú
│   │   │   └── index.ts
│   │   │
│   │   ├── utils/                      # Utilidades
│   │   │   ├── permission-utils.ts     # Helpers de permisos
│   │   │   ├── icon-mapper.ts          # Mapper de iconos
│   │   │   └── index.ts
│   │   │
│   │   ├── layout/                     # Layout del módulo
│   │   │   ├── admin-layout.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   └── public/                         # MÓDULO PÚBLICO
│       ├── components/
│       │   ├── containers/
│       │   └── presentational/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       ├── utils/
│       └── index.ts
│
├── components/                         # Componentes globales
│   ├── ui/                             # shadcn/ui components
│   │   ├── alert-dialog.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── skeleton.tsx
│   │   ├── avatar.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── sheet.tsx
│   │   ├── sidebar.tsx
│   │   ├── tooltip.tsx
│   │   └── ... (muchos más)
│   │
│   └── providers/                      # Context providers
│       ├── session-provider.tsx
│       └── index.tsx
│
├── types/                              # Tipos globales
│   ├── auth.ts                         # Interfaces de autenticación
│   ├── env.d.ts                        # Tipos de entorno
│   ├── next-auth.d.ts                  # Extensión de NextAuth
│   └── index.ts
│
├── proxy.ts                            # Middleware de rutas
└── env.ts                              # Validación de variables de entorno
```

---

## Módulos Principales

### 1. Módulo Shared (Compartido)

**Ubicación**: `src/modules/shared/`

**Responsabilidad**: Código reutilizable por todos los módulos

**Estructura**:

```
shared/
├── api/                    # Servicios y queries
├── components/             # Componentes reutilizables
├── constants/              # Constantes globales
├── hooks/                  # React hooks personalizados
├── types/                  # Tipos TypeScript
├── utils/                  # Funciones utilitarias
├── validations/            # Esquemas Zod
└── index.ts               # Barrel exports
```

**Responsabilidades**:

| Carpeta | Responsabilidad |
|---------|-----------------|
| **api/** | Queries de BD compartidas, servicios (email, sesiones) |
| **components/** | Componentes UI reutilizables (LoginForm, PermissionGate) |
| **constants/** | URLs API, nombres de permisos, enumeraciones |
| **hooks/** | Hooks personalizados (useAuth, useDebounce, useMobile) |
| **types/** | Tipos compartidos (ActionResponse, Session, Auth) |
| **utils/** | Funciones helper (parseUserAgent, formatSession) |
| **validations/** | Esquemas Zod (loginSchema, registerSchema) |

**Reglas de uso**:
- Cualquier módulo puede importar de `shared/`
- Solo código verdaderamente compartido
- No debe contener lógica específica de `admin/` o `public/`

---

### 2. Módulo Admin (Administrativo)

**Ubicación**: `src/modules/admin/`

**Responsabilidad**: Funcionalidades administrativas del panel

**Estructura**:

```
admin/
├── components/
│   ├── containers/         # Componentes con lógica
│   └── presentational/      # Componentes UI puros
├── hooks/                  # Hooks específicos (use-audit-logs)
├── services/               # Servicios de negocio
├── types/                  # Tipos específicos admin
├── utils/                  # Helpers admin
└── layout/                 # Layout del panel
```

**Funcionalidades principales**:

1. **Gestión de Usuarios**
   - Listado, crear, editar, eliminar
   - Asignación de roles
   - Reset de contraseña como admin

2. **Gestión de Roles y Permisos**
   - CRUD de roles
   - Asignación de permisos a roles
   - Matriz de permisos

3. **Auditoría**
   - Visualización de logs
   - Filtros avanzados
   - Exportación de datos

4. **Configuración**
   - Parámetros globales
   - Políticas de seguridad

---

### 3. Módulo Public (Público)

**Ubicación**: `src/modules/public/`

**Responsabilidad**: Funcionalidades para usuarios públicos/no autenticados

**Estructura**: Similar a admin pero para contenido público

---

## Patrones de Código

### 1. Container/Presentation Pattern

**Propósito**: Separar lógica de presentación

**Estructura**:

```typescript
// Container: Inteligente (lógica)
// archivo: modules/admin/components/containers/user-list-container.tsx

'use client'

import { useEffect, useState } from 'react'
import { getUsersAction } from '@/actions/users'
import UserListTable from '../presentational/user-list-table'
import type { User } from '@prisma/client'

interface UserListContainerProps {
  initialUsers?: User[]
}

export default function UserListContainer({
  initialUsers = []
}: UserListContainerProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [isLoading, setIsLoading] = useState(!initialUsers.length)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const result = await getUsersAction()
        if (result.success) {
          setUsers(result.data || [])
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError('Failed to fetch users')
      } finally {
        setIsLoading(false)
      }
    }

    if (!initialUsers.length) {
      fetchUsers()
    }
  }, [initialUsers.length])

  return (
    <UserListTable
      users={users}
      isLoading={isLoading}
      error={error}
      onRefresh={() => setIsLoading(true)}
    />
  )
}
```

```typescript
// Presentational: Tonta (solo UI)
// archivo: modules/admin/components/presentational/user-list-table.tsx

import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table'
import type { User } from '@prisma/client'

interface UserListTableProps {
  users: User[]
  isLoading: boolean
  error: string | null
  onRefresh: () => void
}

export default function UserListTable({
  users,
  isLoading,
  error,
  onRefresh
}: UserListTableProps) {
  if (isLoading) return <Skeleton />
  if (error) return <Alert>{error}</Alert>

  return (
    <div>
      <Button onClick={onRefresh}>Refresh</Button>
      <Table>
        <TableHead>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id}>
              <TableCell>{user.first_name} {user.last_name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {/* Actions */}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

---

### 2. Server Actions Pattern

**Ubicación**: `src/actions/`

**Propósito**: Ejecutar lógica en servidor desde cliente

```typescript
// src/actions/users.ts
'use server'

import { db } from '@/lib/prisma/connection'
import { getCurrentSession } from '@/lib/auth'
import { requirePermission } from '@/lib/server/require-permission'
import { createUserSchema } from '@/modules/shared/validations/auth'
import { eventBus } from '@/lib/events/event-bus'
import { auditService } from '@/modules/admin/services/audit-service'
import type { ActionResponse } from '@/modules/shared/types'
import type { User } from '@prisma/client'

export async function createUserAction(
  input: unknown
): Promise<ActionResponse<User>> {
  try {
    // 1. Validar autenticación
    const session = await getCurrentSession()
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // 2. Validar autorización
    await requirePermission('user:create')

    // 3. Validar entrada
    const parsed = createUserSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: 'Validation failed',
        fieldErrors: parsed.error.flatten().fieldErrors
      }
    }

    // 4. Ejecutar lógica
    const user = await db.user.create({
      data: {
        email: parsed.data.email,
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        credentials: {
          create: {
            hashed_password: await hashPassword(parsed.data.password)
          }
        }
      }
    })

    // 5. Disparar evento
    eventBus.emit('user.created', {
      userId: user.id,
      email: user.email
    })

    // 6. Retornar respuesta
    return { success: true, data: user }
  } catch (error) {
    logger.error('Error creating user', { error })
    return { success: false, error: 'Internal server error' }
  }
}
```

---

### 3. API Routes Pattern

**Ubicación**: `src/app/api/`

**Propósito**: Endpoints REST-ful

```typescript
// src/app/api/admin/users/route.ts

import { getCurrentSession } from '@/lib/auth'
import { requirePermission } from '@/lib/server/require-permission'
import { db } from '@/lib/prisma/connection'
import { handleApiError, logApiSuccess } from '@/modules/shared/api/api-helpers'
import type { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  try {
    // Verificar permisos
    await requirePermission('user:read')

    // Obtener parámetros
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Obtener datos
    const [users, total] = await Promise.all([
      db.user.findMany({
        skip,
        take: limit,
        include: { roles: true }
      }),
      db.user.count()
    ])

    // Log de éxito
    await logApiSuccess('Users retrieved', 'users', 'list', { count: users.length })

    // Retornar
    return Response.json({
      success: true,
      data: users,
      pagination: { page, limit, total }
    })
  } catch (error) {
    return handleApiError(error, 'users', 'list', request)
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    // Verificar permisos
    await requirePermission('user:create')

    // Procesar igual a createUserAction
    // ...

    return Response.json({ success: true, data: user }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'users', 'create', request)
  }
}
```

---

### 4. Zod Validation Pattern

**Ubicación**: `src/modules/shared/validations/`

```typescript
// src/modules/shared/validations/auth.ts

import { z } from 'zod'

// Constantes de validación
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/

// Esquema de registro
export const registerSchema = z.object({
  email: z
    .string()
    .email('Email must be valid')
    .min(5)
    .max(255),

  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .regex(PASSWORD_REGEX, 'Password must contain uppercase, lowercase, and number'),

  confirmPassword: z
    .string()
    .min(1, 'Confirm password is required'),

  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100)
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

export type RegisterInput = z.infer<typeof registerSchema>

// Esquema de login
export const loginSchema = z.object({
  email: z.string().email('Invalid email').min(5).max(255),
  password: z.string().min(1, 'Password is required')
})

export type LoginInput = z.infer<typeof loginSchema>
```

---

### 5. React Hook Pattern

**Ubicación**: `src/modules/shared/hooks/`

```typescript
// src/modules/shared/hooks/use-auth.ts

'use client'

import { useSession } from 'next-auth/react'
import { useMemo } from 'react'
import type { Session } from 'next-auth'

interface AuthContextType {
  isLoading: boolean
  isAuthenticated: boolean
  user: Session['user'] | null
  permissions: string[]
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  hasRole: (role: string) => boolean
}

export function useAuth(): AuthContextType {
  const { data: session, status } = useSession()

  return useMemo(() => ({
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    user: session?.user || null,
    permissions: session?.user?.permissions || [],

    hasPermission(permission: string): boolean {
      return session?.user?.permissions?.includes(permission) ?? false
    },

    hasAnyPermission(permissions: string[]): boolean {
      return permissions.some(p => session?.user?.permissions?.includes(p))
    },

    hasAllPermissions(permissions: string[]): boolean {
      return permissions.every(p => session?.user?.permissions?.includes(p))
    },

    hasRole(role: string): boolean {
      return session?.user?.roles?.some(r => r.name === role) ?? false
    }
  }), [session, status])
}
```

---

## Servicios y Librerías

### 1. Sistema de Autenticación

**Archivo**: `src/lib/auth.ts`

```typescript
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 días
  },

  pages: {
    signIn: '/admin/auth/signin',
    error: '/admin/auth/error'
  },

  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },

      async authorize(credentials) {
        // Validar entrada
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        // Buscar usuario
        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: {
            credentials: true,
            userRoles: { include: { role: true } }
          }
        })

        if (!user || !user.credentials?.hashed_password) {
          throw new Error('User not found')
        }

        // Verificar contraseña
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.credentials.hashed_password
        )

        if (!isPasswordValid) {
          throw new Error('Invalid password')
        }

        // Obtener permisos
        const permissions = await getUserPermissions(user.id)

        // Retornar usuario con permisos
        return {
          id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          permissions
        }
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.permissions = user.permissions
      }
      return token
    },

    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.permissions = token.permissions as string[]
      return session
    }
  }
}
```

---

### 2. Event Bus

**Archivo**: `src/lib/events/event-bus.ts`

```typescript
import { EventEmitter } from 'events'
import type { SystemEvent, EventPayload } from './types'

class EventBus {
  private emitter: EventEmitter

  constructor() {
    this.emitter = new EventEmitter()
    this.emitter.setMaxListeners(20)
  }

  emit<E extends SystemEvent>(
    event: E,
    payload: EventPayload<E>,
    context?: { userId?: string; area?: string }
  ): boolean {
    try {
      logger.info(`Event emitted: ${event}`, {
        module: 'events',
        action: 'emit',
        event,
        ...context
      })

      return this.emitter.emit(event, { payload, context })
    } catch (error) {
      logger.error(`Error emitting event: ${event}`, {
        error,
        event,
        ...context
      })
      return false
    }
  }

  on<E extends SystemEvent>(
    event: E,
    handler: (data: { payload: EventPayload<E>; context?: any }) => Promise<void>
  ): void {
    this.emitter.on(event, async (data) => {
      try {
        await handler(data)
      } catch (error) {
        logger.error(`Error in event listener: ${event}`, {
          error,
          event
        })
      }
    })
  }

  once<E extends SystemEvent>(
    event: E,
    handler: (data: { payload: EventPayload<E>; context?: any }) => Promise<void>
  ): void {
    this.emitter.once(event, async (data) => {
      try {
        await handler(data)
      } catch (error) {
        logger.error(`Error in once listener: ${event}`, {
          error,
          event
        })
      }
    })
  }

  removeListener<E extends SystemEvent>(
    event: E,
    handler: (data: any) => Promise<void>
  ): void {
    this.emitter.removeListener(event, handler)
  }

  removeAllListeners(event?: SystemEvent): void {
    this.emitter.removeAllListeners(event)
  }
}

// Singleton
export const eventBus = new EventBus()
```

---

### 3. Logger Estructurado

**Archivo**: `src/lib/logger/structured-logger.ts`

```typescript
import pino from 'pino'

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
})

export class StructuredLogger {
  private logger: typeof pinoLogger

  constructor(private module: string) {
    this.logger = pinoLogger
  }

  private addContext(extra: Record<string, any> = {}) {
    return {
      module: this.module,
      timestamp: new Date().toISOString(),
      ...extra
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.logger.info(this.addContext(context), message)
  }

  warn(message: string, context?: Record<string, any>) {
    this.logger.warn(this.addContext(context), message)
  }

  error(message: string, context?: Record<string, any>) {
    this.logger.error(this.addContext(context), message)
  }

  debug(message: string, context?: Record<string, any>) {
    this.logger.debug(this.addContext(context), message)
  }
}

export const logger = new StructuredLogger('app')
```

---

## Flujos de Datos

### Flujo de Login

```
1. Usuario ingresa email/password en LoginForm
   ├─ Validación básica en cliente (opcional)
   └─ Llamada a signIn() de NextAuth

2. NextAuth llama a CredentialsProvider.authorize()
   ├─ Busca usuario en BD
   ├─ Verifica contraseña con bcrypt
   ├─ Obtiene permisos del usuario
   └─ Retorna usuario con permisos

3. Callback JWT
   ├─ Crea token con datos del usuario
   ├─ Agrega permisos al payload
   └─ Retorna token

4. Callback Session
   ├─ Extrae datos del token JWT
   └─ Construye sesión

5. Middleware (proxy.ts)
   ├─ Valida JWT en request headers
   ├─ Verifica ruta (pública vs protegida)
   ├─ Genera Request ID
   └─ Continúa o redirige

6. Listener de eventos
   ├─ Captura evento USER_LOGGED_IN
   ├─ Crea entrada en tabla Session con IP/UserAgent
   └─ Dispara audit log automático

7. Cliente recibe sesión con permisos
   └─ useAuth() hook tiene acceso a permisos
```

---

### Flujo de Creación de Usuario

```
1. Admin abre formulario de crear usuario
   └─ UserCreateDialog (container/presentational)

2. Admin llena formulario y envía
   └─ Llamada a createUserAction()

3. Server Action: createUserAction()
   ├─ Valida autenticación (currentSession)
   ├─ Verifica permiso 'user:create'
   ├─ Valida input con Zod
   ├─ Hash de contraseña con bcryptjs
   ├─ Crea usuario en BD
   ├─ Crea entrada de credenciales
   ├─ Emite evento USER_CREATED
   └─ Retorna ActionResponse<User>

4. Event Bus dispara 'user.created'
   ├─ Listener: audit-listener
   │  └─ Crea AuditLog con changes
   └─ Listener: email-listener
      └─ Envía email de bienvenida

5. Cliente recibe respuesta
   ├─ Si success: muestra toast, actualiza lista
   └─ Si error: muestra field errors
```

---

## Tipos y Interfaces

### ActionResponse

```typescript
// src/modules/shared/types/action-response.ts

export type ActionSuccess<T = void> = {
  success: true
  data: T
  message?: string
}

export type ActionError = {
  success: false
  error: string
  fieldErrors?: Record<string, string[]>
}

export type ActionResponse<T = void> = ActionSuccess<T> | ActionError

// Helpers
export function isSuccess<T>(
  response: ActionResponse<T>
): response is ActionSuccess<T> {
  return response.success === true
}

export function isError<T>(
  response: ActionResponse<T>
): response is ActionError {
  return response.success === false
}
```

### AuthContext

```typescript
// src/modules/shared/types/auth.ts

export interface AuthContext {
  isAuthenticated: boolean
  isLoading: boolean
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    roles: string[]
    permissions: string[]
  } | null
  hasPermission(permission: string): boolean
  hasAnyPermission(permissions: string[]): boolean
  hasAllPermissions(permissions: string[]): boolean
  hasRole(role: string): boolean
}
```

---

## Convenciones de Código

### 1. Nombres de Archivos

```
Componentes React:     PascalCase.tsx
Funciones/Variables:   camelCase.ts
Tipos/Interfaces:      PascalCase.ts
Archivos de config:    kebab-case.ts
```

### 2. Importes

```typescript
// Importes de librerías externas primero
import React from 'react'
import { useSession } from 'next-auth/react'

// Importes internos después
import { db } from '@/lib/prisma/connection'
import { logger } from '@/lib/logger'

// Importes de tipos al final
import type { User } from '@prisma/client'
import type { ActionResponse } from '@/modules/shared/types'
```

### 3. Estructura de Componentes

```typescript
// 1. Imports
import React from 'react'

// 2. Types/Interfaces
interface ComponentProps {
  title: string
  onClick: () => void
}

// 3. Component
export default function MyComponent({
  title,
  onClick
}: ComponentProps) {
  // Lógica
  return (
    // JSX
  )
}

// 4. Exports (si hay múltiples)
export { SomeType }
```

### 4. Server Actions

```typescript
// 1. 'use server' al inicio
'use server'

// 2. Imports
import { db } from '@/lib/prisma/connection'

// 3. Type definitions
type Input = z.infer<typeof mySchema>

// 4. Function
export async function myAction(
  input: Input
): Promise<ActionResponse<ResultType>> {
  try {
    // Lógica
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: message }
  }
}
```

### 5. Error Handling

```typescript
// Consistente en todo el código
try {
  // Operación
  return { success: true, data: result }
} catch (error) {
  // Log del error
  logger.error('Operation failed', { error, context })

  // Respuesta de error
  if (error instanceof ZodError) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: error.flatten().fieldErrors
    }
  }

  if (error instanceof PrismaError) {
    return { success: false, error: 'Database error' }
  }

  return { success: false, error: 'Internal error' }
}
```

### 6. Permisos

```typescript
// Siempre verificar en servidor
export async function protectedAction() {
  // Verificar autenticación
  const session = await getCurrentSession()
  if (!session) throw new Error('Unauthorized')

  // Verificar permiso específico
  await requirePermission('action:do')

  // Continuar con operación segura
}

// En componentes: solo para UX (no seguridad)
<PermissionGate permission="action:do">
  {/* Mostrar contenido solo si tiene permiso */}
</PermissionGate>
```

---

**Versión**: 1.0.0 Estable
**Última actualización**: Diciembre 2025
