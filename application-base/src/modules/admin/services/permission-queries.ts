/**
 * Módulo de Queries para Sistema RBAC - Aurora Nova
 *
 * Proporciona funciones optimizadas para consultar permisos y roles
 * desde la base de datos. Implementa eficientemente el sistema de control
 * de acceso basado en roles (RBAC).
 *
 * **Características**:
 * - Verificación eficiente de permisos de usuario
 * - Soporte para verificación simple, múltiple (ANY), o completa (ALL)
 * - Catálogo de permisos del sistema
 * - Obtención de roles con permisos asignados
 * - Caché-friendly: usa `distinct` para evitar duplicados
 *
 * **Categorías de Funciones**:
 *
 * **1. VERIFICACIÓN DE PERMISOS DE USUARIO**:
 * - `getUserPermissions()` - Obtener array de IDs de permiso
 * - `userHasPermission()` - Verificar 1 permiso (boolean)
 * - `userHasAnyPermission()` - Verificar AL MENOS UNO (OR logic)
 * - `userHasAllPermissions()` - Verificar TODOS (AND logic) con missingPermissions
 *
 * **2. INFORMACIÓN DETALLADA**:
 * - `getUserPermissionsDetailed()` - Obtener PermissionInfo[] completo
 * - `getUserRolesWithPermissions()` - Obtener roles con permisos
 *
 * **3. CATÁLOGO DE PERMISOS**:
 * - `getAllPermissions()` - Listar todos los permisos
 * - `getPermissionsByModule()` - Permisos de un módulo específico
 * - `permissionExists()` - Verificar existencia de permiso
 *
 * **Patrón de Query**:
 * ```
 * User → UserRole → Role → RolePermission → Permission
 * ```
 *
 * **Ejemplo de Uso Completo**:
 * ```typescript
 * // Obtener permisos del usuario
 * const perms = await getUserPermissions(userId)
 *
 * // Verificar permiso específico
 * if (await userHasPermission(userId, 'user:create')) {
 *   // Permitir crear usuario
 * }
 *
 * // Verificar múltiples permisos (AND)
 * const result = await userHasAllPermissions(userId, [
 *   'user:create', 'user:update', 'role:assign'
 * ])
 * if (!result.hasPermission) {
 *   console.log('Faltanpermisos:', result.missingPermissions)
 * }
 *
 * // Verificar si tiene AL MENOS UNO
 * if (await userHasAnyPermission(userId, [
 *   'system:admin', 'user:manage'
 * ])) {
 *   // Usuario es admin o gestor de usuarios
 * }
 * ```
 *
 * **Optimizaciones**:
 * - Usa `distinct` para evitar duplicados si usuario tiene múltiples roles
 * - Queries específicas por operación (count para booleanos, select para datos)
 * - Índices en role_permission(permissionId, roleId) y user_role(userId, roleId)
 *
 * @module admin/services/permission-queries
 * @see {@link @/modules/admin/types/permissions.ts} para tipos PermissionInfo, RoleInfo
 * @see {@link @/lib/prisma/connection.ts} para conexión Prisma
 */

import { prisma } from "@/lib/prisma/connection"
import type { PermissionInfo, RoleInfo, PermissionCheckResult } from "@/modules/admin/types"

// ============================================================================
// QUERIES DE PERMISOS
// ============================================================================

/**
 * Obtiene todos los permisos asignados a un usuario
 *
 * Navega la cadena de relaciones: User → UserRole → Role → RolePermission → Permission
 * para recopilar todos los permisos únicos asignados al usuario a través de sus roles.
 *
 * **Operación de BD**:
 * - Navega por tabla rolePermission filtrando por user.userRoles
 * - Usa `distinct` para evitar duplicados si el usuario tiene múltiples roles con el mismo permiso
 * - Selecciona solo permissionId para eficiencia
 *
 * **Caso de Uso**:
 * - Obtener lista completa de permisos para verificaciones posteriores
 * - Construir array para verificación de múltiples permisos
 * - Caché de permisos en sesión de usuario
 *
 * **Ejemplo**:
 * ```typescript
 * const userPerms = await getUserPermissions('user-123')
 * // Returns: ['user:create', 'user:read', 'role:read', 'system:config']
 *
 * // Verificar si tiene un permiso
 * if (userPerms.includes('user:create')) {
 *   // Usuario puede crear usuarios
 * }
 *
 * // Verificar múltiples
 * const hasAll = ['user:create', 'user:update'].every(p => userPerms.includes(p))
 * ```
 *
 * **Performance**:
 * - Query es rápida si hay índices en User.id, UserRole.userId, Role.id
 * - `distinct` asegura resultado limpio sin N+1 queries
 * - Resultado es un array simple, sin datos adicionales innecesarios
 *
 * **Retorna**:
 * Array de permission IDs en formato "module:action" (ej: 'user:create', 'role:list')
 *
 * @async
 * @param {string} userId - ID único del usuario (UUID)
 * @returns {Promise<string[]>} Array de permission IDs (semantic format)
 *
 * @example
 * ```typescript
 * const perms = await getUserPermissions('clq1a2b3c4d5e6f7g8h9i0j1k2')
 * console.log(perms) // ['user:create', 'user:read', 'role:read']
 * ```
 *
 * @see {@link userHasPermission} para verificar permiso específico
 * @see {@link userHasAnyPermission} para verificar AL MENOS UNO
 * @see {@link userHasAllPermissions} para verificar TODOS
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
 * Realiza una query eficiente usando `count` para verificar simplemente si existe
 * el permiso en la cadena de relaciones del usuario.
 *
 * **Query**:
 * - Busca en rolePermission donde userId tiene el rol y permissionId coincide
 * - Usa count (retorna 0 ó 1+) para máxima eficiencia
 *
 * **Caso de Uso**:
 * - Proteger acciones específicas: "si tiene permiso, permitir"
 * - Middleware de autorización
 * - Control granular de acceso
 *
 * **Ejemplo**:
 * ```typescript
 * if (await userHasPermission(userId, 'user:create')) {
 *   // Proceder con creación de usuario
 * } else {
 *   throw new UnauthorizedError('No tienes permiso para crear usuarios')
 * }
 * ```
 *
 * **vs Alternativas**:
 * - `userHasAnyPermission()`: Verifica AL MENOS UNO de varios (OR)
 * - `userHasAllPermissions()`: Verifica TODOS (AND), retorna missingPermissions
 * - `getUserPermissions()`: Obtiene array completo (para verificaciones múltiples)
 *
 * @async
 * @param {string} userId - ID del usuario
 * @param {string} permissionId - ID semántico del permiso (ej: 'user:create', 'role:delete')
 * @returns {Promise<boolean>} true si usuario tiene el permiso
 *
 * @example
 * ```typescript
 * const canEdit = await userHasPermission(userId, 'user:update')
 * const canDelete = await userHasPermission(userId, 'user:delete')
 * ```
 *
 * @see {@link getUserPermissions} para obtener array de permisos
 * @see {@link userHasAnyPermission} para verificar OR logic
 * @see {@link userHasAllPermissions} para verificar AND logic
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
 * Implementa lógica OR: retorna true si el usuario tiene cualquiera de los permisos en el array.
 * Útil para "puede hacer X O puede hacer Y" casos de uso.
 *
 * **Operación**:
 * - `count` query con `permissionId: { in: permissionIds }`
 * - Retorna true si count > 0 (tiene al menos uno)
 * - Early return false si array está vacío
 *
 * **Caso de Uso**:
 * - "Es moderador O es dueño del contenido"
 * - "Puede ver reports O es admin"
 * - Alternativas para autorizar una acción
 *
 * **Ejemplo**:
 * ```typescript
 * // Usuario puede editar si es moderador O si es dueño
 * const canEdit = await userHasAnyPermission(userId, [
 *   'content:moderate',
 *   'content:own'
 * ])
 *
 * // Usuario puede acceder si es admin O tiene permiso específico
 * const hasAccess = await userHasAnyPermission(userId, [
 *   'system:admin',
 *   'reports:view'
 * ])
 * ```
 *
 * **vs Alternativas**:
 * - `userHasPermission()`: Verifica 1 permiso exacto
 * - `userHasAllPermissions()`: Verifica TODOS (AND logic)
 * - `getUserPermissions()`: Obtiene array completo
 *
 * @async
 * @param {string} userId - ID del usuario
 * @param {string[]} permissionIds - Array de permission IDs para verificar
 * @returns {Promise<boolean>} true si usuario tiene AL MENOS UNO
 *
 * @example
 * ```typescript
 * const isAuthorized = await userHasAnyPermission(userId, [
 *   'user:manage',
 *   'user:create'
 * ])
 * ```
 *
 * @see {@link userHasPermission} para 1 permiso
 * @see {@link userHasAllPermissions} para AND logic (TODOS)
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
 * Implementa lógica AND: retorna true solo si el usuario tiene TODOS los permisos.
 * Opcionalmente retorna lista de permisos faltantes para debugging/feedback.
 *
 * **Operación**:
 * 1. Si array está vacío, retorna { hasPermission: true } (no requiere nada)
 * 2. Obtiene array completo de permisos del usuario con `getUserPermissions()`
 * 3. Calcula permisos faltantes con `filter()`
 * 4. Retorna resultado con lista de missingPermissions
 *
 * **Caso de Uso**:
 * - "Para hacer X necesitas permisos A Y B Y C"
 * - Multi-permiso protección
 * - Operaciones que requieren múltiples autorizaciones
 *
 * **Ejemplo**:
 * ```typescript
 * // Para crear y asignar rol a usuario, necesita AMBOS
 * const result = await userHasAllPermissions(userId, [
 *   'user:create',
 *   'role:assign'
 * ])
 *
 * if (!result.hasPermission) {
 *   console.error('Faltan permisos:', result.missingPermissions)
 *   // Output: ['role:assign']
 * }
 * ```
 *
 * **Patrón de Feedback**:
 * ```typescript
 * const result = await userHasAllPermissions(userId, requiredPerms)
 * if (result.hasPermission) {
 *   // Proceder
 * } else {
 *   // Mostrar al usuario cuáles permisos faltan
 *   notifyUser(`Te faltan estos permisos: ${result.missingPermissions?.join(', ')}`)
 * }
 * ```
 *
 * **vs Alternativas**:
 * - `userHasPermission()`: Verifica 1 permiso
 * - `userHasAnyPermission()`: Verifica AL MENOS UNO (OR)
 * - `getUserPermissions()`: Obtiene array completo (para verificaciones complejas)
 *
 * @async
 * @param {string} userId - ID del usuario
 * @param {string[]} permissionIds - Array de permission IDs (TODOS requeridos)
 * @returns {Promise<PermissionCheckResult>} { hasPermission, missingPermissions? }
 *
 * @example
 * ```typescript
 * const result = await userHasAllPermissions(userId, [
 *   'user:create',
 *   'user:update',
 *   'role:assign'
 * ])
 *
 * if (result.hasPermission) {
 *   // Usuario tiene TODOS los 3 permisos
 *   await createUserWithRole(...)
 * } else {
 *   // result.missingPermissions contiene los que faltan
 *   throw new AuthError(`Missing: ${result.missingPermissions?.join(', ')}`)
 * }
 * ```
 *
 * @see {@link getUserPermissions} para obtener array completo
 * @see {@link userHasPermission} para 1 permiso
 * @see {@link userHasAnyPermission} para OR logic
 * @see {@link PermissionCheckResult} para estructura del resultado
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
 * Obtiene información detallada de TODOS los permisos de un usuario
 *
 * Similar a `getUserPermissions()` pero retorna objetos completos `PermissionInfo`
 * con metadata (id, module, description) en lugar de solo IDs.
 *
 * **Retorna**: Array de PermissionInfo { id, module, description }
 *
 * **Caso de Uso**:
 * - Mostrar lista de permisos en UI (con descripciones)
 * - Generar reportes de permisos
 * - Validar cambios de permisos
 * - Descripción granular de lo que el usuario puede hacer
 *
 * **Ejemplo**:
 * ```typescript
 * const permsDetailed = await getUserPermissionsDetailed(userId)
 * // Returns:
 * // [
 * //   { id: 'user:create', module: 'user', description: 'Crear nuevos usuarios' },
 * //   { id: 'user:read', module: 'user', description: 'Ver detalles de usuarios' },
 * //   { id: 'role:read', module: 'role', description: 'Ver roles del sistema' }
 * // ]
 *
 * // Renderizar en UI
 * permsDetailed.forEach(perm => {
 *   console.log(`${perm.id}: ${perm.description}`)
 * })
 * ```
 *
 * **vs getUserPermissions()**:
 * - `getUserPermissions()`: Array simple de IDs ['user:create', 'user:read']
 * - `getUserPermissionsDetailed()`: Array de PermissionInfo con metadata
 *
 * @async
 * @param {string} userId - ID del usuario
 * @returns {Promise<PermissionInfo[]>} Array de PermissionInfo con detalles
 *
 * @see {@link getUserPermissions} para obtener solo IDs
 * @see {@link PermissionInfo} para estructura del tipo
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
 * Obtiene los roles asignados a un usuario con todos sus permisos
 *
 * Retorna array de `RoleInfo` con nombre, descripción y lista de permisos de cada rol.
 * Útil para mostrar información detallada de autoridad del usuario.
 *
 * **Estructura Retornada**:
 * ```
 * [
 *   { id: 'admin', name: 'Administrador', description: '...', permissions: ['user:create', ...] },
 *   { id: 'editor', name: 'Editor', description: '...', permissions: ['content:create', ...] }
 * ]
 * ```
 *
 * **Caso de Uso**:
 * - Mostrar roles y permisos del usuario en perfil
 * - Auditoría de autorización
 * - Validar cambios de roles
 * - Lógica de negocio basada en roles específicos
 *
 * @async
 * @param {string} userId - ID del usuario
 * @returns {Promise<RoleInfo[]>} Array de RoleInfo con permisos
 *
 * @see {@link RoleInfo} para estructura del tipo
 * @see {@link getUserPermissions} para obtener solo permisos
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
 * Obtiene TODOS los permisos definidos en el sistema
 *
 * Retorna catálogo completo de permisos ordenados por módulo e ID.
 * Útil para administración y validación del sistema de permisos.
 *
 * **Ordenamiento**: module ASC, id ASC
 *
 * **Caso de Uso**:
 * - Panel administrativo: mostrar catálogo de permisos
 * - Asignar permisos a roles
 * - Validar permisos existentes
 * - Reportes del sistema
 *
 * @async
 * @returns {Promise<PermissionInfo[]>} Array de TODOS los permisos
 *
 * @see {@link getPermissionsByModule} para filtrar por módulo
 * @see {@link PermissionInfo} para estructura del tipo
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
 * Obtiene todos los permisos de un módulo específico
 *
 * Filtra el catálogo de permisos por nombre de módulo.
 * Ordenados por ID para consistencia.
 *
 * **Caso de Uso**:
 * - Mostrar permisos de un módulo en UI administrativa
 * - Asignar permisos específicos por módulo a roles
 * - Documentación de módulos
 *
 * @async
 * @param {string} module - Nombre del módulo (ej: 'user', 'role', 'permission', 'system')
 * @returns {Promise<PermissionInfo[]>} Array de permisos del módulo
 *
 * @see {@link getAllPermissions} para obtener todos
 * @see {@link permissionExists} para verificar existencia
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
 * Verifica si un permiso existe en el sistema
 *
 * Query simple de `count` para validar existencia de permiso.
 * Usado para validación antes de asignar permisos a roles.
 *
 * **Caso de Uso**:
 * - Validar entrada de usuario antes de asignar permiso
 * - Verificar que permiso esté en catálogo
 * - Prevenir errores de datos inválidos
 *
 * @async
 * @param {string} permissionId - ID semántico del permiso (ej: 'user:create')
 * @returns {Promise<boolean>} true si el permiso existe en el catálogo
 *
 * @see {@link getAllPermissions} para listar todos
 * @see {@link getPermissionsByModule} para obtener por módulo
 */
export async function permissionExists(permissionId: string): Promise<boolean> {
  const count = await prisma.permission.count({
    where: { id: permissionId },
  })

  return count > 0
}
