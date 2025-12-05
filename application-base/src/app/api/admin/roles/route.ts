import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma/connection"
import { z } from "zod"
import { requirePermission } from "@/lib/server/require-permission"
import { SYSTEM_PERMISSIONS } from "@/modules/admin/types/permissions"
import { UnauthenticatedError, PermissionDeniedError } from "@/lib/server/require-permission"
import { auth } from "@/lib/auth"
import { eventBus, SystemEvent } from "@/lib/events"
import { EventArea } from "@/lib/events/event-area"

const createRoleSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(50, "El nombre debe tener máximo 50 caracteres"),
  description: z.string().optional().nullable(),
})

/**
 * @api {get} /api/admin/roles
 * @name Listar Roles
 * @description Obtiene una lista de todos los roles del sistema, junto con un conteo de permisos y usuarios asociados a cada uno.
 * @version 1.0.0
 *
 * @requires "role:list" - El usuario debe tener el permiso para listar roles.
 *
 * @response {200} Success - Retorna un array de roles con su información.
 * @response {401} Unauthorized - El usuario no está autenticado.
 * @response {403} Forbidden - El usuario no tiene los permisos necesarios.
 * @response {500} InternalServerError - Error inesperado en el servidor.
 *
 * @returns {Promise<NextResponse>} Una promesa que resuelve a la respuesta HTTP.
 *
 * @property {object[]} response.body - Array de roles.
 * @property {string} response.body.id - ID del rol.
 * @property {string} response.body.name - Nombre del rol.
 * @property {string|null} response.body.description - Descripción del rol.
 * @property {Date} response.body.createdAt - Fecha de creación.
 * @property {Date} response.body.updatedAt - Última fecha de actualización.
 * @property {number} response.body.permissionsCount - Número de permisos asociados.
 * @property {number} response.body.usersCount - Número de usuarios con este rol.
 *
 * @example
 * // Fetch roles from a client component
 * async function fetchRoles() {
 *   const response = await fetch('/api/admin/roles');
 *   const roles = await response.json();
 *   console.log(roles);
 * }
 */
export async function GET() {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.ROLE_LIST)

    const roles = await prisma.role.findMany({
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
      orderBy: {
        createdAt: "desc",
      },
    })

    const transformedRoles = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissionsCount: role._count.rolePermissions,
      usersCount: role._count.userRoles,
    }))

    return NextResponse.json(transformedRoles)
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
    console.error("Error fetching roles:", error)
    return NextResponse.json(
      { error: "Error al obtener roles" },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/admin/roles
 * @name Crear Rol
 * @description Crea un nuevo rol en el sistema.
 * @version 1.0.0
 *
 * @requires "role:create" - El usuario debe tener el permiso para crear roles.
 *
 * @param {NextRequest} request - La petición HTTP de entrada.
 * @param {object} request.body - El cuerpo de la petición.
 * @param {string} request.body.name - Nombre del nuevo rol. Debe ser único.
 * @param {string|null} [request.body.description] - Descripción opcional para el rol.
 *
 * @response {201} Created - Retorna el objeto del rol recién creado.
 * @response {400} BadRequest - Los datos proporcionados son inválidos (e.g., nombre vacío).
 * @response {401} Unauthorized - El usuario no está autenticado.
 * @response {403} Forbidden - El usuario no tiene los permisos necesarios.
 * @response {409} Conflict - Ya existe un rol con el mismo nombre.
 * @response {500} InternalServerError - Error inesperado en el servidor.
 *
 * @returns {Promise<NextResponse>} Una promesa que resuelve a la respuesta HTTP.
 *
 * @fires SystemEvent.ROLE_CREATED - Emite un evento cuando el rol se crea exitosamente para auditoría.
 *
 * @example
 * // Create a new role from a client component
 * async function createRole(name, description) {
 *   const response = await fetch('/api/admin/roles', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ name, description }),
 *   });
 *   const newRole = await response.json();
 *   if (response.ok) {
 *     console.log('Rol creado:', newRole);

 *   } else {
 *     console.error('Error:', newRole.error);
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.ROLE_CREATE)
    const session = await auth()

    const body = await request.json()

    // Validar datos
    const validationResult = createRoleSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { name, description } = validationResult.data

    // Verificar si el nombre ya existe
    const existingRole = await prisma.role.findFirst({
      where: { name },
    })

    if (existingRole) {
      return NextResponse.json(
        { error: "Ya existe un rol con este nombre" },
        { status: 409 }
      )
    }

    // Crear rol
    const role = await prisma.role.create({
      data: {
        name,
        description,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Dispatch event for role creation audit
    await eventBus.dispatch(
      SystemEvent.ROLE_CREATED,
      {
        roleId: role.id,
        name: role.name,
        description: role.description,
        createdBy: session?.user?.id || 'system',
      },
      {
        userId: session?.user?.id,
        area: EventArea.ADMIN,
      }
    )

    return NextResponse.json({
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissionsCount: 0,
      usersCount: 0,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
    console.error("Error creating role:", error)
    return NextResponse.json(
      { error: "Error al crear rol" },
      { status: 500 }
    )
  }
}
