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
 * @api {get} /api/admin/roles/:id
 * @name Obtener Rol
 * @description Obtiene los detalles de un rol específico, incluyendo los permisos asociados y el número de usuarios.
 * @version 1.0.0
 *
 * @requires "role:read" - El usuario debe tener el permiso para ver los detalles de un rol.
 *
 * @param {NextRequest} request - La petición HTTP de entrada.
 * @param {object} context - Contexto de la ruta.
 * @param {object} context.params - Parámetros de la URL.
 * @param {string} context.params.id - El ID del rol a obtener.
 *
 * @response {200} Success - Retorna el objeto del rol con sus detalles.
 * @response {401} Unauthorized - El usuario no está autenticado.
 * @response {403} Forbidden - El usuario no tiene los permisos necesarios.
 * @response {404} NotFound - No se encontró un rol con el ID proporcionado.
 * @response {500} InternalServerError - Error inesperado en el servidor.
 *
 * @returns {Promise<NextResponse>} Una promesa que resuelve a la respuesta HTTP.
 *
 * @example
 * // Fetch a role from a client component
 * async function fetchRoleDetails(roleId) {
 *   const response = await fetch(`/api/admin/roles/${roleId}`);
 *   const role = await response.json();
 *   if (response.ok) {
 *     console.log('Detalles del rol:', role);
 *   } else {
 *     console.error('Error:', role.error);
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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
 * @api {put} /api/admin/roles/:id
 * @name Actualizar Rol
 * @description Actualiza el nombre y/o la descripción de un rol existente.
 * @version 1.0.0
 *
 * @requires "role:update" - El usuario debe tener el permiso para modificar roles.
 *
 * @param {NextRequest} request - La petición HTTP de entrada.
 * @param {object} context - Contexto de la ruta.
 * @param {object} context.params - Parámetros de la URL.
 * @param {string} context.params.id - El ID del rol a actualizar.
 * @param {object} request.body - El cuerpo de la petición.
 * @param {string} [request.body.name] - El nuevo nombre para el rol. Debe ser único.
 * @param {string|null} [request.body.description] - La nueva descripción para el rol.
 *
 * @response {200} Success - Retorna el objeto del rol actualizado.
 * @response {400} BadRequest - Los datos proporcionados son inválidos.
 * @response {401} Unauthorized - El usuario no está autenticado.
 * @response {403} Forbidden - El usuario no tiene los permisos necesarios.
 * @response {404} NotFound - No se encontró un rol con el ID proporcionado.
 * @response {409} Conflict - El nuevo nombre del rol ya está en uso.
 * @response {500} InternalServerError - Error inesperado en el servidor.
 *
 * @returns {Promise<NextResponse>} Una promesa que resuelve a la respuesta HTTP.
 *
 * @fires SystemEvent.ROLE_UPDATED - Emite un evento con los valores antiguos y nuevos para auditoría.
 *
 * @example
 * // Update a role's name
 * async function updateRoleName(roleId, newName) {
 *   const response = await fetch(`/api/admin/roles/${roleId}`, {
 *     method: 'PUT',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ name: newName }),
 *   });
 *   const updatedRole = await response.json();
 *   if (response.ok) {
 *     console.log('Rol actualizado:', updatedRole);
 *   } else {
 *     console.error('Error:', updatedRole.error);
 *   }
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
 * @api {delete} /api/admin/roles/:id
 * @name Eliminar Rol
 * @description Elimina un rol del sistema.
 * @version 1.0.0
 *
 * @requires "role:delete" - El usuario debe tener el permiso para eliminar roles.
 *
 * @param {NextRequest} request - La petición HTTP de entrada.
 * @param {object} context - Contexto de la ruta.
 * @param {object} context.params - Parámetros de la URL.
 * @param {string} context.params.id - El ID del rol a eliminar.
 *
 * @response {200} Success - Indica que el rol fue eliminado exitosamente.
 * @response {400} BadRequest - El rol no se puede eliminar porque tiene usuarios asignados.
 * @response {401} Unauthorized - El usuario no está autenticado.
 * @response {403} Forbidden - El usuario no tiene los permisos necesarios.
 * @response {404} NotFound - No se encontró un rol con el ID proporcionado.
 * @response {500} InternalServerError - Error inesperado en el servidor.
 *
 * @returns {Promise<NextResponse>} Una promesa que resuelve a la respuesta HTTP.
 *
 * @fires SystemEvent.ROLE_DELETED - Emite un evento con el ID y nombre del rol eliminado para auditoría.
 *
 * @example
 * // Delete a role
 * async function deleteRole(roleId) {
 *   const response = await fetch(`/api/admin/roles/${roleId}`, {
 *     method: 'DELETE',
 *   });
 *   if (response.ok) {
 *     console.log('Rol eliminado exitosamente');
 *   } else {
 *     const { error } = await response.json();
 *     console.error('Error al eliminar:', error);
 *   }
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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
