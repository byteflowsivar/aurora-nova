/**
 * API Route - Admin User Roles Management - Aurora Nova
 *
 * Endpoints para gestionar los roles asignados a un usuario específico.
 * Permite obtener, asignar y remover roles de usuarios con validación, deduplicación y auditoría.
 *
 * **Endpoints**:
 * - GET /api/admin/users/:id/roles - Obtener todos los roles del usuario
 * - POST /api/admin/users/:id/roles - Asignar nuevo rol a usuario (validando que no exista)
 * - DELETE /api/admin/users/:id/roles?roleId=... - Remover rol de usuario
 *
 * **Patrones de Seguridad**:
 * - Validación de usuario existente (404 si no)
 * - Validación de rol existente (404 si no)
 * - Deduplicación: previene asignar rol si ya lo tiene (409)
 * - Auditoría completa: USER_ROLE_ASSIGNED, USER_ROLE_REMOVED
 * - Permisos distintos: USER_READ para GET, USER_ASSIGN_ROLES para POST/DELETE
 *
 * **Casos de Uso**:
 * 1. Dashboard admin: mostrar roles del usuario
 * 2. Administración: asignar/remover roles a usuarios
 * 3. Auditoría: registrar cambios en roles para compliance
 *
 * @module api/admin/users/[id]/roles
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
 * GET /api/admin/users/:id/roles - Obtener roles del usuario
 *
 * Obtiene todos los roles asignados a un usuario específico.
 * Retorna lista completa de roles con información de cada uno (ID, nombre, descripción, fecha asignación).
 *
 * **Autenticación**: Requerida (permiso: `user:read`)
 *
 * **URL Parameters**:
 * - `id` (string, requerido): UUID del usuario cuyo roles se desea obtener
 *
 * **Respuesta** (200):
 * ```json
 * [
 *   {
 *     "id": "uuid",
 *     "name": "admin",
 *     "description": "Administrador del sistema",
 *     "assignedAt": "2024-01-01T00:00:00Z"
 *   },
 *   {
 *     "id": "uuid",
 *     "name": "editor",
 *     "description": "Editor de contenidos",
 *     "assignedAt": "2024-01-02T00:00:00Z"
 *   }
 * ]
 * ```
 *
 * **Errores**:
 * - 401: No autenticado (enviar JWT válido)
 * - 403: Sin permiso `user:read` (solicitar al admin)
 * - 500: Error del servidor
 *
 * **Performance**:
 * - Query directa a userRole con select específico
 * - Mapea roles enriquecidos con assignedAt
 * - Típicamente < 50ms
 *
 * **Flujo**:
 * 1. Valida permiso `user:read`
 * 2. Extrae ID del usuario desde URL
 * 3. Busca todos userRoles para este usuario
 * 4. Enriquece cada rol con assignedAt (createdAt del userRole)
 * 5. Retorna array de roles
 *
 * @method GET
 * @route /api/admin/users/:id/roles
 * @auth Requerida (JWT válido)
 * @permission user:read
 *
 * @param {NextRequest} request - NextRequest HTTP
 * @param {object} context - Contexto de Next.js
 * @param {Promise<{id: string}>} context.params - Parámetros de URL
 * @returns {Promise<NextResponse>} Array de roles asignados
 *
 * @example
 * ```typescript
 * // Obtener todos los roles de un usuario
 * const response = await fetch(`/api/admin/users/${userId}/roles`, {
 *   headers: {
 *     'Authorization': `Bearer ${session.user.token}`
 *   }
 * })
 *
 * if (response.ok) {
 *   const roles = await response.json()
 *   console.log(`Usuario tiene ${roles.length} roles`)
 *   roles.forEach(r => console.log(`- ${r.name}: ${r.description}`))
 * }
 * ```
 *
 * @see {@link ./route.ts#POST} para asignar rol
 * @see {@link ./route.ts#DELETE} para remover rol
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
 * POST /api/admin/users/:id/roles - Asignar rol a usuario
 *
 * Asigna un nuevo rol a un usuario específico.
 * Crea relación entre usuario y rol, dándole acceso a todos los permisos del rol.
 * Previene duplicados: error 409 si ya tiene el rol asignado.
 *
 * **Autenticación**: Requerida (permiso: `user:assign_roles`)
 *
 * **URL Parameters**:
 * - `id` (string, requerido): UUID del usuario al cual asignar rol
 *
 * **Body Esperado**:
 * ```json
 * {
 *   "roleId": "string (UUID válido, debe existir)"
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
 * - 400: Datos inválidos (roleId faltante, no es UUID válido)
 *   - Validación Zod: roleId debe ser UUID
 * - 401: No autenticado (enviar JWT válido)
 * - 403: Sin permiso `user:assign_roles` (solicitar al admin)
 * - 404: Usuario no encontrado o Rol no encontrado
 * - 409: Usuario ya tiene este rol asignado (deduplicación)
 * - 500: Error del servidor
 *
 * **Validaciones**:
 * - roleId: debe ser UUID válido (formato)
 * - Usuario: debe existir en BD (404 si no)
 * - Rol: debe existir en BD (404 si no)
 * - Unicidad: no puede asignar si ya existe relación (409)
 *
 * **Lógica**:
 * 1. Valida existencia de usuario (404 si no)
 * 2. Valida existencia de rol (404 si no)
 * 3. Valida que no existe asignación previa (409 si existe)
 * 4. Crea userRole con createdBy (usuario actual)
 * 5. Emite evento USER_ROLE_ASSIGNED para auditoría
 *
 * **Efectos Secundarios**:
 * - Crea registro en tabla `userRole`
 * - Usuario obtiene acceso inmediato a permisos del rol
 * - Cambio se refleja en próxima sesión o refresh de JWT
 * - Emite evento para auditoría
 *
 * **Auditoría**:
 * - Evento: `USER_ROLE_ASSIGNED`
 * - Quién: usuario autenticado (session.user.id)
 * - Cuándo: timestamp ISO
 * - Qué: userId, roleId, roleName, assignedBy
 *
 * @method POST
 * @route /api/admin/users/:id/roles
 * @auth Requerida (JWT válido)
 * @permission user:assign_roles
 *
 * @param {NextRequest} request - NextRequest con body JSON
 * @param {object} context - Contexto de Next.js
 * @param {Promise<{id: string}>} context.params - Parámetros de URL
 * @returns {Promise<NextResponse>} { success: true } (201) o error
 *
 * @example
 * ```typescript
 * // Asignar rol "admin" a usuario
 * const response = await fetch(`/api/admin/users/${userId}/roles`, {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': `Bearer ${session.user.token}`
 *   },
 *   body: JSON.stringify({ roleId: adminRoleId })
 * })
 *
 * if (response.status === 201) {
 *   console.log('Rol asignado exitosamente')
 *   // Refrescar lista de roles del usuario
 * } else if (response.status === 409) {
 *   console.error('Usuario ya tiene este rol')
 * } else if (response.status === 404) {
 *   console.error('Usuario o rol no encontrado')
 * }
 * ```
 *
 * @see {@link ./route.ts#GET} para obtener roles del usuario
 * @see {@link ./route.ts#DELETE} para remover rol
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
 * DELETE /api/admin/users/:id/roles - Remover rol de usuario
 *
 * Remueve un rol de un usuario específico.
 * Elimina relación usuario-rol, revocando acceso a todos los permisos del rol.
 * Valida que la asignación existe antes de eliminarla.
 *
 * **Autenticación**: Requerida (permiso: `user:assign_roles`)
 *
 * **URL Parameters**:
 * - `id` (string, requerido): UUID del usuario del cual remover rol
 * - `roleId` (query string, requerido): UUID del rol a remover
 *
 * **Respuesta** (200):
 * ```json
 * {
 *   "success": true
 * }
 * ```
 *
 * **Errores**:
 * - 400: Parámetro `roleId` no proporcionado en query string
 *   ```json
 *   { "error": "roleId es requerido" }
 *   ```
 * - 401: No autenticado (enviar JWT válido)
 * - 403: Sin permiso `user:assign_roles` (solicitar al admin)
 * - 404: Asignación no encontrada (usuario no tiene este rol)
 * - 500: Error del servidor
 *
 * **Validaciones**:
 * - roleId: requerido en query string
 * - Asignación: debe existir (404 si no existe userRole para este usuario+rol)
 *
 * **Lógica**:
 * 1. Valida que roleId está en query string (400 si no)
 * 2. Busca asignación para obtener datos (para auditoría)
 * 3. Verifica que asignación existe (404 si no)
 * 4. Elimina la relación userRole
 * 5. Emite evento USER_ROLE_REMOVED para auditoría
 *
 * **Efectos Secundarios**:
 * - Elimina registro en tabla `userRole`
 * - Usuario pierde acceso a permisos del rol inmediatamente
 * - Si es el último rol, usuario quedaría sin permisos
 * - Cambio se refleja en próxima sesión o refresh de JWT
 * - Emite evento para auditoría
 *
 * **Auditoría**:
 * - Evento: `USER_ROLE_REMOVED`
 * - Quién: usuario autenticado (session.user.id)
 * - Cuándo: timestamp ISO
 * - Qué: userId, roleId, roleName, removedBy
 *
 * **Consideraciones**:
 * - ✓ Recopila datos antes de eliminar para auditoría
 * - ✓ Valida que asignación existe (404 si no)
 * - ⚠️ No valida "último rol" (usuario puede quedar sin permisos)
 * - ⚠️ Cambio no es inmediato en sesión actual (requiere refresh)
 *
 * @method DELETE
 * @route /api/admin/users/:id/roles?roleId=...
 * @auth Requerida (JWT válido)
 * @permission user:assign_roles
 *
 * @param {NextRequest} request - NextRequest HTTP
 * @param {object} context - Contexto de Next.js
 * @param {Promise<{id: string}>} context.params - Parámetros de URL
 * @returns {Promise<NextResponse>} { success: true } o error
 *
 * @example
 * ```typescript
 * // Remover rol de usuario
 * const response = await fetch(
 *   `/api/admin/users/${userId}/roles?roleId=${roleId}`,
 *   {
 *     method: 'DELETE',
 *     headers: {
 *       'Authorization': `Bearer ${session.user.token}`
 *     }
 *   }
 * )
 *
 * if (response.ok) {
 *   console.log('Rol removido exitosamente')
 *   // Refrescar lista de roles del usuario
 * } else if (response.status === 404) {
 *   console.error('Usuario no tiene este rol')
 * } else if (response.status === 400) {
 *   console.error('roleId requerido en query string')
 * }
 * ```
 *
 * @see {@link ./route.ts#GET} para obtener roles del usuario
 * @see {@link ./route.ts#POST} para asignar rol
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
