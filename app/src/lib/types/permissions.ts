/**
 * Tipos para el sistema de permisos RBAC
 * Aurora Nova
 */

/**
 * Módulos del sistema con sus permisos
 */
export const PERMISSION_MODULES = {
  USER: 'user',
  ROLE: 'role',
  PERMISSION: 'permission',
  SYSTEM: 'system',
} as const

/**
 * Acciones estándar de permisos
 */
export const PERMISSION_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  MANAGE: 'manage',
} as const

/**
 * Información de un permiso
 */
export interface PermissionInfo {
  id: string  // Semantic ID like "user:create"
  module: string
  description: string | null
}

/**
 * Información de un rol con sus permisos
 */
export interface RoleInfo {
  id: string
  name: string
  description: string | null
  permissions: string[]  // Array of permission IDs
}

/**
 * Resultado de verificación de permisos
 */
export interface PermissionCheckResult {
  hasPermission: boolean
  missingPermissions?: string[]
}

/**
 * Opciones para verificación de permisos
 */
export interface PermissionCheckOptions {
  /**
   * Si true, requiere TODOS los permisos especificados
   * Si false, requiere AL MENOS UNO de los permisos
   * @default true
   */
  requireAll?: boolean
}

/**
 * Permisos predefinidos del sistema
 * Útil para TypeScript autocompletion
 */
export const SYSTEM_PERMISSIONS = {
  // User permissions
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_LIST: 'user:list',
  USER_MANAGE: 'user:manage',

  // Role permissions
  ROLE_CREATE: 'role:create',
  ROLE_READ: 'role:read',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',
  ROLE_LIST: 'role:list',
  ROLE_MANAGE: 'role:manage',

  // Permission permissions
  PERMISSION_CREATE: 'permission:create',
  PERMISSION_READ: 'permission:read',
  PERMISSION_UPDATE: 'permission:update',
  PERMISSION_DELETE: 'permission:delete',
  PERMISSION_LIST: 'permission:list',
  PERMISSION_MANAGE: 'permission:manage',

  // System permissions
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_CONFIG: 'system:config',
} as const

export type SystemPermission = typeof SYSTEM_PERMISSIONS[keyof typeof SYSTEM_PERMISSIONS]
