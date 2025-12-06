import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma/connection"
import { z } from "zod"
import { requirePermission } from "@/lib/server/require-permission"
import { SYSTEM_PERMISSIONS } from "@/modules/admin/types/permissions"
import { UnauthenticatedError, PermissionDeniedError } from "@/lib/server/require-permission"
import { auth } from "@/lib/auth"
import { eventBus, SystemEvent } from "@/lib/events"
import { EventArea } from "@/lib/events/event-area"

const updateRoleSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(50, "El nombre debe tener máximo 50 caracteres").optional(),
  description: z.string().optional().nullable(),
})

/**
 * GET /api/admin/roles/:id - Obtener detalles de rol
 *
 * Obtiene información completa de un rol específico.
 * Incluye todos los permisos asignados y conteo de usuarios con este rol.
 *
 * **Autenticación**: Requerida (permiso: `role:read`)
 *
 * **URL Parameters**:
 * - `id` (string, requerido): UUID del rol a obtener
 *
 * **Respuesta** (200):
 * ```json
 * {
 *   "id": "uuid",
 *   "name": "admin",
 *   "description": "Administrador del sistema",
 *   "createdAt": "2024-01-01T00:00:00Z",
 *   "updatedAt": "2024-12-05T12:00:00Z",
 *   "permissions": [
 *     {
 *       "id": "user:create",
 *       "module": "user",
 *       "description": "Crear nuevos usuarios"
 *     },
 *     {
 *       "id": "user:delete",
 *       "module": "user",
 *       "description": "Eliminar usuarios"
 *     }
 *   ],
 *   "usersCount": 3
 * }
 * ```
 *
 * **Errores**:
 * - 401: No autenticado (enviar JWT válido)
 * - 403: Sin permiso `role:read` (solicitar al admin)
 * - 404: Rol no encontrado (ID inválido)
 * - 500: Error del servidor
 *
 * **Performance**:
 * - Query optimizada con select específico
 * - Incluye rolePermissions → permission (relación anidada)
 * - _count para usersCount (sin N+1)
 * - Típicamente < 50ms
 *
 * @method GET
 * @route /api/admin/roles/:id
 * @auth Requerida (JWT válido)
 * @permission role:read
 *
 * @param {NextRequest} request - NextRequest HTTP
 * @param {object} context - Contexto de Next.js
 * @param {Promise<{id: string}>} context.params - Parámetros de URL
 * @returns {Promise<NextResponse>} Rol con permisos y conteos
 *
 * @example
 * ```typescript
 * // Obtener detalles de rol
 * const response = await fetch(`/api/admin/roles/${roleId}`, {
 *   headers: {
 *     'Authorization': `Bearer ${session.user.token}`
 *   }
 * })
 *
 * if (response.ok) {
 *   const role = await response.json()
 *   console.log(`Rol: ${role.name}`)
 *   console.log(`Permisos: ${role.permissions.length}`)
 *   console.log(`Usuarios: ${role.usersCount}`)
 * } else if (response.status === 404) {
 *   console.error('Rol no encontrado')
 * }
 * ```
 *
 * @see {@link ./route.ts#PUT} para actualizar rol
 * @see {@link ./route.ts#DELETE} para eliminar rol
 * @see {@link ./permissions/route.ts} para gestionar permisos del rol
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.ROLE_READ)

    const { id } = await params

    const role = await prisma.role.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        rolePermissions: {
          select: {
            permission: {
              select: {
                id: true,
                module: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    })

    if (!role) {
      return NextResponse.json(
        { error: "Rol no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map((rp) => rp.permission),
      usersCount: role._count.userRoles,
    })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
    console.error("Error fetching role:", error)
    return NextResponse.json(
      { error: "Error al obtener rol" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/roles/:id - Actualizar rol
 *
 * Actualiza nombre y/o descripción de un rol existente.
 * Actualización parcial: solo campos proporcionados se modifican.
 * Si se cambia nombre, se verifica unicidad automáticamente.
 *
 * **Autenticación**: Requerida (permiso: `role:update`)
 *
 * **URL Parameters**:
 * - `id` (string, requerido): UUID del rol a actualizar
 *
 * **Body Esperado**:
 * ```json
 * {
 *   "name": "string (opcional, 1-50 chars, debe ser único)",
 *   "description": "string (opcional, null permitido)"
 * }
 * ```
 *
 * **Respuesta** (200):
 * ```json
 * {
 *   "id": "uuid",
 *   "name": "moderador",
 *   "description": "Moderador de contenidos actualizado",
 *   "createdAt": "2024-01-01T00:00:00Z",
 *   "updatedAt": "2024-12-05T12:00:00Z",
 *   "permissionsCount": 5,
 *   "usersCount": 2
 * }
 * ```
 *
 * **Errores**:
 * - 400: Datos inválidos (nombre vacío, > 50 chars)
 *   - Validación: name.min(1), name.max(50) si proporcionado
 * - 401: No autenticado (enviar JWT válido)
 * - 403: Sin permiso `role:update` (solicitar al admin)
 * - 404: Rol no encontrado (ID inválido)
 * - 409: Nombre ya en uso por otro rol (duplicado)
 * - 500: Error del servidor
 *
 * **Validaciones**:
 * - name: opcional, 1-50 caracteres, debe ser único (si se proporciona)
 * - description: opcional, puede ser null
 * - Al menos un campo debe ser proporcionado (aunque no se valida en código)
 *
 * **Lógica**:
 * 1. Valida permiso `role:update`
 * 2. Valida datos con Zod schema
 * 3. Verifica que rol existe (404 si no)
 * 4. Si name cambia, verifica que nuevo nombre es único (409 si duplicado)
 * 5. Actualiza rol con solo campos proporcionados
 * 6. Emite evento ROLE_UPDATED para auditoría (con oldValues y newValues)
 *
 * **Efectos Secundarios**:
 * - Actualiza tabla `role` con campos soportados
 * - updatedAt se establece automáticamente
 * - Emite evento con cambios antes/después para auditoría
 * - NO cambia permisos (usar /permissions endpoint para eso)
 * - NO cambia usuarios (solo cambian nombre/descripción del rol)
 *
 * **Auditoría**:
 * - Evento: `ROLE_UPDATED`
 * - Quién: usuario autenticado (session.user.id)
 * - Cuándo: timestamp ISO
 * - Qué: roleId, oldValues {name, description}, newValues {name, description}, updatedBy
 *
 * @method PATCH
 * @route /api/admin/roles/:id
 * @auth Requerida (JWT válido)
 * @permission role:update
 *
 * @param {NextRequest} request - NextRequest con body JSON
 * @param {object} context - Contexto de Next.js
 * @param {Promise<{id: string}>} context.params - Parámetros de URL
 * @returns {Promise<NextResponse>} Rol actualizado o error
 *
 * @example
 * ```typescript
 * // Actualizar parcialmente: solo descripción
 * const response = await fetch(`/api/admin/roles/${roleId}`, {
 *   method: 'PATCH',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': `Bearer ${session.user.token}`
 *   },
 *   body: JSON.stringify({
 *     description: 'Nueva descripción del rol'
 *   })
 * })
 *
 * if (response.ok) {
 *   const updatedRole = await response.json()
 *   console.log(`Rol actualizado: ${updatedRole.name}`)
 * } else if (response.status === 409) {
 *   console.error('Nombre de rol ya en uso')
 * }
 * ```
 *
 * @see {@link ./route.ts#GET} para obtener rol
 * @see {@link ./route.ts#DELETE} para eliminar rol
 * @see {@link ../route.ts} para crear rol
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.ROLE_UPDATE)
    const session = await auth()

    const { id } = await params
    const body = await request.json()

    // Validar datos
    const validationResult = updateRoleSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { name, description } = validationResult.data

    // Verificar que el rol existe
    const existingRole = await prisma.role.findUnique({
      where: { id },
    })

    if (!existingRole) {
      return NextResponse.json(
        { error: "Rol no encontrado" },
        { status: 404 }
      )
    }

    // Si se está actualizando el nombre, verificar que no esté en uso
    if (name && name !== existingRole.name) {
      const nameInUse = await prisma.role.findFirst({
        where: { name },
      })

      if (nameInUse) {
        return NextResponse.json(
          { error: "Ya existe un rol con este nombre" },
          { status: 409 }
        )
      }
    }

    // Actualizar rol
    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            rolePermissions: true,
            userRoles: true,
          },
        },
      },
    })

    // Dispatch event for role update audit
    await eventBus.dispatch(
      SystemEvent.ROLE_UPDATED,
      {
        roleId: updatedRole.id,
        oldValues: {
          name: existingRole.name,
          description: existingRole.description,
        },
        newValues: {
          name: updatedRole.name,
          description: updatedRole.description,
        },
        updatedBy: session?.user?.id || 'system',
      },
      {
        userId: session?.user?.id,
        area: EventArea.ADMIN,
      }
    )

    return NextResponse.json({
      id: updatedRole.id,
      name: updatedRole.name,
      description: updatedRole.description,
      createdAt: updatedRole.createdAt,
      updatedAt: updatedRole.updatedAt,
      permissionsCount: updatedRole._count.rolePermissions,
      usersCount: updatedRole._count.userRoles,
    })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
    console.error("Error updating role:", error)
    return NextResponse.json(
      { error: "Error al actualizar rol" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/roles/:id - Eliminar rol
 *
 * Elimina un rol del sistema de forma permanente.
 * Solo se puede eliminar si NO tiene usuarios asignados (validación: usersCount === 0).
 * Cascada elimina todos los rolePermissions asociados.
 *
 * **Autenticación**: Requerida (permiso: `role:delete`)
 *
 * **URL Parameters**:
 * - `id` (string, requerido): UUID del rol a eliminar
 *
 * **Respuesta** (200):
 * ```json
 * {
 *   "success": true
 * }
 * ```
 *
 * **Errores**:
 * - 400: No se puede eliminar (rol tiene usuarios asignados)
 *   ```json
 *   { "error": "No se puede eliminar el rol porque tiene 3 usuario(s) asignado(s)" }
 *   ```
 * - 401: No autenticado (enviar JWT válido)
 * - 403: Sin permiso `role:delete` (solicitar al admin)
 * - 404: Rol no encontrado (ID inválido)
 * - 500: Error del servidor
 *
 * **Validaciones**:
 * - Rol debe existir (404 si no)
 * - Rol debe tener 0 usuarios asignados (400 si tiene usuarios)
 *
 * **Lógica**:
 * 1. Valida permiso `role:delete`
 * 2. Busca rol y obtiene _count.userRoles
 * 3. Verifica que rol existe (404 si no)
 * 4. Verifica que usersCount === 0 (400 si tiene usuarios)
 * 5. Elimina rol (cascade elimina rolePermissions)
 * 6. Emite evento ROLE_DELETED para auditoría
 *
 * **Cascada de Eliminación** (por configuración de BD):
 * - Elimina todos los registros en tabla `rolePermissions` para este rol
 * - NO elimina `userRoles` porque validación impide si existen
 * - NO elimina usuarios (rol solo se remueve, usuarios permanecen)
 *
 * **Efectos Secundarios**:
 * - Rol eliminado permanentemente (sin soft delete)
 * - Todos los rolePermissions del rol se eliminan
 * - Emite evento ROLE_DELETED para auditoría
 * - Registra en log: quién eliminó, cuándo, nombre del rol
 *
 * **Auditoría**:
 * - Evento: `ROLE_DELETED`
 * - Quién: usuario autenticado (session.user.id)
 * - Cuándo: timestamp ISO
 * - Qué: roleId, name, deletedBy
 *
 * **Consideraciones de Seguridad**:
 * - ✓ Verifica que rol no tiene usuarios (400 si tiene)
 * - ✓ Registra auditoría con usuario que eliminó
 * - ✓ Cascada elimina permisos (no quedan huérfanos)
 * - ⚠️ No hay período de gracia (eliminación inmediata)
 * - ⚠️ No hay soft delete (considerar para futuros requisitos)
 *
 * **Flujo Recomendado para Eliminar Rol con Usuarios**:
 * 1. Obtener rol: GET /api/admin/roles/:id
 * 2. Ver si tiene usuarios: si usersCount > 0
 * 3. Opción A: Reasignar usuarios a otro rol, luego DELETE
 * 4. Opción B: Eliminar usuarios, luego DELETE rol
 *
 * @method DELETE
 * @route /api/admin/roles/:id
 * @auth Requerida (JWT válido)
 * @permission role:delete
 *
 * @param {NextRequest} request - NextRequest HTTP
 * @param {object} context - Contexto de Next.js
 * @param {Promise<{id: string}>} context.params - Parámetros de URL
 * @returns {Promise<NextResponse>} { success: true } o error
 *
 * @example
 * ```typescript
 * // Eliminar rol (solo si no tiene usuarios)
 * const response = await fetch(`/api/admin/roles/${roleId}`, {
 *   method: 'DELETE',
 *   headers: {
 *     'Authorization': `Bearer ${session.user.token}`
 *   }
 * })
 *
 * if (response.ok) {
 *   console.log('Rol eliminado permanentemente')
 *   // Recargar lista de roles
 * } else if (response.status === 400) {
 *   const { error } = await response.json()
 *   console.error(error) // Ej: "No se puede eliminar el rol porque tiene 2 usuario(s) asignado(s)"
 * } else if (response.status === 404) {
 *   console.error('Rol no encontrado')
 * }
 * ```
 *
 * @see {@link ./route.ts#GET} para obtener rol
 * @see {@link ./route.ts#PATCH} para actualizar rol
 * @see {@link ../route.ts#POST} para crear rol
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.ROLE_DELETE)
    const session = await auth()

    const { id } = await params

    // Verificar que el rol existe
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    })

    if (!role) {
      return NextResponse.json(
        { error: "Rol no encontrado" },
        { status: 404 }
      )
    }

    // No permitir eliminar rol si tiene usuarios asignados
    if (role._count.userRoles > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar el rol porque tiene ${role._count.userRoles} usuario(s) asignado(s)` },
        { status: 400 }
      )
    }

    // Eliminar rol (cascade eliminará rolePermissions)
    await prisma.role.delete({
      where: { id },
    })

    // Dispatch event for role deletion audit
    await eventBus.dispatch(
      SystemEvent.ROLE_DELETED,
      {
        roleId: id,
        name: role.name,
        deletedBy: session?.user?.id || 'system',
      },
      {
        userId: session?.user?.id,
        area: EventArea.ADMIN,
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
    console.error("Error deleting role:", error)
    return NextResponse.json(
      { error: "Error al eliminar rol" },
      { status: 500 }
    )
  }
}
