/**
 * API Route - Admin User Permissions Management - Aurora Nova
 *
 * Endpoint para obtener todos los permisos de un usuario basados en sus roles asignados.
 * Los permisos se derivan de la suma de permisos de todos los roles del usuario.
 *
 * **Endpoint**:
 * - GET /api/admin/users/:id/permissions - Obtener permisos del usuario (derivados de roles)
 *
 * **Cálculo de Permisos**:
 * - Se obtienen todos los userRoles del usuario
 * - Para cada rol, se obtienen sus permisos asociados (rolePermissions)
 * - Se deduplicarán permisos comunes a múltiples roles
 * - Se agruparán por módulo para mejor organización
 * - Se incluye qué roles otorgan cada permiso
 *
 * **Casos de Uso**:
 * 1. Dashboard admin: mostrar qué permisos tiene un usuario
 * 2. Auditoría: verificar permisos de usuario antes de cambios
 * 3. Debugging: entender por qué un usuario tiene/no tiene cierto permiso
 *
 * **Nota Importante**:
 * - Este endpoint es READ-ONLY (solo GET)
 * - Para cambiar permisos, usar POST/DELETE en /roles endpoint
 * - Los permisos se calculan en tiempo de lectura (no cacheados)
 *
 * @module api/admin/users/[id]/permissions
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma/connection"
import { requirePermission } from "@/lib/server/require-permission"
import { SYSTEM_PERMISSIONS } from "@/modules/admin/types/permissions"
import { UnauthenticatedError, PermissionDeniedError } from "@/lib/server/require-permission"

/**
 * GET /api/admin/users/:id/permissions - Obtener permisos del usuario
 *
 * Obtiene todos los permisos de un usuario derivados de sus roles asignados.
 * Los permisos se deduplicarán (si múltiples roles otorgan el mismo permiso, aparece una vez).
 * Se agruparán por módulo para facilitar lectura y procesamiento.
 *
 * **Autenticación**: Requerida (permiso: `user:read`)
 *
 * **URL Parameters**:
 * - `id` (string, requerido): UUID del usuario cuyos permisos se desea obtener
 *
 * **Respuesta** (200):
 * ```json
 * {
 *   "userId": "uuid",
 *   "permissions": {
 *     "user": [
 *       {
 *         "id": "user:create",
 *         "module": "user",
 *         "description": "Crear nuevos usuarios",
 *         "createdAt": "2024-01-01T00:00:00Z",
 *         "roles": ["admin", "manager"]
 *       },
 *       {
 *         "id": "user:read",
 *         "module": "user",
 *         "description": "Leer datos de usuarios",
 *         "createdAt": "2024-01-01T00:00:00Z",
 *         "roles": ["admin", "editor", "viewer"]
 *       }
 *     ],
 *     "role": [
 *       {
 *         "id": "role:create",
 *         "module": "role",
 *         "description": "Crear nuevos roles",
 *         "createdAt": "2024-01-01T00:00:00Z",
 *         "roles": ["admin"]
 *       }
 *     ]
 *   },
 *   "totalPermissions": 10,
 *   "totalRoles": 2
 * }
 * ```
 *
 * **Errores**:
 * - 401: No autenticado (enviar JWT válido)
 * - 403: Sin permiso `user:read` (solicitar al admin)
 * - 404: Usuario no encontrado
 * - 500: Error del servidor
 *
 * **Estructura de Respuesta**:
 * - `userId`: ID del usuario consultado
 * - `permissions`: Objeto con clave = módulo, valor = array de permisos
 *   - Cada permiso contiene:
 *     - `id`: Identificador único (módulo:acción, ej: "user:create")
 *     - `module`: Módulo al que pertenece
 *     - `description`: Descripción legible
 *     - `createdAt`: Timestamp de creación del permiso
 *     - `roles`: Array de nombres de roles que otorgan este permiso
 * - `totalPermissions`: Cantidad única de permisos del usuario
 * - `totalRoles`: Cantidad de roles asignados al usuario
 *
 * **Algoritmo**:
 * 1. Valida existencia de usuario (404 si no existe)
 * 2. Obtiene todos los userRoles para el usuario
 * 3. Para cada userRole, obtiene todos los rolePermissions
 * 4. Construye Map de permisos únicos (deduplicación automática)
 * 5. Recopila qué roles otorgan cada permiso
 * 6. Agrupa permisos por módulo
 * 7. Retorna estructura organizada
 *
 * **Performance**:
 * - Query de una sola vez a BD (optimizada con select)
 * - Procesamiento en memoria (Map para deduplicación O(1))
 * - Típicamente < 100ms incluso con 100+ permisos
 *
 * **Detalles Técnicos**:
 * - Usa Map<permissionId, permissionData> para deduplicación eficiente
 * - Reduce a Record<module, permissions[]> para agrupamiento
 * - No requiere índices especiales (ya existen en schema)
 * - Sin N+1: SELECT especifica exactamente qué campos
 *
 * @method GET
 * @route /api/admin/users/:id/permissions
 * @auth Requerida (JWT válido)
 * @permission user:read
 *
 * @param {NextRequest} request - NextRequest HTTP
 * @param {object} context - Contexto de Next.js
 * @param {Promise<{id: string}>} context.params - Parámetros de URL
 * @returns {Promise<NextResponse>} Permisos organizados por módulo o error
 *
 * @example
 * ```typescript
 * // Obtener permisos de usuario
 * const response = await fetch(`/api/admin/users/${userId}/permissions`, {
 *   headers: {
 *     'Authorization': `Bearer ${session.user.token}`
 *   }
 * })
 *
 * if (response.ok) {
 *   const data = await response.json()
 *   console.log(`Usuario tiene ${data.totalPermissions} permisos únicos`)
 *   console.log(`Asignado a ${data.totalRoles} roles`)
 *
 *   // Iterar permisos por módulo
 *   Object.entries(data.permissions).forEach(([module, perms]) => {
 *     console.log(`\n${module}:`)
 *     perms.forEach(p => {
 *       console.log(`  - ${p.id}: ${p.description}`)
 *       console.log(`    Roles: ${p.roles.join(', ')}`)
 *     })
 *   })
 * } else if (response.status === 404) {
 *   console.error('Usuario no encontrado')
 * }
 * ```
 *
 * **Casos de Uso**:
 * 1. **Verificación de permisos antes de cambios**:
 *    - Admin quiere cambiar rol de usuario
 *    - Primero obtiene permisos actuales
 *    - Compara con lo que tendría con nuevo rol
 *
 * 2. **Debugging de permisos**:
 *    - Usuario reporta "no puedo hacer X"
 *    - Admin verifica qué permisos tiene
 *    - Identifica que le falta permiso Y
 *    - Asigna rol correcto
 *
 * 3. **Auditoría/compliance**:
 *    - Sistema necesita documentar qué podía hacer usuario X en fecha Y
 *    - Obtiene permisos y los registra
 *
 * **Limitaciones Actuales**:
 * - No hay soft delete de permisos (si se elimina permiso, usuario pierda acceso)
 * - No hay versionamiento de permisos históricos
 * - Calcula en tiempo real (sin caché)
 *
 * @see {@link ../roles/route.ts} para asignar/remover roles (que controlan permisos)
 * @see {@link ../../permissions/route.ts} para obtener todos los permisos del sistema
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.USER_READ)

    const { id } = await params

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

    // Obtener todos los permisos del usuario a través de sus roles
    const userRoles = await prisma.userRole.findMany({
      where: { userId: id },
      select: {
        role: {
          select: {
            id: true,
            name: true,
            rolePermissions: {
              select: {
                permission: {
                  select: {
                    id: true,
                    module: true,
                    description: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    // Agrupar permisos únicos por módulo
    const permissionsMap = new Map<string, {
      id: string
      module: string
      description: string | null
      createdAt: Date
      roles: string[]
    }>()

    userRoles.forEach((userRole) => {
      userRole.role.rolePermissions.forEach((rp) => {
        const perm = rp.permission
        if (permissionsMap.has(perm.id)) {
          // Agregar el rol a la lista de roles que otorgan este permiso
          permissionsMap.get(perm.id)!.roles.push(userRole.role.name)
        } else {
          permissionsMap.set(perm.id, {
            id: perm.id,
            module: perm.module,
            description: perm.description,
            createdAt: perm.createdAt,
            roles: [userRole.role.name],
          })
        }
      })
    })

    // Convertir a array y agrupar por módulo
    const permissions = Array.from(permissionsMap.values())
    const groupedByModule = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = []
      }
      acc[perm.module].push({
        id: perm.id,
        module: perm.module,
        description: perm.description,
        createdAt: perm.createdAt,
        roles: perm.roles,
      })
      return acc
    }, {} as Record<string, typeof permissions>)

    return NextResponse.json({
      userId: id,
      permissions: groupedByModule,
      totalPermissions: permissions.length,
      totalRoles: userRoles.length,
    })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
    console.error("Error fetching user permissions:", error)
    return NextResponse.json(
      { error: "Error al obtener permisos del usuario" },
      { status: 500 }
    )
  }
}
