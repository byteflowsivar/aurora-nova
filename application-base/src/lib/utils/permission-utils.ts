/**
 * Utilidades para verificación de permisos
 * Aurora Nova - Sistema RBAC
 *
 * Funciones helper para verificar permisos de manera sencilla y type-safe
 */

import {
  getUserPermissions,
  userHasPermission,
  userHasAnyPermission,
  userHasAllPermissions,
} from "@/lib/prisma/permission-queries"
import type {
  PermissionCheckOptions,
  PermissionCheckResult,
  SystemPermission,
} from "@/lib/types/permissions"

// ============================================================================
// VERIFICACIÓN DE PERMISOS (SERVIDOR)
// ============================================================================

/**
 * Verifica si un usuario tiene un permiso específico
 * Helper con mejor ergonomía para usar en server components y actions
 *
 * @param userId - ID del usuario
 * @param permission - ID del permiso o SystemPermission
 * @returns true si tiene el permiso
 *
 * @example
 * ```ts
 * if (await hasPermission(userId, 'user:create')) {
 *   // Usuario puede crear usuarios
 * }
 *
 * // Con TypeScript autocompletion
 * if (await hasPermission(userId, SYSTEM_PERMISSIONS.USER_CREATE)) {
 *   // Usuario puede crear usuarios
 * }
 * ```
 */
export async function hasPermission(
  userId: string,
  permission: string | SystemPermission
): Promise<boolean> {
  return await userHasPermission(userId, permission)
}

/**
 * Verifica si un usuario tiene múltiples permisos
 * Por defecto requiere TODOS los permisos (AND), pero puede configurarse para requerir AL MENOS UNO (OR)
 *
 * @param userId - ID del usuario
 * @param permissions - Array de permisos a verificar
 * @param options - Opciones de verificación
 * @returns PermissionCheckResult
 *
 * @example
 * ```ts
 * // Requiere TODOS los permisos (AND)
 * const result = await hasPermissions(userId, ['user:create', 'user:update'])
 * if (result.hasPermission) {
 *   // Usuario tiene ambos permisos
 * } else {
 *   console.log('Permisos faltantes:', result.missingPermissions)
 * }
 *
 * // Requiere AL MENOS UNO (OR)
 * const result = await hasPermissions(userId, ['user:create', 'user:update'], { requireAll: false })
 * if (result.hasPermission) {
 *   // Usuario tiene al menos uno de los permisos
 * }
 * ```
 */
export async function hasPermissions(
  userId: string,
  permissions: string[],
  options: PermissionCheckOptions = {}
): Promise<PermissionCheckResult> {
  const { requireAll = true } = options

  if (requireAll) {
    // Requiere TODOS los permisos
    return await userHasAllPermissions(userId, permissions)
  } else {
    // Requiere AL MENOS UNO
    const hasAny = await userHasAnyPermission(userId, permissions)
    return { hasPermission: hasAny }
  }
}

/**
 * Verifica si un usuario tiene AL MENOS UNO de los permisos (OR)
 * Alias de hasPermissions con requireAll: false
 *
 * @param userId - ID del usuario
 * @param permissions - Array de permisos
 * @returns true si tiene al menos uno
 *
 * @example
 * ```ts
 * // Usuario puede editar O crear usuarios
 * if (await hasAnyPermission(userId, ['user:create', 'user:update'])) {
 *   // Mostrar formulario de usuario
 * }
 * ```
 */
export async function hasAnyPermission(
  userId: string,
  permissions: string[]
): Promise<boolean> {
  return await userHasAnyPermission(userId, permissions)
}

/**
 * Verifica si un usuario tiene TODOS los permisos (AND)
 * Alias de hasPermissions con requireAll: true
 *
 * @param userId - ID del usuario
 * @param permissions - Array de permisos
 * @returns PermissionCheckResult
 *
 * @example
 * ```ts
 * // Usuario debe poder crear Y actualizar usuarios
 * const result = await hasAllPermissions(userId, ['user:create', 'user:update'])
 * if (result.hasPermission) {
 *   // Usuario tiene ambos permisos
 * }
 * ```
 */
export async function hasAllPermissions(
  userId: string,
  permissions: string[]
): Promise<PermissionCheckResult> {
  return await userHasAllPermissions(userId, permissions)
}

/**
 * Obtiene todos los permisos de un usuario
 * Útil para inicialización de estado o verificaciones en cliente
 *
 * @param userId - ID del usuario
 * @returns Array de permission IDs
 *
 * @example
 * ```ts
 * const permissions = await getPermissions(userId)
 * // ['user:create', 'user:read', 'role:list']
 * ```
 */
export async function getPermissions(userId: string): Promise<string[]> {
  return await getUserPermissions(userId)
}

// ============================================================================
// HELPERS DE VERIFICACIÓN (CLIENTE)
// ============================================================================

/**
 * Verifica si un array de permisos incluye un permiso específico
 * Útil en cliente cuando ya tienes los permisos del usuario
 *
 * @param userPermissions - Array de permisos del usuario
 * @param permission - Permiso a verificar
 * @returns true si el usuario tiene el permiso
 *
 * @example
 * ```ts
 * const userPermissions = ['user:create', 'user:read']
 * if (checkPermission(userPermissions, 'user:create')) {
 *   // Usuario puede crear usuarios
 * }
 * ```
 */
export function checkPermission(
  userPermissions: string[],
  permission: string
): boolean {
  return userPermissions.includes(permission)
}

/**
 * Verifica si un usuario tiene AL MENOS UNO de los permisos (OR)
 * Versión cliente de hasAnyPermission
 *
 * @param userPermissions - Array de permisos del usuario
 * @param permissions - Permisos a verificar
 * @returns true si tiene al menos uno
 *
 * @example
 * ```ts
 * const userPermissions = ['user:create', 'role:read']
 * if (checkAnyPermission(userPermissions, ['user:create', 'user:update'])) {
 *   // Usuario puede crear (aunque no puede actualizar)
 * }
 * ```
 */
export function checkAnyPermission(
  userPermissions: string[],
  permissions: string[]
): boolean {
  return permissions.some((p) => userPermissions.includes(p))
}

/**
 * Verifica si un usuario tiene TODOS los permisos (AND)
 * Versión cliente de hasAllPermissions
 *
 * @param userPermissions - Array de permisos del usuario
 * @param permissions - Permisos a verificar
 * @returns PermissionCheckResult
 *
 * @example
 * ```ts
 * const userPermissions = ['user:create', 'user:update', 'user:delete']
 * const result = checkAllPermissions(userPermissions, ['user:create', 'user:update'])
 * if (result.hasPermission) {
 *   // Usuario tiene ambos permisos
 * }
 * ```
 */
export function checkAllPermissions(
  userPermissions: string[],
  permissions: string[]
): PermissionCheckResult {
  const missingPermissions = permissions.filter(
    (p) => !userPermissions.includes(p)
  )

  return {
    hasPermission: missingPermissions.length === 0,
    missingPermissions: missingPermissions.length > 0 ? missingPermissions : undefined,
  }
}
