/**
 * Queries tipadas con Prisma para Aurora Nova
 * Funciones helper para operaciones frecuentes de base de datos
 */

import { prisma } from './connection'
import type {
  User,
  UserWithRoles,
  UserWithFullData,
  RoleWithPermissions,
  UserWithCredentials,
  UserWithRolesAndPermissions
} from './types'

// ============================================================================
// QUERIES DE USUARIOS
// ============================================================================

/**
 * Obtener usuario por ID
 */
export async function getUserById(id: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { id }
  })
}

/**
 * Obtener usuario por email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { email }
  })
}

/**
 * Obtener usuario con credenciales
 */
export async function getUserWithCredentials(userId: string): Promise<UserWithCredentials | null> {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      credentials: true
    }
  })
}

/**
 * Obtener usuario con sus roles
 */
export async function getUserWithRoles(userId: string): Promise<UserWithRoles | null> {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: true
        }
      }
    }
  })
}

/**
 * Obtener usuario con roles y permisos completos
 */
export async function getUserWithFullData(userId: string): Promise<UserWithFullData | null> {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  })
}

/**
 * Obtener permisos de un usuario (array plano)
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const result = await prisma.rolePermission.findMany({
    where: {
      role: {
        userRoles: {
          some: {
            userId: userId
          }
        }
      }
    },
    select: {
      permissionId: true
    }
  })

  return result.map(r => r.permissionId)
}

/**
 * Verificar si un usuario tiene un permiso específico
 */
export async function userHasPermission(userId: string, permissionId: string): Promise<boolean> {
  const count = await prisma.rolePermission.count({
    where: {
      permissionId: permissionId,
      role: {
        userRoles: {
          some: {
            userId: userId
          }
        }
      }
    }
  })

  return count > 0
}

/**
 * Crear usuario con credenciales
 */
export async function createUserWithCredentials(
  userData: {
    email: string
    firstName?: string
    lastName?: string
    name?: string
  },
  hashedPassword: string
): Promise<User> {
  return await prisma.user.create({
    data: {
      ...userData,
      credentials: {
        create: {
          hashedPassword
        }
      }
    }
  })
}

// ============================================================================
// QUERIES DE ROLES
// ============================================================================

/**
 * Obtener rol por ID
 */
export async function getRoleById(id: string): Promise<RoleWithPermissions | null> {
  return await prisma.role.findUnique({
    where: { id },
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    }
  })
}

/**
 * Obtener rol por nombre
 */
export async function getRoleByName(name: string): Promise<RoleWithPermissions | null> {
  return await prisma.role.findUnique({
    where: { name },
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    }
  })
}

/**
 * Listar todos los roles con sus permisos
 */
export async function getAllRolesWithPermissions(): Promise<RoleWithPermissions[]> {
  return await prisma.role.findMany({
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  })
}

/**
 * Asignar rol a usuario
 */
export async function assignRoleToUser(
  userId: string,
  roleId: string,
  createdBy?: string
): Promise<void> {
  await prisma.userRole.create({
    data: {
      userId,
      roleId,
      createdBy
    }
  })
}

/**
 * Remover rol de usuario
 */
export async function removeRoleFromUser(userId: string, roleId: string): Promise<void> {
  await prisma.userRole.delete({
    where: {
      userId_roleId: {
        userId,
        roleId
      }
    }
  })
}

// ============================================================================
// QUERIES DE SESIONES
// ============================================================================

/**
 * Obtener sesión por token
 */
export async function getSessionByToken(sessionToken: string) {
  return await prisma.session.findUnique({
    where: { sessionToken },
    include: {
      user: true
    }
  })
}

/**
 * Obtener sesiones activas de un usuario
 */
export async function getUserActiveSessions(userId: string) {
  return await prisma.session.findMany({
    where: {
      userId,
      expires: {
        gt: new Date()
      }
    }
  })
}

/**
 * Limpiar sesiones expiradas
 */
export async function cleanExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expires: {
        lte: new Date()
      }
    }
  })

  return result.count
}

// ============================================================================
// QUERIES DE ESTADÍSTICAS
// ============================================================================

/**
 * Obtener estadísticas generales del sistema
 */
export async function getSystemStats() {
  const [usersCount, rolesCount, permissionsCount, activeSessionsCount] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.permission.count(),
    prisma.session.count({
      where: {
        expires: {
          gt: new Date()
        }
      }
    })
  ])

  return {
    users: usersCount,
    roles: rolesCount,
    permissions: permissionsCount,
    activeSessions: activeSessionsCount,
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convertir usuario con datos completos a formato simplificado
 */
export function simplifyUserWithFullData(user: UserWithFullData): UserWithRolesAndPermissions {
  const roles = user.userRoles.map(ur => ({
    id: ur.role.id,
    name: ur.role.name,
    description: ur.role.description
  }))

  const permissions = Array.from(new Set(
    user.userRoles.flatMap(ur =>
      ur.role.rolePermissions.map(rp => rp.permission.id)
    )
  ))

  return {
    id: user.id,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image,
    roles,
    permissions,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }
}