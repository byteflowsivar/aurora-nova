/**
 * Utilidades de autenticación para Aurora Nova
 *
 * Proporciona funciones helper para gestión de usuarios, credenciales,
 * roles y permisos. Integrado con Prisma ORM y bcryptjs para seguridad.
 *
 * @module lib/auth-utils
 * @see {@link structuredLogger} para logging
 * @see {@link prisma} para acceso a BD
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
import { structuredLogger } from "@/lib/logger/structured-logger"
import { createLogContext } from "@/lib/logger/helpers"

// ============================================================================
// GESTIÓN DE USUARIOS
// ============================================================================

/**
 * Crear nuevo usuario con credenciales en la BD
 *
 * Crea un usuario con contraseña hasheada usando bcryptjs (rounds: 12).
 * La contraseña NO se almacena en texto plano.
 *
 * @async
 * @param params - Parámetros del usuario a crear
 * @param params.email - Email único del usuario (será validado por BD)
 * @param params.password - Contraseña en texto plano (será hasheada automáticamente)
 * @param params.firstName - Nombre del usuario (opcional)
 * @param params.lastName - Apellido del usuario (opcional)
 * @param params.name - Nombre completo (opcional, se construye si no se proporciona)
 *
 * @returns {Promise<User>} Usuario creado con contraseñas ya hasheada
 *
 * @throws {Error} Si el email ya existe o hay error en BD
 *
 * @example
 * ```typescript
 * const user = await createUserWithCredentials({
 *   email: 'john.doe@example.com',
 *   password: 'SecurePassword123!',
 *   firstName: 'John',
 *   lastName: 'Doe'
 * });
 * console.log(user.id); // 'uuid-format-string'
 * console.log(user.email); // 'john.doe@example.com'
 * ```
 *
 * @see {@link verifyUserCredentials} para verificar credenciales en login
 * @see {@link updateUserPassword} para cambiar contraseña
 */
export async function createUserWithCredentials({
  email,
  password,
  firstName,
  lastName,
  name,
}: {
  /** Email único del usuario */
  email: string
  /** Contraseña en texto plano */
  password: string
  /** Nombre del usuario (opcional) */
  firstName?: string
  /** Apellido del usuario (opcional) */
  lastName?: string
  /** Nombre completo (opcional) */
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
 * Verificar credenciales de usuario (para login)
 *
 * Busca el usuario por email y compara la contraseña contra el hash almacenado.
 * Retorna el usuario si las credenciales son válidas, null si no.
 *
 * @async
 * @param email - Email del usuario
 * @param password - Contraseña en texto plano a verificar
 *
 * @returns {Promise<User|null>} Usuario si credenciales válidas, null si no
 *
 * @throws No lanza errores, retorna null en caso de error
 *
 * @example
 * ```typescript
 * const user = await verifyUserCredentials(
 *   'john.doe@example.com',
 *   'SecurePassword123!'
 * );
 *
 * if (user) {
 *   console.log('Login exitoso:', user.id);
 *   // Proceder con creación de sesión
 * } else {
 *   console.log('Credenciales inválidas');
 *   // Mostrar error a usuario
 * }
 * ```
 *
 * @see {@link createUserWithCredentials} para crear usuario
 * @see {@link updateUserPassword} para cambiar contraseña
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
    structuredLogger.error("Error verifying credentials", error as Error,
      createLogContext('auth', 'verify_credentials', { email })
    );
    return null
  }
}

/**
 * Actualizar contraseña de usuario
 *
 * Actualiza la contraseña hasheada del usuario en la BD.
 * La nueva contraseña será hasheada con bcryptjs antes de guardarse.
 *
 * @async
 * @param userId - ID único del usuario
 * @param newPassword - Nueva contraseña en texto plano
 *
 * @returns {Promise<boolean>} true si se actualizó exitosamente, false si error
 *
 * @example
 * ```typescript
 * const success = await updateUserPassword(
 *   'user-123',
 *   'NewPassword456!'
 * );
 *
 * if (success) {
 *   console.log('Contraseña actualizada');
 * } else {
 *   console.log('Error al actualizar contraseña');
 * }
 * ```
 *
 * @see {@link verifyUserCredentials} para verificar contraseña
 * @see {@link createUserWithCredentials} para crear usuario
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
    structuredLogger.error("Error updating password", error as Error,
      createLogContext('auth', 'update_password', { userId })
    );
    return false
  }
}

/**
 * Marcar email de usuario como verificado
 *
 * Actualiza el campo emailVerified con la fecha actual,
 * indicando que el email ha sido confirmado.
 *
 * @async
 * @param userId - ID único del usuario
 *
 * @returns {Promise<boolean>} true si se marcó correctamente, false si error
 *
 * @example
 * ```typescript
 * const verified = await verifyUserEmail('user-123');
 *
 * if (verified) {
 *   console.log('Email verificado');
 *   // El usuario ahora puede acceder completamente
 * }
 * ```
 *
 * @see {@link createUserWithCredentials} para crear usuario
 */
export async function verifyUserEmail(userId: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() }
    })

    return true
  } catch (error) {
    structuredLogger.error("Error verifying email", error as Error,
      createLogContext('auth', 'verify_email', { userId })
    );
    return false
  }
}

// ============================================================================
// GESTIÓN DE PERMISOS
// ============================================================================

/**
 * Verificar si un usuario tiene un permiso específico
 *
 * Busca si el usuario tiene el permiso requerido a través de sus roles.
 * Útil para verificaciones de autorización en aplicación.
 *
 * @async
 * @param userId - ID único del usuario
 * @param permissionId - ID del permiso (ej: 'user:create', 'role:delete')
 *
 * @returns {Promise<boolean>} true si usuario tiene permiso, false si no
 *
 * @example
 * ```typescript
 * const canCreateUsers = await userHasPermission('user-123', 'user:create');
 *
 * if (canCreateUsers) {
 *   // Mostrar formulario de crear usuario
 * } else {
 *   // Mostrar página sin permiso
 * }
 * ```
 *
 * @see {@link getUserPermissions} para obtener todos los permisos
 * @see {@link PermissionGate} para usar en componentes React
 */
export async function userHasPermission(
  userId: string,
  permissionId: string
): Promise<boolean> {
  return await checkUserPermission(userId, permissionId)
}

/**
 * Obtener todos los permisos de un usuario
 *
 * Retorna array con IDs de todos los permisos que tiene el usuario
 * a través de sus roles asignados.
 *
 * @async
 * @param userId - ID único del usuario
 *
 * @returns {Promise<string[]>} Array de IDs de permisos (ej: ['user:read', 'user:create'])
 *
 * @example
 * ```typescript
 * const permissions = await getUserPermissions('user-123');
 *
 * console.log(permissions);
 * // Output: ['user:read', 'user:create', 'user:update', 'role:read']
 *
 * // Verificar múltiples permisos
 * const canManageUsers = permissions.some(p =>
 *   ['user:create', 'user:delete'].includes(p)
 * );
 * ```
 *
 * @see {@link userHasPermission} para verificar un permiso específico
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  return await getUserPerms(userId)
}

/**
 * Obtener todos los roles asignados a un usuario
 *
 * Retorna array de roles con información (id, name, description).
 * Los roles determinan los permisos que tiene el usuario.
 *
 * @async
 * @param userId - ID único del usuario
 *
 * @returns {Promise<Array<{id: string, name: string, description?: string}>>}
 *          Array de roles del usuario
 *
 * @example
 * ```typescript
 * const roles = await getUserRoles('user-123');
 *
 * console.log(roles);
 * // Output: [
 * //   { id: 'role-1', name: 'Administrator', description: 'Acceso total' },
 * //   { id: 'role-2', name: 'User', description: 'Usuario estándar' }
 * // ]
 *
 * // Verificar si tiene rol específico
 * const isAdmin = roles.some(r => r.name === 'Administrator');
 * ```
 *
 * @see {@link assignRoleToUser} para asignar rol
 * @see {@link removeRoleFromUser} para remover rol
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
    structuredLogger.error("Error getting user roles", error as Error,
      createLogContext('auth', 'get_user_roles', { userId })
    );
    return []
  }
}

/**
 * Asignar rol a usuario
 *
 * Crea una relación entre usuario y rol, otorgándole todos los permisos del rol.
 * Típicamente realizado por administrador.
 *
 * @async
 * @param userId - ID único del usuario
 * @param roleId - ID del rol a asignar
 * @param createdBy - ID del usuario admin que realiza la asignación (opcional, para auditoría)
 *
 * @returns {Promise<boolean>} true si se asignó exitosamente, false si error
 *
 * @example
 * ```typescript
 * const assigned = await assignRoleToUser(
 *   'user-123',
 *   'admin-role',
 *   'admin-456' // quién está asignando
 * );
 *
 * if (assigned) {
 *   console.log('Rol asignado al usuario');
 *   // Usuario ahora tiene acceso basado en el nuevo rol
 * }
 * ```
 *
 * @see {@link removeRoleFromUser} para remover rol
 * @see {@link getUserRoles} para ver roles del usuario
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
    structuredLogger.error("Error assigning role", error as Error,
      createLogContext('auth', 'assign_role', { userId, roleId })
    );
    return false
  }
}

/**
 * Remover rol de usuario
 *
 * Elimina la relación entre usuario y rol, revocando los permisos del rol.
 * Acción que solo debe realizada por administrador.
 *
 * @async
 * @param userId - ID único del usuario
 * @param roleId - ID del rol a remover
 *
 * @returns {Promise<boolean>} true si se removió exitosamente, false si error
 *
 * @example
 * ```typescript
 * const removed = await removeRoleFromUser('user-123', 'old-role');
 *
 * if (removed) {
 *   console.log('Rol removido del usuario');
 *   // Usuario ya no tiene permisos de ese rol
 * } else {
 *   console.log('Error al remover rol');
 * }
 * ```
 *
 * @see {@link assignRoleToUser} para asignar rol
 * @see {@link getUserRoles} para ver roles del usuario
 */
export async function removeRoleFromUser(
  userId: string,
  roleId: string
): Promise<boolean> {
  try {
    await removeRole(userId, roleId)
    return true
  } catch (error) {
    structuredLogger.error("Error removing role", error as Error,
      createLogContext('auth', 'remove_role', { userId, roleId })
    );
    return false
  }
}