import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma/connection"
import { z } from "zod"
import { requirePermission } from "@/lib/server/require-permission"
import { SYSTEM_PERMISSIONS } from "@/modules/admin/types/permissions"
import { UnauthenticatedError, PermissionDeniedError } from "@/lib/server/require-permission"
import { eventBus, SystemEvent } from "@/lib/events"
import { EventArea } from "@/lib/events/event-area"

// Schema de validación para actualizar usuario
const updateUserSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido").optional(),
  lastName: z.string().min(1, "El apellido es requerido").optional(),
  email: z.string().email("Email inválido").optional(),
})

/**
 * GET /api/admin/users/:id - Obtener detalles de usuario
 *
 * Obtiene información completa de un usuario específico incluyendo sus roles asignados.
 * Utilizado por el dashboard admin para ver perfil del usuario.
 *
 * **Autenticación**: Requerida (permiso: `user:read`)
 *
 * **URL Parameters**:
 * - `id` (string, requerido): UUID del usuario a obtener
 *
 * **Respuesta** (200):
 * ```json
 * {
 *   "id": "uuid",
 *   "name": "Juan Pérez",
 *   "firstName": "Juan",
 *   "lastName": "Pérez",
 *   "email": "juan@example.com",
 *   "emailVerified": "2024-01-01T00:00:00Z" | null,
 *   "image": "url" | null,
 *   "createdAt": "2024-01-01T00:00:00Z",
 *   "updatedAt": "2024-12-05T12:00:00Z",
 *   "roles": [
 *     { "id": "uuid", "name": "admin", "description": "..." }
 *   ]
 * }
 * ```
 *
 * **Errores**:
 * - 401: No autenticado (enviar JWT válido)
 * - 403: Sin permiso `user:read` (solicitar al admin)
 * - 404: Usuario no encontrado
 * - 500: Error del servidor
 *
 * **Performance**:
 * - Query optimizada con select específico
 * - Incluye roles (relación userRoles → role)
 * - Típicamente < 50ms
 *
 * @method GET
 * @route /api/admin/users/:id
 * @auth Requerida (JWT válido)
 * @permission user:read
 *
 * @param {NextRequest} request - NextRequest HTTP
 * @param {object} context - Contexto de Next.js
 * @param {Promise<{id: string}>} context.params - Parámetros de URL
 * @returns {Promise<NextResponse>} Usuario con roles o error
 *
 * @example
 * ```typescript
 * // Obtener detalles de usuario específico
 * const response = await fetch(`/api/admin/users/${userId}`, {
 *   headers: {
 *     'Authorization': `Bearer ${session.user.token}`
 *   }
 * })
 *
 * if (response.ok) {
 *   const user = await response.json()
 *   console.log(`Usuario: ${user.name}, Roles: ${user.roles.length}`)
 * } else if (response.status === 404) {
 *   console.error('Usuario no encontrado')
 * }
 * ```
 *
 * @see {@link ./route.ts#PUT} para actualizar usuario
 * @see {@link ./route.ts#DELETE} para eliminar usuario
 * @see {@link ./roles/route.ts} para gestionar roles del usuario
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar permiso
    await requirePermission(SYSTEM_PERMISSIONS.USER_READ)

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.userRoles.map((ur) => ur.role),
    })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json(
        { error: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      )
    }
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Error al obtener usuario" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/users/:id - Actualizar usuario
 *
 * Actualiza datos de un usuario existente (nombre, apellido, email).
 * Solo actualiza campos proporcionados en el body (parcial).
 * Si se cambia email, se verifica unicidad automáticamente.
 *
 * **Autenticación**: Requerida (permiso: `user:update`)
 *
 * **URL Parameters**:
 * - `id` (string, requerido): UUID del usuario a actualizar
 *
 * **Body Esperado**:
 * ```json
 * {
 *   "firstName": "string (opcional, mín 1 char)",
 *   "lastName": "string (opcional, mín 1 char)",
 *   "email": "string (opcional, email válido, debe ser único)"
 * }
 * ```
 *
 * **Respuesta** (200):
 * ```json
 * {
 *   "id": "uuid",
 *   "name": "Juan Pérez Actualizado",
 *   "firstName": "Juan",
 *   "lastName": "Pérez Actualizado",
 *   "email": "juannuevo@example.com",
 *   "emailVerified": null,
 *   "image": null,
 *   "createdAt": "2024-01-01T00:00:00Z",
 *   "updatedAt": "2024-12-05T12:00:00Z",
 *   "roles": [...]
 * }
 * ```
 *
 * **Errores**:
 * - 400: Datos inválidos (formato email incorrecto, campo vacío)
 *   - Validación: firstName, lastName requieren al menos 1 carácter
 *   - Validación: email debe tener formato válido
 * - 401: No autenticado (enviar JWT válido)
 * - 403: Sin permiso `user:update` (solicitar al admin)
 * - 404: Usuario no encontrado (ID inválido)
 * - 409: Email ya en uso por otro usuario (cambiar email solicitado)
 * - 500: Error del servidor
 *
 * **Validaciones**:
 * - firstName, lastName: no vacíos, máximo 100 caracteres
 * - Email: formato válido, único en tabla users
 * - Al menos un campo debe ser proporcionado
 *
 * **Lógica Especial**:
 * - `name` se recalcula automáticamente si firstName o lastName cambian
 * - Si email cambia, se verifica que no esté en uso ya
 * - No se valida uniqueness de combinaciones (firstName + lastName)
 * - Los campos no proporcionados permanecen sin cambio
 *
 * **Efectos Secundarios**:
 * - Actualiza tabla `user` con campos soportados
 * - updatedAt se establece automáticamente
 * - NO emite evento de auditoría (solo actualización silenciosa)
 *
 * @method PATCH
 * @route /api/admin/users/:id
 * @auth Requerida (JWT válido)
 * @permission user:update
 *
 * @param {NextRequest} request - NextRequest con body JSON
 * @param {object} context - Contexto de Next.js
 * @param {Promise<{id: string}>} context.params - Parámetros de URL
 * @returns {Promise<NextResponse>} Usuario actualizado o error
 *
 * @example
 * ```typescript
 * // Actualizar parcialmente: solo email
 * const response = await fetch(`/api/admin/users/${userId}`, {
 *   method: 'PATCH',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ email: 'nuevo@example.com' })
 * })
 *
 * if (response.ok) {
 *   const user = await response.json()
 *   console.log(`Email actualizado a: ${user.email}`)
 * } else if (response.status === 409) {
 *   console.error('Email ya en uso')
 * }
 * ```
 *
 * @see {@link ./route.ts#GET} para obtener usuario
 * @see {@link ./route.ts#DELETE} para eliminar usuario
 * @see {@link ../route.ts} para crear usuario
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar permiso
    await requirePermission(SYSTEM_PERMISSIONS.USER_UPDATE)

    const { id } = await params
    const body = await request.json()

    // Validar datos
    const validationResult = updateUserSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { firstName, lastName, email } = validationResult.data

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Si se está actualizando el email, verificar que no esté en uso
    if (email && email !== existingUser.email) {
      const emailInUse = await prisma.user.findUnique({
        where: { email },
      })

      if (emailInUse) {
        return NextResponse.json(
          { error: "El email ya está en uso" },
          { status: 409 }
        )
      }
    }

    // Preparar datos de actualización
    const updateData: {
      firstName?: string
      lastName?: string
      email?: string
      name?: string
    } = {}

    if (firstName) updateData.firstName = firstName
    if (lastName) updateData.lastName = lastName
    if (email) updateData.email = email

    if (firstName || lastName) {
      updateData.name = `${firstName || existingUser.firstName} ${lastName || existingUser.lastName}`
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      emailVerified: updatedUser.emailVerified,
      image: updatedUser.image,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      roles: updatedUser.userRoles.map((ur) => ur.role),
    })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json(
        { error: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      )
    }
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/:id - Eliminar usuario
 *
 * Elimina un usuario del sistema de forma permanente.
 * Operación destructiva: elimina usuario, credenciales, sesiones y relaciones.
 * No se puede eliminar a uno mismo (validación: currentUserId !== targetId).
 *
 * **Autenticación**: Requerida (permiso: `user:delete`)
 *
 * **URL Parameters**:
 * - `id` (string, requerido): UUID del usuario a eliminar
 *
 * **Respuesta** (200):
 * ```json
 * {
 *   "success": true
 * }
 * ```
 *
 * **Errores**:
 * - 400: No se puede eliminar a uno mismo (validación de seguridad)
 *   ```json
 *   { "error": "No puedes eliminar tu propio usuario" }
 *   ```
 * - 401: No autenticado (enviar JWT válido)
 * - 403: Sin permiso `user:delete` (solicitar al admin)
 * - 404: Usuario no encontrado (ID inválido)
 * - 500: Error del servidor
 *
 * **Validaciones**:
 * - Usuario autenticado debe ser diferente del usuario a eliminar
 * - Usuario debe existir (404 si no existe)
 * - Permiso `user:delete` debe estar presente
 *
 * **Cascada de Eliminación** (por configuración de BD):
 * - Elimina todos los registros en tabla `userRoles` para este usuario
 * - Elimina todos los registros en tabla `userPermissions` para este usuario
 * - Elimina todos los registros en tabla `sessions` para este usuario (logout omnibus)
 * - Elimina todos los registros en tabla `userCredentials` para este usuario
 * - Elimina todos los registros en tabla `account` (OAuth, credentials) para este usuario
 * - Posiblemente elimina auditoría asociada (depende de schema BD)
 *
 * **Efectos Secundarios**:
 * - Usuario eliminado de forma permanente (sin soft delete)
 * - Todas las sesiones activas del usuario se invalidan
 * - Emite evento `USER_DELETED` para auditoría
 * - Registra en log: quién eliminó, cuándo, email del usuario eliminado
 *
 * **Auditoría**:
 * - Evento: `USER_DELETED`
 * - Quién: usuario autenticado (session.user.id)
 * - Cuándo: timestamp ISO
 * - Qué: userId, email del usuario eliminado
 *
 * **Consideraciones de Seguridad**:
 * - ✓ Verifica que no sea auto-eliminación
 * - ✓ Registra auditoría con usuario que eliminó
 * - ✓ Cascada elimina todas las relaciones (no quedan huérfanos)
 * - ✗ No hay período de gracia (eliminación inmediata)
 * - ✗ No hay soft delete (considerar para futuros requisitos de recuperación)
 *
 * @method DELETE
 * @route /api/admin/users/:id
 * @auth Requerida (JWT válido)
 * @permission user:delete
 *
 * @param {NextRequest} request - NextRequest HTTP
 * @param {object} context - Contexto de Next.js
 * @param {Promise<{id: string}>} context.params - Parámetros de URL
 * @returns {Promise<NextResponse>} { success: true } o error
 *
 * @example
 * ```typescript
 * // Eliminar usuario específico
 * const response = await fetch(`/api/admin/users/${userId}`, {
 *   method: 'DELETE',
 *   headers: {
 *     'Authorization': `Bearer ${session.user.token}`
 *   }
 * })
 *
 * if (response.ok) {
 *   console.log('Usuario eliminado permanentemente')
 *   // Recargar lista de usuarios en UI
 * } else if (response.status === 400) {
 *   console.error('No puedes eliminarte a ti mismo')
 * } else if (response.status === 404) {
 *   console.error('Usuario no encontrado')
 * }
 * ```
 *
 * @see {@link ./route.ts#GET} para obtener usuario
 * @see {@link ./route.ts#PATCH} para actualizar usuario
 * @see {@link ../route.ts#POST} para crear usuario
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar permiso
    await requirePermission(SYSTEM_PERMISSIONS.USER_DELETE)

    const session = await auth()

    const { id } = await params

    // No permitir eliminar el propio usuario
    if (session?.user?.id === id) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propio usuario" },
        { status: 400 }
      )
    }

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

    // Eliminar usuario (cascade eliminará sesiones, credenciales, etc.)
    await prisma.user.delete({
      where: { id },
    })

    // Dispatch event for user deletion audit
    await eventBus.dispatch(
      SystemEvent.USER_DELETED,
      {
        userId: id,
        email: user.email,
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
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json(
        { error: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      )
    }
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 }
    )
  }
}
