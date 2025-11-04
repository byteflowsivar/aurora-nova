/**
 * Utilidades de autenticación para Aurora Nova
 * Funciones helper para gestión de usuarios, roles y permisos con Prisma
 */

import { prisma } from "@/lib/prisma/connection"
import {
  createUserWithCredentials as createUserWithCreds,
  getUserPermissions as getUserPerms,
  userHasPermission as checkUserPermission,
  assignRoleToUser as assignRole,
  removeRoleFromUser as removeRole
} from "@/lib/prisma/queries"
import type { User } from "@/lib/prisma/types"
import bcrypt from "bcryptjs"

// ============================================================================
// GESTIÓN DE USUARIOS
// ============================================================================

/**
 * Crear nuevo usuario con credenciales
 */
export async function createUserWithCredentials({
  email,
  password,
  firstName,
  lastName,
  name,
}: {
  email: string
  password: string
  firstName?: string
  lastName?: string
  name?: string
}): Promise<User> {
  const hashedPassword = await bcrypt.hash(password, 12)

  return await createUserWithCreds({
    email,
    name: name || `${firstName} ${lastName}`.trim() || undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
  }, hashedPassword)
}

/**
 * Verificar credenciales de usuario
 */
export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<User | null> {
  try {
    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { credentials: true }
    })

    if (!user?.credentials) return null

    // Verificar password
    const isValid = await bcrypt.compare(password, user.credentials.hashedPassword)

    return isValid ? user : null
  } catch (error) {
    console.error("Error verifying credentials:", error)
    return null
  }
}

/**
 * Actualizar password de usuario
 */
export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<boolean> {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.userCredentials.update({
      where: { userId },
      data: { hashedPassword }
    })

    return true
  } catch (error) {
    console.error("Error updating password:", error)
    return false
  }
}

/**
 * Marcar email como verificado
 */
export async function verifyUserEmail(userId: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() }
    })

    return true
  } catch (error) {
    console.error("Error verifying email:", error)
    return false
  }
}

// ============================================================================
// GESTIÓN DE PERMISOS
// ============================================================================

/**
 * Verificar si un usuario tiene un permiso específico
 */
export async function userHasPermission(
  userId: string,
  permissionId: string
): Promise<boolean> {
  return await checkUserPermission(userId, permissionId)
}

/**
 * Obtener todos los permisos de un usuario
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  return await getUserPerms(userId)
}

/**
 * Obtener roles de un usuario
 */
export async function getUserRoles(userId: string) {
  try {
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })

    return userWithRoles?.userRoles.map(ur => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description
    })) || []
  } catch (error) {
    console.error("Error getting user roles:", error)
    return []
  }
}

/**
 * Asignar rol a usuario
 */
export async function assignRoleToUser(
  userId: string,
  roleId: string,
  createdBy?: string
): Promise<boolean> {
  try {
    await assignRole(userId, roleId, createdBy)
    return true
  } catch (error) {
    console.error("Error assigning role:", error)
    return false
  }
}

/**
 * Remover rol de usuario
 */
export async function removeRoleFromUser(
  userId: string,
  roleId: string
): Promise<boolean> {
  try {
    await removeRole(userId, roleId)
    return true
  } catch (error) {
    console.error("Error removing role:", error)
    return false
  }
}