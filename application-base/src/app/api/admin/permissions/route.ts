import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma/connection"
import { requirePermission } from "@/lib/server/require-permission"
import { SYSTEM_PERMISSIONS } from "@/modules/admin/types/permissions"
import { UnauthenticatedError, PermissionDeniedError } from "@/lib/server/require-permission"

/**
 * GET /api/admin/permissions - Listar todos los permisos del sistema
 *
 * Obtiene lista completa de todos los permisos disponibles.
 * Retorna dos formatos: lista plana y agrupada por módulo (para UI flexible).
 * Incluye conteo de roles que tienen cada permiso asignado.
 *
 * **Autenticación**: Requerida (permiso: `permission:list`)
 *
 * **Respuesta** (200):
 * ```json
 * {
 *   "permissions": [
 *     {
 *       "id": "user:create",
 *       "module": "user",
 *       "description": "Crear nuevos usuarios",
 *       "createdAt": "2024-01-01T00:00:00Z",
 *       "rolesCount": 2
 *     },
 *     {
 *       "id": "user:delete",
 *       "module": "user",
 *       "description": "Eliminar usuarios",
 *       "createdAt": "2024-01-01T00:00:00Z",
 *       "rolesCount": 1
 *     }
 *   ],
 *   "groupedByModule": {
 *     "user": [
 *       {
 *         "id": "user:create",
 *         "module": "user",
 *         "description": "Crear nuevos usuarios",
 *         "createdAt": "2024-01-01T00:00:00Z",
 *         "rolesCount": 2
 *       },
 *       {
 *         "id": "user:delete",
 *         "module": "user",
 *         "description": "Eliminar usuarios",
 *         "createdAt": "2024-01-01T00:00:00Z",
 *         "rolesCount": 1
 *       }
 *     ],
 *     "role": [...]
 *   }
 * }
 * ```
 *
 * **Errores**:
 * - 401: No autenticado (enviar JWT válido)
 * - 403: Sin permiso `permission:list` (solicitar al admin)
 * - 500: Error del servidor
 *
 * **Performance**:
 * - Query optimizada con select específico
 * - _count para rolesCount (sin N+1)
 * - Ordenada por módulo ASC, luego id ASC (predecible)
 * - Típicamente < 100ms incluso con 50+ permisos
 *
 * **Campos Retornados** (para cada permiso):
 * - `id`: Identificador único (formato "modulo:acción", ej: "user:create")
 * - `module`: Módulo al que pertenece (usuario, rol, permiso, auditoría, etc)
 * - `description`: Descripción legible del permiso
 * - `createdAt`: Timestamp de creación del permiso
 * - `rolesCount`: Cantidad de roles que tienen este permiso asignado
 *
 * **Dos Formatos de Respuesta**:
 * 1. `permissions`: Array plano (útil para listar todos, filtrar, buscar)
 * 2. `groupedByModule`: Objeto con clave=módulo, valor=array de permisos (útil para UI de pestañas/secciones)
 *
 * **Casos de Uso**:
 * 1. Dashboard admin: mostrar árbol de permisos disponibles
 * 2. Configuración de rol: seleccionar permisos a asignar (usar groupedByModule)
 * 3. Auditoría: lista de todos los permisos del sistema
 *
 * @method GET
 * @route /api/admin/permissions
 * @auth Requerida (JWT válido)
 * @permission permission:list
 *
 * @param {Request} request - Request HTTP (sin parámetros)
 * @returns {Promise<NextResponse>} Permisos en ambos formatos (plano + agrupado)
 *
 * @example
 * ```typescript
 * // Obtener todos los permisos
 * const response = await fetch('/api/admin/permissions', {
 *   headers: {
 *     'Authorization': `Bearer ${session.user.token}`
 *   }
 * })
 *
 * if (response.ok) {
 *   const { permissions, groupedByModule } = await response.json()
 *   console.log(`Total permisos: ${permissions.length}`)
 *   console.log(`Módulos: ${Object.keys(groupedByModule).join(', ')}`)
 *
 *   // Iterar por módulo
 *   Object.entries(groupedByModule).forEach(([module, perms]) => {
 *     console.log(`\\n${module}:`)
 *     perms.forEach(p => {
 *       console.log(`  - ${p.id}: ${p.description} (${p.rolesCount} roles)`)
 *     })
 *   })
 * }
 * ```
 *
 * @see {@link ../../roles/[id]/permissions/route.ts} para asignar permisos a roles
 * @see {@link ../../users/[id]/permissions/route.ts} para obtener permisos de usuario
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
