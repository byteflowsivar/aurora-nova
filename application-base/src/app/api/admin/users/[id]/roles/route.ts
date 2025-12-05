/**
 * API Route: User Roles Management
 *
 * Endpoints para gestionar los roles asignados a un usuario específico.
 * Permite obtener, asignar y remover roles de usuarios.
 *
 * **Endpoints**:
 * - GET /api/admin/users/:id/roles - Obtener roles del usuario
 * - POST /api/admin/users/:id/roles - Asignar rol a usuario
 * - DELETE /api/admin/users/:id/roles - Remover rol de usuario
 *
 * @module api/admin/users/roles
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma/connection"
import { z } from "zod"
import { requirePermission } from "@/lib/server/require-permission"
import { SYSTEM_PERMISSIONS } from "@/modules/admin/types/permissions"
import { UnauthenticatedError, PermissionDeniedError } from "@/lib/server/require-permission"
import { eventBus, SystemEvent } from "@/lib/events"
import { EventArea } from "@/lib/events/event-area"

const assignRoleSchema = z.object({
  roleId: z.string().uuid("ID de rol inválido"),
})

/**
 * Obtiene todos los roles asignados a un usuario específico.
 *
 * Retorna una lista completa de roles que tiene el usuario, incluyendo
 * información sobre cada rol (ID, nombre, descripción, fecha de asignación).
 *
 * **Endpoint Details**:
 * - Method: GET
 * - Route: /api/admin/users/:id/roles
 * - Auth: Requiere permiso "user:read"
 * - Content-Type: application/json
 *
 * **Parámetros**:
 * - `:id` (path parameter): ID del usuario del cual obtener roles
 *
 * **Respuestas**:
 * - 200: Lista de roles obtenida exitosamente
 *   - Array de objetos con: { id, name, description, assignedAt }
 * - 401: Usuario no autenticado
 * - 403: Usuario no tiene permiso "user:read"
 * - 500: Error interno del servidor
 *
 * **Flujo**:
 * 1. Valida que el usuario tiene permiso "user:read"
 * 2. Extrae el ID del usuario desde los parámetros
 * 3. Obtiene todos los userRoles asociados al usuario
 * 4. Enriquece los datos con información del rol
 * 5. Retorna lista de roles asignados
 *
 * @async
 * @param {NextRequest} request - La solicitud HTTP
 * @param {object} context - Contexto de la ruta con parámetros
 * @param {Promise<{id: string}>} context.params - Parámetros de ruta
 * @returns {Promise<NextResponse>} Array de roles asignados al usuario
 *
 * @example
 * ```typescript
 * // Get roles of a user
 * const response = await fetch('/api/admin/users/user-123/roles');
 * const roles = await response.json();
 * // [
 * //   { id: 'admin', name: 'Administrator', description: '...', assignedAt: '2024-12-05T...' },
 * //   { id: 'editor', name: 'Editor', description: '...', assignedAt: '2024-12-04T...' }
 * // ]
 * ```
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.USER_READ)

    const { id } = await params

    const userRoles = await prisma.userRole.findMany({
      where: { userId: id },
      select: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        createdAt: true,
      },
    })

    return NextResponse.json(userRoles.map((ur) => ({
      ...ur.role,
      assignedAt: ur.createdAt,
    })))
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
    console.error("Error fetching user roles:", error)
    return NextResponse.json(
      { error: "Error al obtener roles del usuario" },
      { status: 500 }
    )
  }
}

/**
 * Asigna un rol a un usuario específico.
 *
 * Crea una nueva relación entre un usuario y un rol, dándole al usuario
 * acceso a todos los permisos del rol. Valida que ambos existen y que no
 * tienen una asignación previa.
 *
 * **Endpoint Details**:
 * - Method: POST
 * - Route: /api/admin/users/:id/roles
 * - Auth: Requiere permiso "user:assign_roles"
 * - Content-Type: application/json
 *
 * **Parámetros**:
 * - `:id` (path parameter): ID del usuario al cual asignar el rol
 * - `roleId` (body): ID del rol a asignar (debe ser UUID válido)
 *
 * **Respuestas**:
 * - 201: Rol asignado exitosamente
 *   - `{ success: true }`
 * - 400: Datos inválidos (roleId faltante o formato incorrecto)
 * - 401: Usuario no autenticado
 * - 403: Usuario no tiene permiso "user:assign_roles"
 * - 404: Usuario o rol no encontrado
 * - 409: El usuario ya tiene este rol asignado
 * - 500: Error interno del servidor
 *
 * **Flujo**:
 * 1. Valida que el usuario tiene permiso "user:assign_roles"
 * 2. Obtiene el ID del usuario desde los parámetros
 * 3. Extrae el `roleId` del body JSON
 * 4. Valida los datos con `assignRoleSchema`
 * 5. Verifica que el usuario existe
 * 6. Verifica que el rol existe
 * 7. Verifica que no existe una asignación previa
 * 8. Crea la relación userRole
 * 9. Emite evento `USER_ROLE_ASSIGNED` para auditoría
 *
 * **Seguridad**:
 * - Valida existencia de usuario y rol antes de crear relación
 * - Previene duplicados (409 si ya existe)
 * - UUID validation en roleId para evitar inyecciones
 * - Auditoría completa con evento
 * - Requiere permiso específico para asignar
 *
 * **Eventos Emitidos**:
 * - `SystemEvent.USER_ROLE_ASSIGNED`: Evento para auditoría
 *   - Contiene: userId, roleId, roleName, assignedBy
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
 * // Assign a role to a user
 * const response = await fetch('/api/admin/users/user-123/roles', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ roleId: '550e8400-e29b-41d4-a716-446655440000' }),
 * });
 * if (response.status === 201) {
 *   console.log('Role assigned successfully');
 * }
 * ```
 *
 * @see {@link delete} para remover roles de usuarios
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar permiso
    await requirePermission(SYSTEM_PERMISSIONS.USER_ASSIGN_ROLES)

    const session = await auth()

    const { id } = await params
    const body = await request.json()

    // Validar datos
    const validationResult = assignRoleSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { roleId } = validationResult.data

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Verificar que el rol existe
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    })

    if (!role) {
      return NextResponse.json(
        { error: "Rol no encontrado" },
        { status: 404 }
      )
    }

    // Verificar si ya tiene el rol
    const existingAssignment = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: id,
          roleId: roleId,
        },
      },
    })

    if (existingAssignment) {
      return NextResponse.json(
        { error: "El usuario ya tiene este rol asignado" },
        { status: 409 }
      )
    }

    // Asignar rol
    await prisma.userRole.create({
      data: {
        userId: id,
        roleId: roleId,
        createdBy: session?.user?.id || "",
      },
    })

    // Dispatch event for user role assignment audit
    await eventBus.dispatch(
      SystemEvent.USER_ROLE_ASSIGNED,
      {
        userId: id,
        roleId: roleId,
        roleName: role.name,
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
    console.error("Error assigning role:", error)
    return NextResponse.json(
      { error: "Error al asignar rol" },
      { status: 500 }
    )
  }
}

/**
 * Remueve un rol de un usuario específico.
 *
 * Elimina la relación entre un usuario y un rol, revocando el acceso a todos
 * los permisos del rol para ese usuario. Valida que la asignación existe
 * antes de eliminarla.
 *
 * **Endpoint Details**:
 * - Method: DELETE
 * - Route: /api/admin/users/:id/roles?roleId=:roleId
 * - Auth: Requiere permiso "user:assign_roles"
 * - Content-Type: application/json
 *
 * **Parámetros**:
 * - `:id` (path parameter): ID del usuario del cual remover el rol
 * - `roleId` (query parameter): ID del rol a remover
 *
 * **Respuestas**:
 * - 200: Rol removido exitosamente
 *   - `{ success: true }`
 * - 400: Parámetro `roleId` faltante
 * - 401: Usuario no autenticado
 * - 403: Usuario no tiene permiso "user:assign_roles"
 * - 404: Usuario, rol, o asignación no encontrada
 * - 500: Error interno del servidor
 *
 * **Flujo**:
 * 1. Valida que el usuario tiene permiso "user:assign_roles"
 * 2. Obtiene el ID del usuario desde los parámetros
 * 3. Extrae `roleId` desde query parameters
 * 4. Verifica que `roleId` fue proporcionado
 * 5. Obtiene la asignación actual (para datos de auditoría)
 * 6. Verifica que la asignación existe
 * 7. Elimina la relación userRole
 * 8. Emite evento `USER_ROLE_REMOVED` para auditoría
 *
 * **Seguridad**:
 * - Verifica que la asignación existe antes de eliminarla
 * - Recopila datos completos antes de eliminar para auditoría
 * - Auditoría completa con evento
 * - Requiere permiso específico
 * - Los permisos del rol son revocados inmediatamente
 *
 * **Eventos Emitidos**:
 * - `SystemEvent.USER_ROLE_REMOVED`: Evento para auditoría
 *   - Contiene: userId, roleId, roleName, removedBy
 *   - Area: ADMIN
 *
 * **Impacto**:
 * - El usuario pierda acceso a todos los permisos del rol inmediatamente
 * - Si es el último rol del usuario, quedaría sin permisos
 * - Cambio se refleja en próxima autenticación o refresh de sesión
 *
 * @async
 * @param {NextRequest} request - La solicitud HTTP
 * @param {object} context - Contexto de la ruta con parámetros
 * @param {Promise<{id: string}>} context.params - Parámetros de ruta
 * @returns {Promise<NextResponse>} { success: true } o error
 *
 * @example
 * ```typescript
 * // Remove a role from a user
 * const response = await fetch('/api/admin/users/user-123/roles?roleId=550e8400-e29b-41d4-a716-446655440000', {
 *   method: 'DELETE',
 * });
 * if (response.ok) {
 *   console.log('Role removed successfully');
 * }
 * ```
 *
 * @see {@link POST} para asignar roles a usuarios
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.USER_ASSIGN_ROLES)
    const session = await auth()

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get("roleId")

    if (!roleId) {
      return NextResponse.json(
        { error: "roleId es requerido" },
        { status: 400 }
      )
    }

    // Obtener datos antes de eliminar para el evento
    const userRoleData = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: id,
          roleId: roleId,
        },
      },
      include: {
        user: true,
        role: true,
      },
    })

    if (!userRoleData) {
      return NextResponse.json(
        { error: "Asignación no encontrada" },
        { status: 404 }
      )
    }

    // Eliminar asignación
    await prisma.userRole.deleteMany({
      where: {
        userId: id,
        roleId: roleId,
      },
    })

    // Dispatch event for user role removal audit
    await eventBus.dispatch(
      SystemEvent.USER_ROLE_REMOVED,
      {
        userId: id,
        roleId: roleId,
        roleName: userRoleData.role.name,
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
    console.error("Error removing role:", error)
    return NextResponse.json(
      { error: "Error al remover rol" },
      { status: 500 }
    )
  }
}
