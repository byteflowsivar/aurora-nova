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
 * @api {get} /api/admin/users/:id
 * @name Obtener Usuario
 * @description Obtiene los detalles de un usuario específico, incluyendo sus roles asignados.
 * @version 1.0.0
 *
 * @requires "user:read" - El usuario debe tener el permiso para ver los detalles de otro usuario.
 *
 * @param {NextRequest} request - La petición HTTP de entrada.
 * @param {object} context - Contexto de la ruta.
 * @param {object} context.params - Parámetros de la URL.
 * @param {string} context.params.id - El ID del usuario a obtener.
 *
 * @response {200} Success - Retorna el objeto del usuario con sus detalles y roles.
 * @response {401} Unauthorized - El usuario no está autenticado.
 * @response {403} Forbidden - El usuario no tiene los permisos necesarios.
 * @response {404} NotFound - No se encontró un usuario con el ID proporcionado.
 * @response {500} InternalServerError - Error inesperado en el servidor.
 *
 * @returns {Promise<NextResponse>} Una promesa que resuelve a la respuesta HTTP.
 *
 * @example
 * // Fetch a user's details from a client component
 * async function fetchUserDetails(userId) {
 *   const response = await fetch(`/api/admin/users/${userId}`);
 *   const user = await response.json();
 *   if (response.ok) {
 *     console.log('Detalles del usuario:', user);
 *   } else {
 *     console.error('Error:', user.error);
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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
 * @api {put} /api/admin/users/:id
 * @name Actualizar Usuario
 * @description Actualiza los datos de un usuario existente (nombre, apellido, email).
 * @version 1.0.0
 *
 * @requires "user:update" - El usuario debe tener el permiso para modificar otros usuarios.
 *
 * @param {NextRequest} request - La petición HTTP de entrada.
 * @param {object} context - Contexto de la ruta.
 * @param {object} context.params - Parámetros de la URL.
 * @param {string} context.params.id - El ID del usuario a actualizar.
 * @param {object} request.body - El cuerpo de la petición.
 * @param {string} [request.body.firstName] - El nuevo nombre del usuario.
 * @param {string} [request.body.lastName] - El nuevo apellido del usuario.
 * @param {string} [request.body.email] - El nuevo email del usuario (debe ser único).
 *
 * @response {200} Success - Retorna el objeto del usuario actualizado.
 * @response {400} BadRequest - Los datos proporcionados son inválidos.
 * @response {401} Unauthorized - El usuario no está autenticado.
 * @response {403} Forbidden - El usuario no tiene los permisos necesarios.
 * @response {404} NotFound - No se encontró un usuario con el ID proporcionado.
 * @response {409} Conflict - El nuevo email ya está en uso por otro usuario.
 * @response {500} InternalServerError - Error inesperado en el servidor.
 *
 * @returns {Promise<NextResponse>} Una promesa que resuelve a la respuesta HTTP.
 *
 * @example
 * // Update a user's email
 * async function updateUserEmail(userId, newEmail) {
 *   const response = await fetch(`/api/admin/users/${userId}`, {
 *     method: 'PUT',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ email: newEmail }),
 *   });
 *   const updatedUser = await response.json();
 *   if (response.ok) {
 *     console.log('Usuario actualizado:', updatedUser);
 *   } else {
 *     console.error('Error:', updatedUser.error);
 *   }
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
 * @api {delete} /api/admin/users/:id
 * @name Eliminar Usuario
 * @description Elimina un usuario del sistema de forma permanente.
 * @version 1.0.0
 *
 * @requires "user:delete" - El usuario debe tener el permiso para eliminar otros usuarios.
 *
 * @param {NextRequest} request - La petición HTTP de entrada.
 * @param {object} context - Contexto de la ruta.
 * @param {object} context.params - Parámetros de la URL.
 * @param {string} context.params.id - El ID del usuario a eliminar.
 *
 * @response {200} Success - Indica que el usuario fue eliminado exitosamente.
 * @response {400} BadRequest - El usuario no puede eliminarse a sí mismo.
 * @response {401} Unauthorized - El usuario no está autenticado.
 * @response {403} Forbidden - El usuario no tiene los permisos necesarios.
 * @response {404} NotFound - No se encontró un usuario con el ID proporcionado.
 * @response {500} InternalServerError - Error inesperado en el servidor.
 *
 * @returns {Promise<NextResponse>} Una promesa que resuelve a la respuesta HTTP.
 *
 * @fires SystemEvent.USER_DELETED - Emite un evento para auditoría cuando el usuario es eliminado.
 *
 * @example
 * // Delete a user
 * async function deleteUser(userId) {
 *   const response = await fetch(`/api/admin/users/${userId}`, {
 *     method: 'DELETE',
 *   });
 *   if (response.ok) {
 *     console.log('Usuario eliminado');
 *   } else {
 *     const { error } = await response.json();
 *     console.error('Error:', error);
 *   }
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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
