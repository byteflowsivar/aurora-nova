/**
 * API Route: Role Permissions Management
 *
 * Endpoints para gestionar los permisos asignados a un rol específico.
 * Permite obtener, asignar y remover permisos de roles.
 *
 * **Endpoints**:
 * - GET /api/admin/roles/:id/permissions - Obtener permisos del rol
 * - POST /api/admin/roles/:id/permissions - Asignar permiso a rol
 * - DELETE /api/admin/roles/:id/permissions - Remover permiso de rol
 *
 * @module api/admin/roles/permissions
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
 * Obtiene todos los permisos asignados a un rol específico.
 *
 * Retorna una lista completa de permisos que tiene el rol, incluyendo
 * información sobre cada permiso (ID, módulo, descripción, fecha de asignación).
 *
 * **Endpoint Details**:
 * - Method: GET
 * - Route: /api/admin/roles/:id/permissions
 * - Auth: Requiere permiso "role:read"
 * - Content-Type: application/json
 *
 * **Parámetros**:
 * - `:id` (path parameter): ID del rol del cual obtener permisos
 *
 * **Respuestas**:
 * - 200: Lista de permisos obtenida exitosamente
 *   - Array de objetos con: { id, module, description, createdAt, assignedAt }
 * - 401: Usuario no autenticado
 * - 403: Usuario no tiene permiso "role:read"
 * - 500: Error interno del servidor
 *
 * **Flujo**:
 * 1. Valida que el usuario tiene permiso "role:read"
 * 2. Extrae el ID del rol desde los parámetros
 * 3. Obtiene todos los rolePermissions asociados al rol
 * 4. Enriquece los datos con información del permiso
 * 5. Retorna lista de permisos asignados
 *
 * @async
 * @param {NextRequest} request - La solicitud HTTP
 * @param {object} context - Contexto de la ruta con parámetros
 * @param {Promise<{id: string}>} context.params - Parámetros de ruta
 * @returns {Promise<NextResponse>} Array de permisos asignados al rol
 *
 * @example
 * ```typescript
 * // Get permissions of a role
 * const response = await fetch('/api/admin/roles/role-123/permissions');
 * const permissions = await response.json();
 * // [
 * //   { id: 'perm-1', module: 'user', description: 'View users', assignedAt: '2024-12-05T...' },
 * //   { id: 'perm-2', module: 'user', description: 'Create users', assignedAt: '2024-12-05T...' }
 * // ]
 * ```
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
 * Asigna un permiso a un rol específico.
 *
 * Crea una nueva relación entre un rol y un permiso, permitiendo que los usuarios
 * con ese rol tengan acceso a la funcionalidad del permiso. Valida que ambos existen
 * y que no tienen una asignación previa.
 *
 * **Endpoint Details**:
 * - Method: POST
 * - Route: /api/admin/roles/:id/permissions
 * - Auth: Requiere permiso "role:assign_permissions"
 * - Content-Type: application/json
 *
 * **Parámetros**:
 * - `:id` (path parameter): ID del rol al cual asignar el permiso
 * - `permissionId` (body): ID del permiso a asignar
 *
 * **Respuestas**:
 * - 201: Permiso asignado exitosamente
 *   - `{ success: true }`
 * - 400: Datos inválidos (permissionId faltante o formato incorrecto)
 * - 401: Usuario no autenticado
 * - 403: Usuario no tiene permiso "role:assign_permissions"
 * - 404: Rol o permiso no encontrado
 * - 409: El rol ya tiene este permiso asignado
 * - 500: Error interno del servidor
 *
 * **Flujo**:
 * 1. Valida que el usuario tiene permiso "role:assign_permissions"
 * 2. Obtiene el ID del rol desde los parámetros
 * 3. Extrae el `permissionId` del body JSON
 * 4. Valida los datos con `assignPermissionSchema`
 * 5. Verifica que el rol existe
 * 6. Verifica que el permiso existe
 * 7. Verifica que no existe una asignación previa
 * 8. Crea la relación rolePermission
 * 9. Emite evento `ROLE_PERMISSION_ASSIGNED` para auditoría
 *
 * **Seguridad**:
 * - Valida existencia de rol y permiso antes de crear relación
 * - Previene duplicados (409 si ya existe)
 * - Auditoría completa con evento
 * - Requiere permiso específico para asignar
 *
 * **Eventos Emitidos**:
 * - `SystemEvent.ROLE_PERMISSION_ASSIGNED`: Evento para auditoría
 *   - Contiene: roleId, roleName, permissionId, permissionName, assignedBy
 *   - Area: ADMIN
 *
 * @async
 * @param {NextRequest} request - La solicitud HTTP con body JSON
 * @param {object} context - Contexto de la ruta con parámetros
 * @param {Promise<{id: string}>} context.params - Parámetros de ruta
 * @returns {Promise<NextResponse>} { success: true } o error
 *
 * @example
 * ```typescript
 * // Assign a permission to a role
 * const response = await fetch('/api/admin/roles/role-123/permissions', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ permissionId: 'user:create' }),
 * });
 * if (response.status === 201) {
 *   console.log('Permission assigned successfully');
 * }
 * ```
 *
 * @see {@link delete} para remover permisos de roles
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
 * Remueve un permiso de un rol específico.
 *
 * Elimina la relación entre un rol y un permiso, revocando el acceso a esa
 * funcionalidad para todos los usuarios con ese rol. Valida que la asignación
 * existe antes de eliminarla.
 *
 * **Endpoint Details**:
 * - Method: DELETE
 * - Route: /api/admin/roles/:id/permissions?permissionId=:permissionId
 * - Auth: Requiere permiso "role:assign_permissions"
 * - Content-Type: application/json
 *
 * **Parámetros**:
 * - `:id` (path parameter): ID del rol del cual remover el permiso
 * - `permissionId` (query parameter): ID del permiso a remover
 *
 * **Respuestas**:
 * - 200: Permiso removido exitosamente
 *   - `{ success: true }`
 * - 400: Parámetro `permissionId` faltante
 * - 401: Usuario no autenticado
 * - 403: Usuario no tiene permiso "role:assign_permissions"
 * - 404: Rol, permiso, o asignación no encontrada
 * - 500: Error interno del servidor
 *
 * **Flujo**:
 * 1. Valida que el usuario tiene permiso "role:assign_permissions"
 * 2. Obtiene el ID del rol desde los parámetros
 * 3. Extrae `permissionId` desde query parameters
 * 4. Verifica que `permissionId` fue proporcionado
 * 5. Obtiene la asignación actual (para datos de auditoría)
 * 6. Verifica que la asignación existe
 * 7. Elimina la relación rolePermission
 * 8. Emite evento `ROLE_PERMISSION_REMOVED` para auditoría
 *
 * **Seguridad**:
 * - Verifica que la asignación existe antes de eliminarla
 * - Recopila datos completos antes de eliminar para auditoría
 * - Auditoría completa con evento
 * - Requiere permiso específico
 *
 * **Eventos Emitidos**:
 * - `SystemEvent.ROLE_PERMISSION_REMOVED`: Evento para auditoría
 *   - Contiene: roleId, roleName, permissionId, permissionName, removedBy
 *   - Area: ADMIN
 *
 * @async
 * @param {NextRequest} request - La solicitud HTTP
 * @param {object} context - Contexto de la ruta con parámetros
 * @param {Promise<{id: string}>} context.params - Parámetros de ruta
 * @returns {Promise<NextResponse>} { success: true } o error
 *
 * @example
 * ```typescript
 * // Remove a permission from a role
 * const response = await fetch('/api/admin/roles/role-123/permissions?permissionId=user:create', {
 *   method: 'DELETE',
 * });
 * if (response.ok) {
 *   console.log('Permission removed successfully');
 * }
 * ```
 *
 * @see {@link POST} para asignar permisos a roles
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
