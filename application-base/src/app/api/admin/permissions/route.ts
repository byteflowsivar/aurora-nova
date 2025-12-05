import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma/connection"
import { requirePermission } from "@/lib/server/require-permission"
import { SYSTEM_PERMISSIONS } from "@/modules/admin/types/permissions"
import { UnauthenticatedError, PermissionDeniedError } from "@/lib/server/require-permission"

/**
 * @api {get} /api/admin/permissions
 * @name Listar Permisos
 * @description Obtiene una lista de todos los permisos del sistema, tanto en una lista plana como agrupados por módulo.
 * @version 1.0.0
 *
 * @requires "permission:list" - El usuario debe tener el permiso para listar permisos.
 *
 * @response {200} Success - Retorna un objeto con la lista de permisos y los permisos agrupados por módulo.
 * @response {401} Unauthorized - El usuario no está autenticado.
 * @response {403} Forbidden - El usuario no tiene los permisos necesarios.
 * @response {500} InternalServerError - Error inesperado en el servidor.
 *
 * @returns {Promise<NextResponse>} Una promesa que resuelve a la respuesta HTTP.
 *
 * @property {object} response.body - El cuerpo de la respuesta.
 * @property {object[]} response.body.permissions - Una lista plana de todos los permisos.
 * @property {string} response.body.permissions.id - ID del permiso (e.g., "user:create").
 * @property {string} response.body.permissions.module - Módulo al que pertenece (e.g., "user").
 * @property {string|null} response.body.permissions.description - Descripción del permiso.
 * @property {number} response.body.permissions.rolesCount - Número de roles que tienen este permiso.
 * @property {object} response.body.groupedByModule - Un objeto donde las claves son los módulos y los valores son arrays de permisos.
 *
 * @example
 * // Fetch permissions from a client component
 * async function fetchPermissions() {
 *   const response = await fetch('/api/admin/permissions');
 *   const { permissions, groupedByModule } = await response.json();
 *   console.log('Todos los permisos:', permissions);
 *   console.log('Permisos de usuario:', groupedByModule['user']);
 * }
 */
export async function GET() {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.PERMISSION_LIST)

    const permissions = await prisma.permission.findMany({
      select: {
        id: true,
        module: true,
        description: true,
        createdAt: true,
        _count: {
          select: {
            rolePermissions: true,
          },
        },
      },
      orderBy: [
        { module: "asc" },
        { id: "asc" },
      ],
    })

    // Agrupar por módulo
    const grouped = permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = []
      }
      acc[permission.module].push({
        id: permission.id,
        module: permission.module,
        description: permission.description,
        createdAt: permission.createdAt,
        rolesCount: permission._count.rolePermissions,
      })
      return acc
    }, {} as Record<string, Array<{id: string; module: string; description: string | null; createdAt: Date; rolesCount: number}>>)

    return NextResponse.json({
      permissions: permissions.map((p) => ({
        id: p.id,
        module: p.module,
        description: p.description,
        createdAt: p.createdAt,
        rolesCount: p._count.rolePermissions,
      })),
      groupedByModule: grouped,
    })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
    console.error("Error fetching permissions:", error)
    return NextResponse.json(
      { error: "Error al obtener permisos" },
      { status: 500 }
    )
  }
}
