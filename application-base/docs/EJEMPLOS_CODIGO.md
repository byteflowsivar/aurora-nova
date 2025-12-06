# Ejemplos de Código - Aurora Nova v1.0

**Versión**: 1.0.0 Estable
**Última actualización**: Diciembre 2025

## Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [Autorización y Permisos](#autorización-y-permisos)
3. [Componentes](#componentes)
4. [Server Actions](#server-actions)
5. [API Routes](#api-routes)
6. [Eventos](#eventos)
7. [Logging](#logging)
8. [Testing](#testing)

---

## Autenticación

### Login

**Cliente**: `app/admin/auth/signin/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { loginSchema } from '@/modules/shared/validations/auth'
import type { LoginInput } from '@/modules/shared/validations/auth'

export default function SignInPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsLoading(true)

    try {
      // Validar
      const result = loginSchema.safeParse(formData)
      if (!result.success) {
        setErrors(result.error.flatten().fieldErrors as Record<string, string>)
        setIsLoading(false)
        return
      }

      // Sign in
      const signInResult = await signIn('credentials', {
        email: result.data.email,
        password: result.data.password,
        redirect: false
      })

      if (signInResult?.error) {
        setErrors({ general: signInResult.error })
      } else if (signInResult?.ok) {
        router.push('/admin/dashboard')
      }
    } catch (error) {
      setErrors({ general: 'An error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Sign In</h1>

      {errors.general && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={isLoading}
          />
          {errors.email && <p className="text-red-600 text-sm">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <Input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            disabled={isLoading}
          />
          {errors.password && <p className="text-red-600 text-sm">{errors.password}</p>}
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </div>
  )
}
```

### Registro

**Server Action**: `src/actions/auth.ts`

```typescript
'use server'

import { db } from '@/lib/prisma/connection'
import { hashPassword } from '@/lib/auth-utils'
import { registerSchema } from '@/modules/shared/validations/auth'
import { eventBus } from '@/lib/events/event-bus'
import { logger } from '@/lib/logger'
import type { ActionResponse } from '@/modules/shared/types'
import type { RegisterInput } from '@/modules/shared/validations/auth'

export async function registerUserAction(
  input: unknown
): Promise<ActionResponse<{ userId: string; email: string }>> {
  try {
    // Validar entrada
    const parsed = registerSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: 'Validation failed',
        fieldErrors: parsed.error.flatten().fieldErrors
      }
    }

    const { email, password, firstName, lastName } = parsed.data

    // Verificar email único
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return {
        success: false,
        error: 'Email already in use',
        fieldErrors: { email: ['This email is already registered'] }
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Crear usuario
    const user = await db.user.create({
      data: {
        email,
        first_name: firstName,
        last_name: lastName,
        credentials: {
          create: {
            hashed_password: hashedPassword
          }
        },
        // Asignar rol por defecto
        userRoles: {
          create: {
            roleId: 'default-user-role-id'
          }
        }
      }
    })

    // Log
    logger.info('User registered', {
      userId: user.id,
      email: user.email
    })

    // Emitir evento
    eventBus.emit('user.registered', {
      userId: user.id,
      email: user.email,
      firstName: user.first_name
    }, {
      userId: user.id,
      area: 'public'
    })

    return {
      success: true,
      data: {
        userId: user.id,
        email: user.email
      }
    }
  } catch (error) {
    logger.error('Error registering user', { error })
    return { success: false, error: 'Failed to register user' }
  }
}
```

---

## Autorización y Permisos

### Verificar Permiso en Server Action

```typescript
'use server'

import { getCurrentSession } from '@/lib/auth'
import { requirePermission } from '@/lib/server/require-permission'
import { db } from '@/lib/prisma/connection'
import type { ActionResponse } from '@/modules/shared/types'

export async function deleteUserAction(
  userId: string
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    // 1. Obtener sesión actual
    const session = await getCurrentSession()
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // 2. Verificar permiso específico
    try {
      await requirePermission('user:delete')
    } catch (error) {
      return { success: false, error: 'You do not have permission to delete users' }
    }

    // 3. Verificar que no se auto-elimina
    if (session.user.id === userId) {
      return { success: false, error: 'You cannot delete your own account' }
    }

    // 4. Ejecutar operación
    await db.user.delete({
      where: { id: userId }
    })

    // 5. Auditar
    await auditService.log({
      userId: session.user.id,
      action: 'user_deleted',
      module: 'users',
      entityType: 'User',
      entityId: userId,
      area: 'admin'
    })

    return { success: true, data: { success: true } }
  } catch (error) {
    logger.error('Error deleting user', { error, userId })
    return { success: false, error: 'Failed to delete user' }
  }
}
```

### Permission Gate en Componente

```typescript
import { useAuth } from '@/modules/shared/hooks/use-auth'
import { PermissionGate } from '@/modules/shared/components/permission-gate'
import { NotAuthorized } from '@/modules/shared/components/not-authorized'
import { Button } from '@/components/ui/button'

interface UserActionsProps {
  userId: string
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function UserActions({ userId, onEdit, onDelete }: UserActionsProps) {
  const auth = useAuth()

  if (!auth.isAuthenticated) {
    return <NotAuthorized />
  }

  return (
    <div className="flex gap-2">
      {/* Editar usuario - si tiene permiso */}
      <PermissionGate permission="user:update">
        <Button
          variant="outline"
          onClick={() => onEdit(userId)}
        >
          Edit
        </Button>
      </PermissionGate>

      {/* Eliminar usuario - si tiene permiso */}
      <PermissionGate permission="user:delete">
        <Button
          variant="destructive"
          onClick={() => onDelete(userId)}
        >
          Delete
        </Button>
      </PermissionGate>

      {/* Mostrar mensaje si no tiene TODOS los permisos */}
      {!auth.hasAllPermissions(['user:update', 'user:delete']) && (
        <p className="text-sm text-gray-500">Limited permissions</p>
      )}
    </div>
  )
}
```

---

## Componentes

### Container Component con Lógica

```typescript
// modules/admin/components/containers/audit-log-table-container.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/modules/shared/hooks/use-auth'
import { getAuditLogsAction } from '@/actions/audit'
import AuditLogTable from '../presentational/audit-log-table'
import AuditFilters from '../presentational/audit-filters'
import type { AuditLog, AuditFilters as FilterType } from '@/modules/admin/types/audit'

interface AuditLogContainerProps {
  initialPage?: number
  initialLimit?: number
}

export default function AuditLogTableContainer({
  initialPage = 1,
  initialLimit = 50
}: AuditLogContainerProps) {
  const auth = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterType>({})
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: initialLimit,
    total: 0
  })

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getAuditLogsAction({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      })

      if (result.success) {
        setLogs(result.data?.logs || [])
        setPagination(prev => ({
          ...prev,
          total: result.data?.total || 0
        }))
      } else {
        setError(result.error || 'Failed to load audit logs')
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [filters, pagination.page, pagination.limit])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleFilterChange = (newFilters: FilterType) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  // Solo mostrar si tiene permiso
  if (!auth.hasPermission('audit:read')) {
    return <NotAuthorized />
  }

  return (
    <div className="space-y-4">
      <AuditFilters
        filters={filters}
        onChange={handleFilterChange}
        isLoading={isLoading}
      />

      <AuditLogTable
        logs={logs}
        isLoading={isLoading}
        error={error}
        pagination={pagination}
        onPageChange={handlePageChange}
        onRefresh={fetchLogs}
      />
    </div>
  )
}
```

### Presentational Component Puro

```typescript
// modules/admin/components/presentational/audit-log-table.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import type { AuditLog } from '@/modules/admin/types/audit'

interface AuditLogTableProps {
  logs: AuditLog[]
  isLoading: boolean
  error: string | null
  pagination: { page: number; limit: number; total: number }
  onPageChange: (page: number) => void
  onRefresh: () => void
}

export default function AuditLogTable({
  logs,
  isLoading,
  error,
  pagination,
  onPageChange,
  onRefresh
}: AuditLogTableProps) {
  const totalPages = Math.ceil(pagination.total / pagination.limit)

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <p className="text-red-600">{error}</p>
        <Button onClick={onRefresh} variant="outline" className="mt-2">
          Retry
        </Button>
      </div>
    )
  }

  if (isLoading && logs.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  const getActionBadgeVariant = (action: string) => {
    if (['create', 'created'].includes(action)) return 'success'
    if (['delete', 'deleted'].includes(action)) return 'destructive'
    if (['update', 'updated'].includes(action)) return 'warning'
    return 'default'
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Device</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm">
                  {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                </TableCell>
                <TableCell className="text-sm">
                  {log.user?.email || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={getActionBadgeVariant(log.action)}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{log.module}</TableCell>
                <TableCell className="text-sm">
                  {log.entityType} {log.entityId && `(${log.entityId.slice(0, 8)})`}
                </TableCell>
                <TableCell className="text-sm font-mono">
                  {log.ipAddress}
                </TableCell>
                <TableCell className="text-sm">
                  {log.device || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total} results
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={pagination.page === 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={pagination.page >= totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

## Server Actions

### Crear Usuario con Auditoría

```typescript
'use server'

import { db } from '@/lib/prisma/connection'
import { getCurrentSession } from '@/lib/auth'
import { requirePermission } from '@/lib/server/require-permission'
import { createUserSchema } from '@/modules/shared/validations/auth'
import { hashPassword } from '@/lib/auth-utils'
import { auditService } from '@/modules/admin/services/audit-service'
import { eventBus } from '@/lib/events/event-bus'
import { logger } from '@/lib/logger'
import type { ActionResponse } from '@/modules/shared/types'
import type { User } from '@prisma/client'

export async function createUserAction(
  input: unknown
): Promise<ActionResponse<User>> {
  try {
    // 1. Obtener sesión
    const session = await getCurrentSession()
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // 2. Verificar permiso
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

    // 4. Verificar email único
    const existing = await db.user.findUnique({
      where: { email: parsed.data.email }
    })
    if (existing) {
      return {
        success: false,
        error: 'Email already in use',
        fieldErrors: { email: ['This email is already registered'] }
      }
    }

    // 5. Hash password
    const hashedPassword = await hashPassword(parsed.data.password)

    // 6. Crear usuario
    const user = await db.user.create({
      data: {
        email: parsed.data.email,
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        credentials: {
          create: {
            hashed_password: hashedPassword
          }
        }
      }
    })

    // 7. Auditar la creación
    await auditService.log({
      userId: session.user.id,
      action: 'user_created',
      module: 'users',
      area: 'admin',
      entityType: 'User',
      entityId: user.id,
      newValues: {
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    })

    // 8. Emitir evento
    eventBus.emit('user.created', {
      userId: user.id,
      email: user.email,
      createdBy: session.user.id
    }, {
      userId: session.user.id,
      area: 'admin'
    })

    // 9. Log
    logger.info('User created successfully', {
      userId: user.id,
      email: user.email,
      createdBy: session.user.id
    })

    return { success: true, data: user }
  } catch (error) {
    logger.error('Error creating user', {
      error,
      stack: error instanceof Error ? error.stack : undefined
    })
    return { success: false, error: 'Failed to create user' }
  }
}
```

---

## API Routes

### Get Usuarios con Filtros

```typescript
// src/app/api/admin/users/route.ts
import { getCurrentSession } from '@/lib/auth'
import { requirePermission } from '@/lib/server/require-permission'
import { db } from '@/lib/prisma/connection'
import { logger } from '@/lib/logger'
import { Prisma } from '@prisma/client'
import type { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  try {
    // Verificar autenticación y permisos
    const session = await getCurrentSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await requirePermission('user:read')

    // Obtener parámetros de búsqueda
    const { searchParams } = request.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '10'))
    const search = searchParams.get('search') ?? ''
    const role = searchParams.get('role')

    const skip = (page - 1) * limit

    // Construir where clause dinámicamente
    const where: Prisma.UserWhereInput = {}

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (role) {
      where.userRoles = {
        some: {
          role: { name: role }
        }
      }
    }

    // Obtener datos
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          userRoles: {
            include: { role: true }
          }
        },
        orderBy: { created_at: 'desc' }
      }),
      db.user.count({ where })
    ])

    // Log
    logger.info('Users retrieved', {
      count: users.length,
      total,
      page,
      limit,
      userId: session.user.id
    })

    // Retornar
    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    logger.error('Error fetching users', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    if (error instanceof Error && error.message === 'Permission denied') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## Eventos

### Emitir Evento

```typescript
// En cualquier server action o listener
import { eventBus } from '@/lib/events/event-bus'

// Emitir evento cuando usuario se registra
await eventBus.emit('user.registered', {
  userId: user.id,
  email: user.email,
  firstName: user.first_name
}, {
  userId: user.id,
  area: 'public'
})
```

### Escuchar Evento

```typescript
// src/lib/events/listeners/welcome-email-listener.ts
import { eventBus } from '@/lib/events/event-bus'
import { emailService } from '@/modules/shared/api/email-service'
import { logger } from '@/lib/logger'

export function setupWelcomeEmailListener() {
  eventBus.on('user.registered', async ({ payload, context }) => {
    try {
      const { userId, email, firstName } = payload

      logger.info('Sending welcome email', {
        userId,
        email,
        context
      })

      await emailService.send({
        to: email,
        subject: 'Welcome to Aurora Nova!',
        template: 'welcome',
        data: {
          firstName,
          confirmLink: `${process.env.NEXTAUTH_URL}/auth/confirm?token=...`
        }
      })

      logger.info('Welcome email sent', { userId, email })
    } catch (error) {
      logger.error('Failed to send welcome email', {
        error,
        userId: payload.userId,
        email: payload.email
      })
    }
  })
}

// Inicializar en app startup
setupWelcomeEmailListener()
```

---

## Logging

### Logging Estructurado

```typescript
import { logger } from '@/lib/logger'

// Info
logger.info('User logged in successfully', {
  userId: user.id,
  email: user.email,
  ipAddress: request.ip,
  timestamp: new Date().toISOString()
})

// Warning
logger.warn('Suspicious login attempt', {
  email: credentials.email,
  attempts: failedAttempts,
  action: 'Login failed after 3 attempts'
})

// Error con contexto
logger.error('Database connection failed', {
  error: err instanceof Error ? err.message : 'Unknown',
  timestamp: new Date(),
  dbHost: process.env.DATABASE_URL
})

// Debug
logger.debug('User permissions loaded', {
  userId: user.id,
  permissions: user.permissions,
  loadTime: '45ms'
})
```

---

## Testing

### Test Unitario de Action

```typescript
// src/actions/__tests__/unit/create-user.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createUserAction } from '@/actions/users'
import * as authLib from '@/lib/auth'
import * as serverLib from '@/lib/server/require-permission'

vi.mock('@/lib/auth')
vi.mock('@/lib/server/require-permission')

describe('createUserAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return error if not authenticated', async () => {
    vi.mocked(authLib.getCurrentSession).mockResolvedValueOnce(null)

    const result = await createUserAction({
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe'
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('should return validation error if email invalid', async () => {
    vi.mocked(authLib.getCurrentSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com' }
    } as any)

    vi.mocked(serverLib.requirePermission).mockResolvedValueOnce(undefined)

    const result = await createUserAction({
      email: 'invalid-email',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe'
    })

    expect(result.success).toBe(false)
    expect(result.fieldErrors?.email).toBeDefined()
  })

  it('should create user successfully', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'newuser@example.com',
      first_name: 'John',
      last_name: 'Doe'
    }

    vi.mocked(authLib.getCurrentSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com' }
    } as any)

    vi.mocked(serverLib.requirePermission).mockResolvedValueOnce(undefined)

    // Mock Prisma
    vi.mock('@/lib/prisma/connection', () => ({
      db: {
        user: {
          findUnique: vi.fn().mockResolvedValueOnce(null),
          create: vi.fn().mockResolvedValueOnce(mockUser)
        }
      }
    }))

    const result = await createUserAction({
      email: 'newuser@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe'
    })

    expect(result.success).toBe(true)
    expect(result.data?.id).toBe('user-123')
  })
})
```

### Test de Componente

```typescript
// modules/admin/components/__tests__/user-list-container.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import UserListContainer from '../containers/user-list-container'
import * as usersActions from '@/actions/users'

vi.mock('@/actions/users')

describe('UserListContainer', () => {
  it('should load users on mount', async () => {
    const mockUsers = [
      { id: '1', email: 'user1@example.com', first_name: 'User', last_name: 'One' },
      { id: '2', email: 'user2@example.com', first_name: 'User', last_name: 'Two' }
    ]

    vi.mocked(usersActions.getUsersAction).mockResolvedValueOnce({
      success: true,
      data: mockUsers
    })

    render(<UserListContainer />)

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument()
      expect(screen.getByText('user2@example.com')).toBeInTheDocument()
    })
  })

  it('should display error message if fetch fails', async () => {
    vi.mocked(usersActions.getUsersAction).mockResolvedValueOnce({
      success: false,
      error: 'Failed to fetch users'
    })

    render(<UserListContainer />)

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch users')).toBeInTheDocument()
    })
  })
})
```

---

**Versión**: 1.0.0 Estable
**Última actualización**: Diciembre 2025
