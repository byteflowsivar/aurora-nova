/**
 * Queries de Prisma para sistema de permisos RBAC
 * Aurora Nova
 *
 * Este módulo proporciona funciones optimizadas para verificación de permisos
 * y gestión de roles en el sistema.
 */

import { prisma } from "./connection"
import type { PermissionInfo, RoleInfo, PermissionCheckResult } from "@/lib/types/permissions"

// ============================================================================
// QUERIES DE PERMISOS
// ============================================================================

/**
 * Obtener todos los permisos de un usuario
 * Navega user -> user_role -> role -> role_permission -> permission
 *
 * @param userId - ID del usuario
 * @returns Array de IDs de permisos (ej: ['user:create', 'role:read'])
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const result = await prisma.rolePermission.findMany({
    where: {
      role: {
        userRoles: {
          some: {
            userId,
          },
        },
      },
    },
    select: {
      permissionId: true,
    },
    distinct: ['permissionId'], // Evitar duplicados si usuario tiene múltiples roles
  })

  return result.map((r) => r.permissionId)
}

/**
 * Verifica si un usuario tiene un permiso específico
 *
 * @param userId - ID del usuario
 * @param permissionId - ID semántico del permiso (ej: 'user:create')
 * @returns true si el usuario tiene el permiso
 */
export async function userHasPermission(
  userId: string,
  permissionId: string
): Promise<boolean> {
  const count = await prisma.rolePermission.count({
    where: {
      permissionId,
      role: {
        userRoles: {
          some: {
            userId,
          },
        },
      },
    },
  })

  return count > 0
}

/**
 * Verifica si un usuario tiene AL MENOS UNO de los permisos especificados
 *
 * @param userId - ID del usuario
 * @param permissionIds - Array de IDs de permisos
 * @returns true si el usuario tiene al menos uno de los permisos
 */
export async function userHasAnyPermission(
  userId: string,
  permissionIds: string[]
): Promise<boolean> {
  if (permissionIds.length === 0) return false

  const count = await prisma.rolePermission.count({
    where: {
      permissionId: {
        in: permissionIds,
      },
      role: {
        userRoles: {
          some: {
            userId,
          },
        },
      },
    },
  })

  return count > 0
}

/**
 * Verifica si un usuario tiene TODOS los permisos especificados
 *
 * @param userId - ID del usuario
 * @param permissionIds - Array de IDs de permisos
 * @returns PermissionCheckResult con resultado y permisos faltantes
 */
export async function userHasAllPermissions(
  userId: string,
  permissionIds: string[]
): Promise<PermissionCheckResult> {
  if (permissionIds.length === 0) {
    return { hasPermission: true }
  }

  // Obtener permisos del usuario
  const userPermissions = await getUserPermissions(userId)

  // Verificar cuáles permisos faltan
  const missingPermissions = permissionIds.filter(
    (p) => !userPermissions.includes(p)
  )

  return {
    hasPermission: missingPermissions.length === 0,
    missingPermissions: missingPermissions.length > 0 ? missingPermissions : undefined,
  }
}

/**
 * Obtener información detallada de permisos de un usuario
 *
 * @param userId - ID del usuario
 * @returns Array de PermissionInfo con detalles completos
 */
export async function getUserPermissionsDetailed(userId: string): Promise<PermissionInfo[]> {
  const result = await prisma.rolePermission.findMany({
    where: {
      role: {
        userRoles: {
          some: {
            userId,
          },
        },
      },
    },
    select: {
      permission: {
        select: {
          id: true,
          module: true,
          description: true,
        },
      },
    },
    distinct: ['permissionId'],
  })

  return result.map((r) => r.permission)
}

/**
 * Obtener roles de un usuario con sus permisos
 *
 * @param userId - ID del usuario
 * @returns Array de RoleInfo con permisos
 */
export async function getUserRolesWithPermissions(userId: string): Promise<RoleInfo[]> {
  const userWithRoles = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userRoles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
              description: true,
              rolePermissions: {
                select: {
                  permissionId: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!userWithRoles) return []

  return userWithRoles.userRoles.map((ur) => ({
    id: ur.role.id,
    name: ur.role.name,
    description: ur.role.description,
    permissions: ur.role.rolePermissions.map((rp) => rp.permissionId),
  }))
}

// ============================================================================
// QUERIES DE PERMISOS (CATÁLOGO)
// ============================================================================

/**
 * Obtener todos los permisos del sistema
 *
 * @returns Array de PermissionInfo
 */
export async function getAllPermissions(): Promise<PermissionInfo[]> {
  return await prisma.permission.findMany({
    select: {
      id: true,
      module: true,
      description: true,
    },
    orderBy: [
      { module: 'asc' },
      { id: 'asc' },
    ],
  })
}

/**
 * Obtener permisos por módulo
 *
 * @param module - Nombre del módulo (ej: 'user', 'role')
 * @returns Array de PermissionInfo del módulo
 */
export async function getPermissionsByModule(module: string): Promise<PermissionInfo[]> {
  return await prisma.permission.findMany({
    where: { module },
    select: {
      id: true,
      module: true,
      description: true,
    },
    orderBy: { id: 'asc' },
  })
}

/**
 * Verificar si un permiso existe
 *
 * @param permissionId - ID del permiso
 * @returns true si el permiso existe
 */
export async function permissionExists(permissionId: string): Promise<boolean> {
  const count = await prisma.permission.count({
    where: { id: permissionId },
  })

  return count > 0
}
