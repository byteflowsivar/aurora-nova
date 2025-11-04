/**
 * Helpers de servidor para enforcing de permisos
 * Aurora Nova - Sistema RBAC
 *
 * Estas funciones permiten proteger server actions y server components
 * lanzando errores cuando el usuario no tiene los permisos necesarios.
 */

import { auth } from "@/lib/auth"
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "@/lib/utils/permission-utils"
import type { SystemPermission } from "@/lib/types/permissions"

// ============================================================================
// TIPOS Y ERRORES
// ============================================================================

/**
 * Error lanzado cuando un usuario no tiene los permisos necesarios
 */
export class PermissionDeniedError extends Error {
  public readonly requiredPermissions: string[]
  public readonly missingPermissions?: string[]

  constructor(
    requiredPermissions: string[],
    missingPermissions?: string[]
  ) {
    const message = missingPermissions
      ? `Permisos insuficientes. Faltan: ${missingPermissions.join(", ")}`
      : `Permisos insuficientes. Se requiere: ${requiredPermissions.join(", ")}`

    super(message)
    this.name = "PermissionDeniedError"
    this.requiredPermissions = requiredPermissions
    this.missingPermissions = missingPermissions
  }
}

/**
 * Error lanzado cuando no hay sesión de usuario autenticado
 */
export class UnauthenticatedError extends Error {
  constructor() {
    super("Usuario no autenticado")
    this.name = "UnauthenticatedError"
  }
}

// ============================================================================
// OBTENER USUARIO ACTUAL
// ============================================================================

/**
 * Obtiene el ID del usuario actual desde la sesión
 * Lanza UnauthenticatedError si no hay sesión
 *
 * @returns ID del usuario autenticado
 * @throws {UnauthenticatedError} Si no hay sesión
 *
 * @example
 * ```ts
 * export async function myServerAction() {
 *   const userId = await requireAuth()
 *   // Usuario está autenticado, continuar...
 * }
 * ```
 */
export async function requireAuth(): Promise<string> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new UnauthenticatedError()
  }

  return session.user.id
}

/**
 * Obtiene el ID del usuario actual si existe, null si no
 * No lanza error, útil para operaciones opcionales
 *
 * @returns ID del usuario o null
 *
 * @example
 * ```ts
 * export async function publicAction() {
 *   const userId = await getCurrentUserId()
 *   if (userId) {
 *     // Personalizar para usuario autenticado
 *   } else {
 *     // Funcionalidad pública
 *   }
 * }
 * ```
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id || null
}

// ============================================================================
// REQUIRE PERMISSION - Verificación estricta con errores
// ============================================================================

/**
 * Requiere que el usuario tenga UN permiso específico
 * Lanza error si no está autenticado o no tiene el permiso
 *
 * @param permission - Permiso requerido
 * @returns ID del usuario (para conveniencia)
 * @throws {UnauthenticatedError} Si no hay sesión
 * @throws {PermissionDeniedError} Si no tiene el permiso
 *
 * @example
 * ```ts
 * export async function createUser(data: CreateUserInput) {
 *   const userId = await requirePermission('user:create')
 *   // Usuario tiene el permiso, continuar con la creación...
 * }
 *
 * // Con SystemPermission para autocompletado
 * import { SYSTEM_PERMISSIONS } from '@/lib/types/permissions'
 * export async function deleteUser(id: string) {
 *   await requirePermission(SYSTEM_PERMISSIONS.USER_DELETE)
 *   // ...
 * }
 * ```
 */
export async function requirePermission(
  permission: string | SystemPermission
): Promise<string> {
  const userId = await requireAuth()

  const hasRequiredPermission = await hasPermission(userId, permission)

  if (!hasRequiredPermission) {
    throw new PermissionDeniedError([permission])
  }

  return userId
}

/**
 * Requiere que el usuario tenga AL MENOS UNO de los permisos (OR)
 * Lanza error si no está autenticado o no tiene ninguno de los permisos
 *
 * @param permissions - Array de permisos (requiere al menos uno)
 * @returns ID del usuario
 * @throws {UnauthenticatedError} Si no hay sesión
 * @throws {PermissionDeniedError} Si no tiene ninguno de los permisos
 *
 * @example
 * ```ts
 * export async function manageUser(id: string, data: UpdateUserInput) {
 *   // Permitir si puede crear O actualizar usuarios
 *   const userId = await requireAnyPermission(['user:create', 'user:update'])
 *   // Usuario tiene al menos uno de los permisos...
 * }
 * ```
 */
export async function requireAnyPermission(
  permissions: string[]
): Promise<string> {
  const userId = await requireAuth()

  const hasAny = await hasAnyPermission(userId, permissions)

  if (!hasAny) {
    throw new PermissionDeniedError(permissions)
  }

  return userId
}

/**
 * Requiere que el usuario tenga TODOS los permisos especificados (AND)
 * Lanza error si no está autenticado o no tiene todos los permisos
 * El error incluye la lista de permisos faltantes
 *
 * @param permissions - Array de permisos (requiere todos)
 * @returns ID del usuario
 * @throws {UnauthenticatedError} Si no hay sesión
 * @throws {PermissionDeniedError} Si no tiene todos los permisos
 *
 * @example
 * ```ts
 * export async function assignRoleToUser(userId: string, roleId: string) {
 *   // Requiere poder actualizar usuarios Y asignar roles
 *   await requireAllPermissions(['user:update', 'role:assign'])
 *   // Usuario tiene ambos permisos...
 * }
 * ```
 */
export async function requireAllPermissions(
  permissions: string[]
): Promise<string> {
  const userId = await requireAuth()

  const result = await hasAllPermissions(userId, permissions)

  if (!result.hasPermission) {
    throw new PermissionDeniedError(permissions, result.missingPermissions)
  }

  return userId
}

/**
 * Requiere que el usuario sea administrador del sistema
 * Shortcut para requirePermission('system:admin')
 *
 * @returns ID del usuario
 * @throws {UnauthenticatedError} Si no hay sesión
 * @throws {PermissionDeniedError} Si no es admin
 *
 * @example
 * ```ts
 * export async function dangerousSystemOperation() {
 *   await requireAdmin()
 *   // Solo administradores pueden ejecutar esto...
 * }
 * ```
 */
export async function requireAdmin(): Promise<string> {
  return await requirePermission("system:admin")
}

// ============================================================================
// WITH PERMISSION - Wrapper functions para server actions
// ============================================================================

/**
 * Opciones para configurar el comportamiento de withPermission
 */
interface WithPermissionOptions {
  /**
   * Si true, requiere TODOS los permisos (AND)
   * Si false, requiere AL MENOS UNO (OR)
   * @default true
   */
  requireAll?: boolean
}

/**
 * HOF que envuelve un server action con verificación de permisos
 * Automáticamente verifica permisos antes de ejecutar la acción
 *
 * @param permissions - Array de permisos requeridos
 * @param action - Server action a proteger
 * @param options - Opciones de configuración
 * @returns Nueva función con verificación de permisos
 *
 * @example
 * ```ts
 * // Server action protegida
 * export const createUser = withPermission(
 *   ['user:create'],
 *   async (data: CreateUserInput) => {
 *     // Esta función solo se ejecuta si el usuario tiene el permiso
 *     const user = await prisma.user.create({ data })
 *     return successResponse(user)
 *   }
 * )
 *
 * // Con múltiples permisos (AND por defecto)
 * export const dangerousAction = withPermission(
 *   ['user:delete', 'system:admin'],
 *   async (userId: string) => {
 *     await deleteUser(userId)
 *     return successResponse()
 *   }
 * )
 *
 * // Con múltiples permisos (OR)
 * export const manageAction = withPermission(
 *   ['user:create', 'user:update'],
 *   async (data: any) => {
 *     // ...
 *   },
 *   { requireAll: false }
 * )
 * ```
 */
export function withPermission<TArgs extends unknown[], TReturn>(
  permissions: string[],
  action: (...args: TArgs) => Promise<TReturn>,
  options: WithPermissionOptions = {}
): (...args: TArgs) => Promise<TReturn> {
  const { requireAll = true } = options

  return async (...args: TArgs): Promise<TReturn> => {
    // Verificar permisos antes de ejecutar la acción
    if (requireAll) {
      await requireAllPermissions(permissions)
    } else {
      await requireAnyPermission(permissions)
    }

    // Ejecutar la acción original
    return await action(...args)
  }
}

/**
 * HOF que envuelve un server action verificando que el usuario esté autenticado
 * No verifica permisos, solo que haya sesión
 *
 * @param action - Server action a proteger
 * @returns Nueva función con verificación de autenticación
 *
 * @example
 * ```ts
 * export const getUserProfile = withAuth(async (userId: string) => {
 *   // Esta función solo se ejecuta si hay sesión
 *   const profile = await prisma.user.findUnique({ where: { id: userId } })
 *   return successResponse(profile)
 * })
 * ```
 */
export function withAuth<TArgs extends unknown[], TReturn>(
  action: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    await requireAuth()
    return await action(...args)
  }
}

/**
 * HOF que envuelve un server action verificando que sea un admin
 * Shortcut para withPermission(['system:admin'], action)
 *
 * @param action - Server action a proteger
 * @returns Nueva función con verificación de admin
 *
 * @example
 * ```ts
 * export const systemConfig = withAdmin(async (config: SystemConfig) => {
 *   // Solo admins pueden ejecutar esto
 *   await updateSystemConfig(config)
 *   return successResponse()
 * })
 * ```
 */
export function withAdmin<TArgs extends unknown[], TReturn>(
  action: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return withPermission(["system:admin"], action)
}
