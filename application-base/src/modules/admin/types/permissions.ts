/**
 * Módulo de Tipos para Sistema RBAC - Aurora Nova
 *
 * Define tipos e interfaces para el sistema de control de acceso basado en roles (RBAC).
 * Proporciona un modelo tipo-seguro para gestión de permisos, roles y verificación de acceso.
 *
 * **Características**:
 * - Constantes predefinidas para módulos y acciones estándar
 * - Interfaces para permisos, roles y opciones de verificación
 * - Tipos inferenciales para autocompletion de TypeScript
 * - Soporte para verificación de uno o múltiples permisos
 * - Patrón semantic IDs (formato "module:action")
 *
 * **Componentes Principales**:
 * 1. **PERMISSION_MODULES** - Módulos del sistema (USER, ROLE, PERMISSION, SYSTEM)
 * 2. **PERMISSION_ACTIONS** - Acciones estándar (CREATE, READ, UPDATE, DELETE, LIST, MANAGE)
 * 3. **PermissionInfo** - Información de un permiso individual
 * 4. **RoleInfo** - Información de un rol con sus permisos asignados
 * 5. **PermissionCheckResult** - Resultado de verificación de permisos
 * 6. **PermissionCheckOptions** - Opciones para personalizar verificación
 * 7. **SYSTEM_PERMISSIONS** - Constantes con permisos predefinidos del sistema
 * 8. **SystemPermission** - Tipo inferencial para autocompletion
 *
 * **Patrón de Permiso**:
 * Los permisos usan formato semantic: "module:action"
 * - Ejemplos: "user:create", "role:update", "permission:delete"
 * - Módulos: user, role, permission, system, audit
 * - Acciones: create, read, update, delete, list, manage, assign
 *
 * **Ejemplo de Uso**:
 * ```typescript
 * // Verificar permisos de usuario
 * const canCreateUsers = userPermissions.includes(SYSTEM_PERMISSIONS.USER_CREATE)
 *
 * // Definir rol
 * const adminRole: RoleInfo = {
 *   id: 'admin',
 *   name: 'Administrador',
 *   description: 'Acceso total al sistema',
 *   permissions: [
 *     SYSTEM_PERMISSIONS.USER_MANAGE,
 *     SYSTEM_PERMISSIONS.ROLE_MANAGE,
 *     SYSTEM_PERMISSIONS.PERMISSION_MANAGE,
 *   ]
 * }
 *
 * // Verificar permisos del usuario
 * const result = checkPermissions(
 *   userRole.permissions,
 *   [SYSTEM_PERMISSIONS.USER_CREATE, SYSTEM_PERMISSIONS.USER_UPDATE],
 *   { requireAll: true } // Requiere TODOS
 * )
 * if (result.hasPermission) {
 *   // Usuario tiene permisos para crear y actualizar usuarios
 * }
 * ```
 *
 * **Ventajas**:
 * - Type-safe: TypeScript previene typos en nombres de permisos
 * - Consistent: formato semantic "module:action" uniforme
 * - Flexible: soporta verificación AND (requireAll: true) y OR (requireAll: false)
 * - Scalable: fácil agregar nuevos módulos, acciones o permisos predefinidos
 * - IDE support: autocompletion en SYSTEM_PERMISSIONS y tipos inferenciales
 *
 * @module admin/types/permissions
 * @see {@link ../services/permission-queries.ts} para queries de base de datos de permisos
 * @see {@link ../../shared/types/action-response.ts} para respuestas de acciones de permisos
 */

/**
 * Módulos del sistema disponibles en Aurora Nova
 *
 * Define los módulos de negocio principales sobre los cuales se pueden asignar permisos.
 * Cada módulo agrupa un conjunto de funcionalidades relacionadas.
 *
 * **Módulos Definidos**:
 * - `USER`: Gestión de usuarios (crear, editar, eliminar, listar)
 * - `ROLE`: Gestión de roles (crear, editar, eliminar, asignar a usuarios)
 * - `PERMISSION`: Gestión de permisos (crear, editar, eliminar, asignar a roles)
 * - `SYSTEM`: Configuración del sistema y opciones administrativas
 *
 * **Valores**:
 * ```typescript
 * const PERMISSION_MODULES = {
 *   USER: 'user',
 *   ROLE: 'role',
 *   PERMISSION: 'permission',
 *   SYSTEM: 'system',
 * } as const
 *
 * // Type inference: 'user' | 'role' | 'permission' | 'system'
 * type ModuleType = typeof PERMISSION_MODULES[keyof typeof PERMISSION_MODULES]
 * ```
 *
 * **Uso**:
 * ```typescript
 * // Crear semantic ID de permiso
 * const permissionId = `${PERMISSION_MODULES.USER}:create`
 * // Result: 'user:create'
 * ```
 *
 * @constant
 * @type {Readonly<{USER: 'user'; ROLE: 'role'; PERMISSION: 'permission'; SYSTEM: 'system'}>}
 * @see {@link PERMISSION_ACTIONS} para acciones estándar
 * @see {@link SYSTEM_PERMISSIONS} para permisos predefinidos completos
 */
export const PERMISSION_MODULES = {
  USER: 'user',
  ROLE: 'role',
  PERMISSION: 'permission',
  SYSTEM: 'system',
} as const

/**
 * Acciones estándar de CRUD para permisos
 *
 * Define las operaciones comunes que se pueden realizar sobre una entidad.
 * Se combinan con PERMISSION_MODULES para formar semantic IDs.
 *
 * **Acciones Definidas**:
 * - `CREATE`: Crear nuevas entidades (permisos, roles, usuarios)
 * - `READ`: Leer/consultar entidades individuales
 * - `UPDATE`: Modificar entidades existentes
 * - `DELETE`: Eliminar entidades
 * - `LIST`: Listar/paginar colecciones de entidades
 * - `MANAGE`: Acceso administrativo completo (superset de create/read/update/delete)
 *
 * **Valores**:
 * ```typescript
 * const PERMISSION_ACTIONS = {
 *   CREATE: 'create',
 *   READ: 'read',
 *   UPDATE: 'update',
 *   DELETE: 'delete',
 *   LIST: 'list',
 *   MANAGE: 'manage',
 * } as const
 * ```
 *
 * **Uso**:
 * ```typescript
 * // Construir semantic IDs
 * const userCreate = `${PERMISSION_MODULES.USER}:${PERMISSION_ACTIONS.CREATE}`
 * // Result: 'user:create'
 *
 * const roleManage = `${PERMISSION_MODULES.ROLE}:${PERMISSION_ACTIONS.MANAGE}`
 * // Result: 'role:manage'
 * ```
 *
 * @constant
 * @type {Readonly<{CREATE: 'create'; READ: 'read'; UPDATE: 'update'; DELETE: 'delete'; LIST: 'list'; MANAGE: 'manage'}>}
 * @see {@link PERMISSION_MODULES} para módulos del sistema
 * @see {@link SYSTEM_PERMISSIONS} para permisos predefinidos
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
 * Información de un permiso en el sistema
 *
 * Representa un permiso individual registrado en la base de datos.
 * Los permisos pueden asignarse a roles, y los roles a usuarios.
 *
 * **Campos**:
 * - `id`: Semantic ID único del permiso (formato "module:action")
 * - `module`: Módulo al que pertenece (user, role, permission, system)
 * - `description`: Descripción legible del permiso para UI/documentación
 *
 * **Ejemplo**:
 * ```typescript
 * const userCreatePermission: PermissionInfo = {
 *   id: 'user:create',
 *   module: 'user',
 *   description: 'Permite crear nuevos usuarios en el sistema'
 * }
 *
 * const roleDeletePermission: PermissionInfo = {
 *   id: 'role:delete',
 *   module: 'role',
 *   description: 'Permite eliminar roles existentes'
 * }
 *
 * const systemAdminPermission: PermissionInfo = {
 *   id: 'system:admin',
 *   module: 'system',
 *   description: null // Permisos de sistema pueden no tener descripción
 * }
 * ```
 *
 * **Patrón de semantic ID**:
 * ```
 * module:action
 * user:create, user:read, user:update, user:delete, user:list, user:manage
 * role:create, role:read, role:update, role:delete, role:list, role:manage
 * permission:create, permission:read, permission:update, permission:delete, permission:list, permission:manage
 * system:admin, system:config
 * audit:view, audit:manage
 * ```
 *
 * @interface
 * @example
 * ```typescript
 * // Obtener un permiso de la BD
 * const permission = await db.permission.findUnique({
 *   where: { id: 'user:create' }
 * })
 *
 * // Verificar permiso
 * const hasPermission = permissions.some(p => p.id === 'user:create')
 * ```
 *
 * @see {@link RoleInfo} para roles que contienen permisos
 * @see {@link SYSTEM_PERMISSIONS} para constantes de permisos predefinidos
 */
export interface PermissionInfo {
  /** Identificador único semantic (formato "module:action") */
  id: string
  /** Módulo del permiso (user, role, permission, system, audit) */
  module: string
  /** Descripción legible opcional para UI/documentación */
  description: string | null
}

/**
 * Información de un rol con sus permisos asignados
 *
 * Representa un rol en el sistema que agrupa múltiples permisos.
 * Los usuarios son asignados a roles, lo que les otorga todos los permisos del rol.
 *
 * **Campos**:
 * - `id`: Identificador único del rol (ej: "admin", "editor", "viewer")
 * - `name`: Nombre legible del rol (ej: "Administrador")
 * - `description`: Descripción detallada del rol
 * - `permissions`: Array de IDs de permisos asignados al rol
 *
 * **Ejemplo**:
 * ```typescript
 * const adminRole: RoleInfo = {
 *   id: 'admin',
 *   name: 'Administrador',
 *   description: 'Acceso total al sistema para administración completa',
 *   permissions: [
 *     'user:create', 'user:read', 'user:update', 'user:delete', 'user:list',
 *     'role:create', 'role:read', 'role:update', 'role:delete', 'role:list', 'role:manage',
 *     'permission:create', 'permission:read', 'permission:update', 'permission:delete', 'permission:list', 'permission:manage',
 *     'system:admin', 'system:config',
 *     'audit:view', 'audit:manage'
 *   ]
 * }
 *
 * const editorRole: RoleInfo = {
 *   id: 'editor',
 *   name: 'Editor',
 *   description: 'Acceso para editar contenido pero sin gestión de usuarios/roles',
 *   permissions: [
 *     'user:read',
 *     'role:read',
 *     'permission:read',
 *     'content:create', 'content:read', 'content:update', 'content:delete'
 *   ]
 * }
 * ```
 *
 * **Cómo Funciona**:
 * 1. Admin define un rol (admin, editor, viewer)
 * 2. Admin asigna permisos específicos al rol
 * 3. Admin asigna usuarios al rol
 * 4. Los usuarios heredan todos los permisos del rol
 * 5. Sistema verifica permisos al ejecutar acciones
 *
 * **Verificación de Permisos de Rol**:
 * ```typescript
 * // Verificar si un rol tiene un permiso específico
 * const hasPermission = role.permissions.includes('user:create')
 *
 * // Verificar si un rol tiene múltiples permisos
 * const requiredPermissions = ['user:create', 'user:update']
 * const hasAll = requiredPermissions.every(p => role.permissions.includes(p))
 * const hasAny = requiredPermissions.some(p => role.permissions.includes(p))
 * ```
 *
 * @interface
 * @example
 * ```typescript
 * // Obtener rol de un usuario
 * const userWithRole = await db.user.findUnique({
 *   where: { id: userId },
 *   include: { roles: true }
 * })
 *
 * // Verificar permisos del usuario
 * const userPermissions = userWithRole.roles
 *   .flatMap(role => role.permissions)
 * if (userPermissions.includes('user:create')) {
 *   // Usuario puede crear usuarios
 * }
 * ```
 *
 * @see {@link PermissionInfo} para estructura de permisos
 * @see {@link PermissionCheckOptions} para opciones de verificación
 */
export interface RoleInfo {
  /** Identificador único del rol */
  id: string
  /** Nombre legible del rol */
  name: string
  /** Descripción detallada de responsabilidades */
  description: string | null
  /** Array de IDs de permisos asignados al rol */
  permissions: string[]
}

/**
 * Resultado de una verificación de permisos
 *
 * Respuesta que proporciona el resultado de verificar si un usuario tiene los permisos requeridos.
 * Incluye un booleano de resultado y opcionalmente lista de permisos faltantes.
 *
 * **Campos**:
 * - `hasPermission`: true si el usuario tiene acceso, false si no
 * - `missingPermissions`: Array de permisos faltantes (solo si hasPermission es false)
 *
 * **Ejemplo**:
 * ```typescript
 * // Acceso concedido
 * const result1: PermissionCheckResult = {
 *   hasPermission: true
 * }
 *
 * // Acceso denegado con permisos faltantes
 * const result2: PermissionCheckResult = {
 *   hasPermission: false,
 *   missingPermissions: ['user:create', 'user:update']
 * }
 *
 * // Acceso denegado sin detalles
 * const result3: PermissionCheckResult = {
 *   hasPermission: false
 * }
 * ```
 *
 * **Patrón de Uso**:
 * ```typescript
 * const result = checkPermissions(userPermissions, ['user:create', 'user:update'])
 *
 * if (result.hasPermission) {
 *   // Realizar acción protegida
 * } else {
 *   // Mostrar error
 *   if (result.missingPermissions) {
 *     console.error(`Permisos faltantes: ${result.missingPermissions.join(', ')}`)
 *   }
 * }
 * ```
 *
 * @interface
 * @see {@link PermissionCheckOptions} para opciones de verificación
 * @see {@link RoleInfo} para información de roles
 */
export interface PermissionCheckResult {
  /** true si el usuario tiene todos (o al menos uno) de los permisos requeridos */
  hasPermission: boolean
  /** Array de permisos que faltan (solo cuando hasPermission es false) */
  missingPermissions?: string[]
}

/**
 * Opciones para personalizar la verificación de permisos
 *
 * Permite controlar cómo se verifica si un usuario tiene ciertos permisos.
 * Soporta lógica AND (requiere TODOS) y lógica OR (requiere AL MENOS UNO).
 *
 * **Opciones Disponibles**:
 * - `requireAll`: true = verificación AND (defecto), false = verificación OR
 *
 * **Ejemplos**:
 * ```typescript
 * // Opción 1: Requiere TODOS los permisos (AND)
 * checkPermissions(userPerms, ['user:create', 'user:update'], { requireAll: true })
 * // Devuelve true solo si el usuario tiene AMBOS permisos
 *
 * // Opción 2: Requiere AL MENOS UNO (OR)
 * checkPermissions(userPerms, ['admin', 'moderator'], { requireAll: false })
 * // Devuelve true si el usuario tiene CUALQUIERA de los dos permisos
 *
 * // Opción 3: Usar default (true = AND)
 * checkPermissions(userPerms, ['user:create', 'user:update'])
 * // Equivalente a { requireAll: true }
 * ```
 *
 * **Caso de Uso - requireAll: true (AND)**:
 * Para acciones que requieren múltiples permisos:
 * ```typescript
 * // Para transferir un archivo, requiere AMBOS:
 * // - Permiso de lectura del archivo (user:read)
 * // - Permiso de acceso administrativo (system:admin)
 * checkPermissions(userPerms, ['user:read', 'system:admin'], { requireAll: true })
 * ```
 *
 * **Caso de Uso - requireAll: false (OR)**:
 * Para acciones que pueden ser autorizadas de múltiples formas:
 * ```typescript
 * // Puede editar si es moderador O si es dueño del contenido
 * checkPermissions(userPerms, ['moderator', 'content:owner'], { requireAll: false })
 * ```
 *
 * @interface
 * @example
 * ```typescript
 * interface PermissionCheckOptions {
 *   requireAll?: boolean
 * }
 * ```
 *
 * @see {@link PermissionCheckResult} para el resultado de la verificación
 * @see {@link RoleInfo} para información de roles
 */
export interface PermissionCheckOptions {
  /**
   * Controla si se require ALL los permisos (AND) o AL MENOS UNO (OR)
   *
   * - `true`: El usuario DEBE tener TODOS los permisos especificados (AND logic)
   *   - Ejemplo: user tiene ['user:create', 'user:update']
   *   - Requeridos: ['user:create', 'user:update']
   *   - Resultado: true (tiene ambos)
   *
   * - `false`: El usuario DEBE tener AL MENOS UNO de los permisos especificados (OR logic)
   *   - Ejemplo: user tiene ['user:create']
   *   - Requeridos: ['user:create', 'user:delete']
   *   - Resultado: true (tiene al menos uno)
   *
   * @default true
   * @type {boolean | undefined}
   */
  requireAll?: boolean
}

/**
 * Permisos predefinidos del sistema en Aurora Nova
 *
 * Constante con todos los permisos semantic predefinidos en el sistema.
 * Proporciona type-safe autocompletion para verificaciones de permisos.
 *
 * **Categorías de Permisos**:
 *
 * **User Permissions** (Gestión de usuarios):
 * - `USER_CREATE`: Crear nuevos usuarios
 * - `USER_READ`: Ver detalles de un usuario
 * - `USER_UPDATE`: Editar usuario existente
 * - `USER_DELETE`: Eliminar usuarios
 * - `USER_LIST`: Listar/paginar usuarios
 * - `USER_MANAGE`: Acceso administrativo completo de usuarios
 * - `USER_ASSIGN_ROLES`: Asignar roles a usuarios
 *
 * **Role Permissions** (Gestión de roles):
 * - `ROLE_CREATE`: Crear nuevos roles
 * - `ROLE_READ`: Ver detalles de un rol
 * - `ROLE_UPDATE`: Editar rol existente
 * - `ROLE_DELETE`: Eliminar roles
 * - `ROLE_LIST`: Listar/paginar roles
 * - `ROLE_MANAGE`: Acceso administrativo completo de roles
 * - `ROLE_ASSIGN`: Asignar roles a usuarios
 * - `ROLE_ASSIGN_PERMISSIONS`: Asignar permisos a roles
 *
 * **Permission Permissions** (Gestión de permisos):
 * - `PERMISSION_CREATE`: Crear nuevos permisos
 * - `PERMISSION_READ`: Ver detalles de un permiso
 * - `PERMISSION_UPDATE`: Editar permiso existente
 * - `PERMISSION_DELETE`: Eliminar permisos
 * - `PERMISSION_LIST`: Listar/paginar permisos
 * - `PERMISSION_MANAGE`: Acceso administrativo completo de permisos
 *
 * **System Permissions** (Configuración del sistema):
 * - `SYSTEM_ADMIN`: Acceso administrativo total del sistema
 * - `SYSTEM_CONFIG`: Acceso a configuración global
 *
 * **Audit Permissions** (Auditoría):
 * - `AUDIT_VIEW`: Ver registros de auditoría
 * - `AUDIT_MANAGE`: Gestionar auditoría (limpieza, exportación, etc)
 *
 * **Estructura y Type Inference**:
 * ```typescript
 * const SYSTEM_PERMISSIONS = {
 *   USER_CREATE: 'user:create',
 *   USER_READ: 'user:read',
 *   // ... más permisos
 * } as const
 *
 * // Type inferred: 'user:create' | 'user:read' | ... | 'audit:manage'
 * type SystemPermission = typeof SYSTEM_PERMISSIONS[keyof typeof SYSTEM_PERMISSIONS]
 * ```
 *
 * **Ejemplo de Uso**:
 * ```typescript
 * // Autocompletion en editor
 * const userCreatePerm = SYSTEM_PERMISSIONS.USER_CREATE // 'user:create'
 *
 * // Verificar permiso con type-safety
 * if (userPermissions.includes(SYSTEM_PERMISSIONS.ROLE_MANAGE)) {
 *   // Usuario puede gestionar roles
 * }
 *
 * // Asignar permisos a rol
 * const editorPermissions = [
 *   SYSTEM_PERMISSIONS.USER_READ,
 *   SYSTEM_PERMISSIONS.ROLE_READ,
 *   SYSTEM_PERMISSIONS.PERMISSION_READ,
 * ]
 * ```
 *
 * @constant
 * @type {Readonly<{...permisos semantic...}>}
 * @see {@link SystemPermission} tipo inferencial
 * @see {@link PERMISSION_MODULES} módulos disponibles
 * @see {@link PERMISSION_ACTIONS} acciones estándar
 */
export const SYSTEM_PERMISSIONS = {
  // User permissions
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_LIST: 'user:list',
  USER_MANAGE: 'user:manage',
  USER_ASSIGN_ROLES: 'user:assign-roles',

  // Role permissions
  ROLE_CREATE: 'role:create',
  ROLE_READ: 'role:read',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',
  ROLE_LIST: 'role:list',
  ROLE_MANAGE: 'role:manage',
  ROLE_ASSIGN: 'role:assign',
  ROLE_ASSIGN_PERMISSIONS: 'role:assign-permissions',

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

  // Audit permissions
  AUDIT_VIEW: 'audit:view',
  AUDIT_MANAGE: 'audit:manage',
} as const

/**
 * Tipo inferencial de los permisos predefinidos del sistema
 *
 * Union type de todos los permisos disponibles en SYSTEM_PERMISSIONS.
 * Proporciona type-safe access y autocompletion.
 *
 * **Valor Inferred**:
 * ```typescript
 * type SystemPermission =
 *   | 'user:create'
 *   | 'user:read'
 *   | 'user:update'
 *   | 'user:delete'
 *   | 'user:list'
 *   | 'user:manage'
 *   | 'user:assign-roles'
 *   | 'role:create'
 *   | 'role:read'
 *   | 'role:update'
 *   | 'role:delete'
 *   | 'role:list'
 *   | 'role:manage'
 *   | 'role:assign'
 *   | 'role:assign-permissions'
 *   | 'permission:create'
 *   | 'permission:read'
 *   | 'permission:update'
 *   | 'permission:delete'
 *   | 'permission:list'
 *   | 'permission:manage'
 *   | 'system:admin'
 *   | 'system:config'
 *   | 'audit:view'
 *   | 'audit:manage'
 * ```
 *
 * **Ejemplo de Uso**:
 * ```typescript
 * // Function signature con type-safe permissions
 * function hasPermission(perms: string[], required: SystemPermission): boolean {
 *   return perms.includes(required)
 * }
 *
 * // Con autocompletion
 * hasPermission(userPerms, SYSTEM_PERMISSIONS.USER_CREATE) // ✓ OK
 * hasPermission(userPerms, 'user:invalid') // ✗ Error - no es SystemPermission
 *
 * // Array type-safe
 * const requiredPerms: SystemPermission[] = [
 *   SYSTEM_PERMISSIONS.USER_CREATE,
 *   SYSTEM_PERMISSIONS.ROLE_MANAGE,
 * ]
 * ```
 *
 * @typedef {typeof SYSTEM_PERMISSIONS[keyof typeof SYSTEM_PERMISSIONS]} SystemPermission
 * @see {@link SYSTEM_PERMISSIONS} para constantes
 */
export type SystemPermission = typeof SYSTEM_PERMISSIONS[keyof typeof SYSTEM_PERMISSIONS]
