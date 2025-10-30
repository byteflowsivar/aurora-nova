/**
 * Utilidades de autenticación para Aurora Nova
 * Funciones helper para gestión de usuarios, roles y permisos con Auth.js
 */

import { db } from "@/lib/db/connection"
import {
  userTable,
  userCredentialsTable,
  userRoleTable,
  roleTable,
  permissionTable,
  rolePermissionTable,
  type User,
} from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"
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

  // Usar transacción para crear usuario y credenciales
  return await db.transaction(async (tx) => {
    // Crear usuario
    const [user] = await tx
      .insert(userTable)
      .values({
        email,
        name: name || `${firstName} ${lastName}`.trim() || null,
        firstName: firstName || null,
        lastName: lastName || null,
        emailVerified: null, // Se verificará por email
      })
      .returning()

    // Crear credenciales
    await tx
      .insert(userCredentialsTable)
      .values({
        userId: user.id,
        hashedPassword,
      })

    return user
  })
}

/**
 * Verificar credenciales de usuario
 */
export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<User | null> {
  try {
    // Buscar usuario
    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1)

    if (!user) return null

    // Buscar credenciales
    const [credentials] = await db
      .select()
      .from(userCredentialsTable)
      .where(eq(userCredentialsTable.userId, user.id))
      .limit(1)

    if (!credentials) return null

    // Verificar password
    const isValid = await bcrypt.compare(password, credentials.hashedPassword)

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

    await db
      .update(userCredentialsTable)
      .set({
        hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(userCredentialsTable.userId, userId))

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
    await db
      .update(userTable)
      .set({
        emailVerified: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, userId))

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
  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(userRoleTable)
      .innerJoin(rolePermissionTable, eq(userRoleTable.roleId, rolePermissionTable.roleId))
      .where(
        and(
          eq(userRoleTable.userId, userId),
          eq(rolePermissionTable.permissionId, permissionId)
        )
      )
      .limit(1)

    return result.length > 0
  } catch (error) {
    console.error("Error checking permission:", error)
    return false
  }
}

/**
 * Obtener todos los permisos de un usuario
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const permissions = await db
      .select({ id: permissionTable.id })
      .from(userRoleTable)
      .innerJoin(rolePermissionTable, eq(userRoleTable.roleId, rolePermissionTable.roleId))
      .innerJoin(permissionTable, eq(rolePermissionTable.permissionId, permissionTable.id))
      .where(eq(userRoleTable.userId, userId))

    return permissions.map(p => p.id)
  } catch (error) {
    console.error("Error getting user permissions:", error)
    return []
  }
}

/**
 * Obtener roles de un usuario
 */
export async function getUserRoles(userId: string) {
  try {
    const roles = await db
      .select({
        id: roleTable.id,
        name: roleTable.name,
        description: roleTable.description,
      })
      .from(userRoleTable)
      .innerJoin(roleTable, eq(userRoleTable.roleId, roleTable.id))
      .where(eq(userRoleTable.userId, userId))

    return roles
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
    await db
      .insert(userRoleTable)
      .values({
        userId,
        roleId,
        createdBy: createdBy || null,
      })
      .onConflictDoNothing()

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
    await db
      .delete(userRoleTable)
      .where(
        and(
          eq(userRoleTable.userId, userId),
          eq(userRoleTable.roleId, roleId)
        )
      )

    return true
  } catch (error) {
    console.error("Error removing role:", error)
    return false
  }
}