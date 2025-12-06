/**
 * API Route - Admin Role Permissions Management - Aurora Nova
 *
 * Endpoints para gestionar los permisos asignados a un rol específico.
 * Permite obtener, asignar y remover permisos de roles con validación, deduplicación y auditoría.
 *
 * **Endpoints**:
 * - GET /api/admin/roles/:id/permissions - Obtener todos los permisos del rol
 * - POST /api/admin/roles/:id/permissions - Asignar nuevo permiso a rol (validando que no exista)
 * - DELETE /api/admin/roles/:id/permissions?permissionId=... - Remover permiso de rol
 *
 * **Patrones de Seguridad**:
 * - Validación de rol existente (404 si no)
 * - Validación de permiso existente (404 si no)
 * - Deduplicación: previene asignar permiso si ya lo tiene (409)
 * - Auditoría completa: ROLE_PERMISSION_ASSIGNED, ROLE_PERMISSION_REMOVED
 * - Permisos distintos: ROLE_READ para GET, ROLE_ASSIGN_PERMISSIONS para POST/DELETE
 *
 * **Casos de Uso**:
 * 1. Dashboard admin: mostrar permisos del rol
 * 2. Configuración: asignar/remover permisos a roles
 * 3. Auditoría: registrar cambios en permisos para compliance
 *
 * @module api/admin/roles/[id]/permissions
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma/connection"
import { z } from "zod"
import { requirePermission } from "@/lib/server/require-permission"
import { SYSTEM_PERMISSIONS } from "@/modules/admin/types/permissions"
import { UnauthenticatedError, PermissionDeniedError } from "@/lib/server/require-permission"
import { auth } from "@/lib/auth"
import { eventBus, SystemEvent } from "@/lib/events"
import { EventArea } from "@/lib/events/event-area"

const assignPermissionSchema = z.object({
  permissionId: z.string().min(1, "ID de permiso inválido"),
})

/**
 * GET /api/admin/roles/:id/permissions - Obtener permisos del rol
 *
 * Obtiene todos los permisos asignados a un rol específico.
 * Retorna lista con información de cada permiso (ID, módulo, descripción, fecha asignación).
 *
 * **Autenticación**: Requerida (permiso: `role:read`)
 *
 * **URL Parameters**:
 * - `id` (string, requerido): UUID del rol cuyos permisos se desea obtener
 *
 * **Respuesta** (200):
 * ```json
 * [
 *   {
 *     "id": "user:create",
 *     "module": "user",
 *     "description": "Crear nuevos usuarios",
 *     "createdAt": "2024-01-01T00:00:00Z",
 *     "assignedAt": "2024-12-05T12:00:00Z"
 *   },
 *   {
 *     "id": "user:delete",
 *     "module": "user",
 *     "description": "Eliminar usuarios",
 *     "createdAt": "2024-01-01T00:00:00Z",
 *     "assignedAt": "2024-12-04T12:00:00Z"
 *   }
 * ]
 * ```
 *
 * **Errores**:
 * - 401: No autenticado (enviar JWT válido)
 * - 403: Sin permiso `role:read` (solicitar al admin)
 * - 500: Error del servidor
 *
 * **Performance**:
 * - Query directa a rolePermission con select específico
 * - Mapea permisos enriquecidos con assignedAt
 * - Típicamente < 50ms
 *
 * **Flujo**:
 * 1. Valida permiso `role:read`
 * 2. Extrae ID del rol desde URL
 * 3. Busca todos rolePermissions para este rol
 * 4. Enriquece cada permiso con assignedAt (createdAt del rolePermission)
 * 5. Retorna array de permisos
 *
 * @method GET
 * @route /api/admin/roles/:id/permissions
 * @auth Requerida (JWT válido)
 * @permission role:read
 *
 * @param {NextRequest} request - NextRequest HTTP
 * @param {object} context - Contexto de Next.js
 * @param {Promise<{id: string}>} context.params - Parámetros de URL
 * @returns {Promise<NextResponse>} Array de permisos asignados
 *
 * @example
 * ```typescript
 * // Obtener todos los permisos de un rol
 * const response = await fetch(`/api/admin/roles/${roleId}/permissions`, {
 *   headers: {
 *     'Authorization': `Bearer ${session.user.token}`
 *   }
 * })
 *
 * if (response.ok) {
 *   const permissions = await response.json()
 *   console.log(`Rol tiene ${permissions.length} permisos`)
 *   permissions.forEach(p => console.log(`- ${p.id}: ${p.description}`))
 * }
 * ```
 *
 * @see {@link ./route.ts#POST} para asignar permiso
 * @see {@link ./route.ts#DELETE} para remover permiso
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.ROLE_READ)

    const { id } = await params

    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId: id },
      select: {
        permission: {
          select: {
            id: true,
            module: true,
            description: true,
            createdAt: true,
          },
        },
        createdAt: true,
      },
    })

    return NextResponse.json(rolePermissions.map((rp) => ({
      ...rp.permission,
      assignedAt: rp.createdAt,
    })))
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
    console.error("Error fetching role permissions:", error)
    return NextResponse.json(
      { error: "Error al obtener permisos del rol" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/roles/:id/permissions - Asignar permiso a rol
 *
 * Asigna un nuevo permiso a un rol específico.
 * Crea relación entre rol y permiso, otorgando acceso a todos los usuarios con ese rol.
 * Previene duplicados: error 409 si ya tiene el permiso asignado.
 *
 * **Autenticación**: Requerida (permiso: `role:assign_permissions`)
 *
 * **URL Parameters**:
 * - `id` (string, requerido): UUID del rol al cual asignar permiso
 *
 * **Body Esperado**:
 * ```json
 * {
 *   "permissionId": "string (requerido, debe existir)"
 * }
 * ```
 *
 * **Respuesta** (201):
 * ```json
 * {
 *   "success": true
 * }
 * ```
 *
 * **Errores**:
 * - 400: Datos inválidos (permissionId faltante)
 *   - Validación Zod: permissionId debe tener al menos 1 char
 * - 401: No autenticado (enviar JWT válido)
 * - 403: Sin permiso `role:assign_permissions` (solicitar al admin)
 * - 404: Rol no encontrado o Permiso no encontrado
 * - 409: Rol ya tiene este permiso asignado (deduplicación)
 * - 500: Error del servidor
 *
 * **Validaciones**:
 * - permissionId: debe ser no vacío (mín 1 char)
 * - Rol: debe existir en BD (404 si no)
 * - Permiso: debe existir en BD (404 si no)
 * - Unicidad: no puede asignar si ya existe relación (409)
 *
 * **Lógica**:
 * 1. Valida existencia de rol (404 si no)
 * 2. Valida existencia de permiso (404 si no)
 * 3. Valida que no existe asignación previa (409 si existe)
 * 4. Crea rolePermission
 * 5. Emite evento ROLE_PERMISSION_ASSIGNED para auditoría
 *
 * **Efectos Secundarios**:
 * - Crea registro en tabla `rolePermission`
 * - Todos los usuarios con este rol obtienen acceso inmediato al permiso
 * - Cambio se refleja en próxima sesión o refresh de JWT
 * - Emite evento para auditoría
 *
 * **Auditoría**:
 * - Evento: `ROLE_PERMISSION_ASSIGNED`
 * - Quién: usuario autenticado (session.user.id)
 * - Cuándo: timestamp ISO
 * - Qué: roleId, roleName, permissionId, permissionName (módulo), assignedBy
 *
 * @method POST
 * @route /api/admin/roles/:id/permissions
 * @auth Requerida (JWT válido)
 * @permission role:assign_permissions
 *
 * @param {NextRequest} request - NextRequest con body JSON
 * @param {object} context - Contexto de Next.js
 * @param {Promise<{id: string}>} context.params - Parámetros de URL
 * @returns {Promise<NextResponse>} { success: true } (201) o error
 *
 * @example
 * ```typescript
 * // Asignar permiso "user:create" a rol
 * const response = await fetch(`/api/admin/roles/${roleId}/permissions`, {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': `Bearer ${session.user.token}`
 *   },
 *   body: JSON.stringify({ permissionId: 'user:create' })
 * })
 *
 * if (response.status === 201) {
 *   console.log('Permiso asignado exitosamente')
 *   // Refrescar lista de permisos del rol
 * } else if (response.status === 409) {
 *   console.error('Rol ya tiene este permiso')
 * } else if (response.status === 404) {
 *   console.error('Rol o permiso no encontrado')
 * }
 * ```
 *
 * @see {@link ./route.ts#GET} para obtener permisos del rol
 * @see {@link ./route.ts#DELETE} para remover permiso
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.ROLE_ASSIGN_PERMISSIONS)
    const session = await auth()

    const { id } = await params
    const body = await request.json()

    // Validar datos
    const validationResult = assignPermissionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { permissionId } = validationResult.data

    // Verificar que el rol existe
    const role = await prisma.role.findUnique({
      where: { id },
    })

    if (!role) {
      return NextResponse.json(
        { error: "Rol no encontrado" },
        { status: 404 }
      )
    }

    // Verificar que el permiso existe
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
    })

    if (!permission) {
      return NextResponse.json(
        { error: "Permiso no encontrado" },
        { status: 404 }
      )
    }

    // Verificar si ya tiene el permiso
    const existingAssignment = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: id,
          permissionId: permissionId,
        },
      },
    })

    if (existingAssignment) {
      return NextResponse.json(
        { error: "El rol ya tiene este permiso asignado" },
        { status: 409 }
      )
    }

    // Asignar permiso
    await prisma.rolePermission.create({
      data: {
        roleId: id,
        permissionId: permissionId,
      },
    })

    // Dispatch event for role permission assignment audit
    await eventBus.dispatch(
      SystemEvent.ROLE_PERMISSION_ASSIGNED,
      {
        roleId: id,
        roleName: role.name,
        permissionId: permissionId,
        permissionName: permission.module,
        assignedBy: session?.user?.id || 'system',
      },
      {
        userId: session?.user?.id,
        area: EventArea.ADMIN,
      }
    )

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
    console.error("Error assigning permission:", error)
    return NextResponse.json(
      { error: "Error al asignar permiso" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/roles/:id/permissions - Remover permiso de rol
 *
 * Remueve un permiso de un rol específico.
 * Elimina relación rol-permiso, revocando acceso a funcionalidad para todos con ese rol.
 * Valida que la asignación existe antes de eliminarla.
 *
 * **Autenticación**: Requerida (permiso: `role:assign_permissions`)
 *
 * **URL Parameters**:
 * - `id` (string, requerido): UUID del rol del cual remover permiso
 * - `permissionId` (query string, requerido): ID del permiso a remover
 *
 * **Respuesta** (200):
 * ```json
 * {
 *   "success": true
 * }
 * ```
 *
 * **Errores**:
 * - 400: Parámetro `permissionId` no proporcionado en query string
 *   ```json
 *   { "error": "permissionId es requerido" }
 *   ```
 * - 401: No autenticado (enviar JWT válido)
 * - 403: Sin permiso `role:assign_permissions` (solicitar al admin)
 * - 404: Asignación no encontrada (rol no tiene este permiso)
 * - 500: Error del servidor
 *
 * **Validaciones**:
 * - permissionId: requerido en query string
 * - Asignación: debe existir (404 si no existe rolePermission para este rol+permiso)
 *
 * **Lógica**:
 * 1. Valida que permissionId está en query string (400 si no)
 * 2. Busca asignación para obtener datos (para auditoría)
 * 3. Verifica que asignación existe (404 si no)
 * 4. Elimina la relación rolePermission
 * 5. Emite evento ROLE_PERMISSION_REMOVED para auditoría
 *
 * **Efectos Secundarios**:
 * - Elimina registro en tabla `rolePermission`
 * - Todos los usuarios con este rol pierden acceso a funcionalidad del permiso
 * - Cambio se refleja en próxima sesión o refresh de JWT
 * - Emite evento para auditoría
 *
 * **Auditoría**:
 * - Evento: `ROLE_PERMISSION_REMOVED`
 * - Quién: usuario autenticado (session.user.id)
 * - Cuándo: timestamp ISO
 * - Qué: roleId, roleName, permissionId, permissionName (módulo), removedBy
 *
 * **Consideraciones**:
 * - ✓ Recopila datos antes de eliminar para auditoría
 * - ✓ Valida que asignación existe (404 si no)
 * - ⚠️ Cambio no es inmediato en sesión actual (requiere refresh)
 * - ⚠️ No hay safeguards contra remover permisos críticos
 *
 * @method DELETE
 * @route /api/admin/roles/:id/permissions?permissionId=...
 * @auth Requerida (JWT válido)
 * @permission role:assign_permissions
 *
 * @param {NextRequest} request - NextRequest HTTP
 * @param {object} context - Contexto de Next.js
 * @param {Promise<{id: string}>} context.params - Parámetros de URL
 * @returns {Promise<NextResponse>} { success: true } o error
 *
 * @example
 * ```typescript
 * // Remover permiso de rol
 * const response = await fetch(
 *   `/api/admin/roles/${roleId}/permissions?permissionId=${permissionId}`,
 *   {
 *     method: 'DELETE',
 *     headers: {
 *       'Authorization': `Bearer ${session.user.token}`
 *     }
 *   }
 * )
 *
 * if (response.ok) {
 *   console.log('Permiso removido exitosamente')
 *   // Refrescar lista de permisos del rol
 * } else if (response.status === 404) {
 *   console.error('Rol no tiene este permiso')
 * } else if (response.status === 400) {
 *   console.error('permissionId requerido en query string')
 * }
 * ```
 *
 * @see {@link ./route.ts#GET} para obtener permisos del rol
 * @see {@link ./route.ts#POST} para asignar permiso
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.ROLE_ASSIGN_PERMISSIONS)
    const session = await auth()

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const permissionId = searchParams.get("permissionId")

    if (!permissionId) {
      return NextResponse.json(
        { error: "permissionId es requerido" },
        { status: 400 }
      )
    }

    // Obtener datos antes de eliminar para el evento
    const rolePermissionData = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: id,
          permissionId: permissionId,
        },
      },
      include: {
        role: true,
        permission: true,
      },
    })

    if (!rolePermissionData) {
      return NextResponse.json(
        { error: "Asignación no encontrada" },
        { status: 404 }
      )
    }

    // Eliminar asignación
    await prisma.rolePermission.deleteMany({
      where: {
        roleId: id,
        permissionId: permissionId,
      },
    })

    // Dispatch event for role permission removal audit
    await eventBus.dispatch(
      SystemEvent.ROLE_PERMISSION_REMOVED,
      {
        roleId: id,
        roleName: rolePermissionData.role.name,
        permissionId: permissionId,
        permissionName: rolePermissionData.permission.module,
        removedBy: session?.user?.id || 'system',
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
    console.error("Error removing permission:", error)
    return NextResponse.json(
      { error: "Error al remover permiso" },
      { status: 500 }
    )
  }
}
