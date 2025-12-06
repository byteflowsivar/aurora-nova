/**
 * Módulo de Tipos de Autenticación y Autorización - Aurora Nova
 *
 * Define todas las interfaces TypeScript para el sistema de autenticación, sesiones,
 * roles, permisos y autorización. Basado en el esquema de base de datos de Prisma.
 *
 * **Categorías de Tipos**:
 *
 * 1. **Tipos Base de BD** - Mapeos 1:1 con tablas Prisma:
 *    - User, Session, Key, Role, Permission, UserRole, RolePermission
 *    - Campos prefijados con underscore (snake_case de BD)
 *    - Tipos primitivos que reflejan exactamente BD
 *
 * 2. **DTOs (Data Transfer Objects)** - Para transferencia de datos:
 *    - CreateUserDto, LoginDto, UpdateUserDto, CreateRoleDto, AssignRoleDto
 *    - Sin IDs (generados en servidor)
 *    - Algunos campos opcionales para updates
 *
 * 3. **Tipos de Respuesta API** - Combinaciones para respuestas:
 *    - AuthResponse, UserWithRoles, RoleWithPermissions
 *    - Para simplificar datos antes de enviar al cliente
 *
 * 4. **Contexto y Guards** - Para middleware y protección:
 *    - AuthContext (contexto actual del usuario)
 *    - RouteGuard (requisitos de autenticación/permisos)
 *
 * 5. **Errores** - Manejo tipado de errores:
 *    - AuthError (clase extendida de Error)
 *    - AuthErrorCode (enum de códigos de error)
 *
 * 6. **Permisos Semánticos** - Constantes y tipos de permisos:
 *    - PERMISSIONS (constante con estructura anidada)
 *    - Types inferenciales para autocompletar
 *
 * **Patrón de Naming**:
 * - BD: snake_case (first_name, user_id, created_at)
 * - Tipos: camelCase o PascalCase (User, AuthResponse, createUserDto)
 * - Permisos: kebab-case (user:create, role:assign)
 *
 * **Type Safety**:
 * - Todos los tipos son 100% type-safe
 * - Discriminated unions para AuthContext
 * - Enums para códigos de error
 * - Types inferenciales para permisos (autocompletar)
 *
 * @module auth-types
 * @see {@link ../lib/prisma/types.ts} para tipos derivados de Prisma más complejos
 * @see {@link ../modules/shared/types/auth.ts} para tipos específicos del módulo shared
 * @see {@link ../modules/admin/types/permissions.ts} para RBAC avanzado
 */

// ============================================================================
// TIPOS BASE DE LA BASE DE DATOS
// ============================================================================
// Mapeos 1:1 con tablas de Prisma. Nunca modificar sin actualizar schema.prisma

/**
 * Usuario del sistema
 *
 * **Campos**:
 * - id: UUID único del usuario
 * - first_name: Primer nombre
 * - last_name: Apellido
 * - email: Email único para login
 * - email_verified: true si el email ha sido verificado
 * - created_at: Timestamp de creación
 * - updated_at: Timestamp de última actualización
 *
 * **Notas**:
 * - Email es único a nivel BD (UNIQUE constraint)
 * - email_verified es false hasta que se valide el email
 * - Los nombres pueden contener espacios y caracteres especiales
 *
 * @see {@link CreateUserDto} para crear usuarios
 * @see {@link UpdateUserDto} para actualizar usuarios
 */
export interface User {
  id: string; // UUID
  first_name: string;
  last_name: string;
  email: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Sesión de usuario
 *
 * Tabla de sesiones para mantener el seguimiento de logins activos.
 * Puede usarse junto con JWT para un sistema híbrido de autenticación.
 *
 * **Campos**:
 * - id: UUID único de la sesión
 * - user_id: FK a usuario propietario
 * - expires_at: Timestamp cuando la sesión expira
 *
 * **Notas**:
 * - Sesiones pueden expirar naturalmente (después de expires_at)
 * - Se pueden invalidar manualmente (logout)
 * - Útil para rastrear dispositivos activos
 * - Permite logout desde todos los dispositivos
 *
 * @see {@link User} para el usuario propietario
 */
export interface Session {
  id: string; // UUID
  user_id: string; // UUID
  expires_at: Date;
}

/**
 * Credencial de autenticación (contraseña)
 *
 * Almacena la credencial de login asociada a un usuario.
 * Usa ID semántico como "email:user@example.com" para permitir
 * múltiples métodos de auth por usuario (email, username, etc).
 *
 * **Campos**:
 * - id: Semantic key (e.g., "email:user@example.com")
 * - user_id: FK a usuario propietario
 * - hashed_password: Hash bcrypt de la contraseña (null para OAuth)
 *
 * **Notas**:
 * - hashed_password es NULL para usuarios OAuth puros
 * - El hash nunca se devuelve al cliente (siempre null en respuestas)
 * - Un usuario puede tener múltiples Keys (email, username, OAuth providers)
 * - Comparar contraseña con bcrypt.compare()
 *
 * @see {@link User} para el usuario propietario
 */
export interface Key {
  id: string; // Semantic key like "email:user@example.com"
  user_id: string; // UUID
  hashed_password: string | null; // Nullable for OAuth providers
}

/**
 * Rol del sistema RBAC
 *
 * Define un rol que puede ser asignado a múltiples usuarios.
 * Los roles contienen conjuntos de permisos relacionados.
 *
 * **Campos**:
 * - id: UUID único del rol
 * - name: Nombre único del rol (e.g., "Admin", "Editor")
 * - description: Descripción opcional del rol y sus responsabilidades
 * - created_at: Timestamp de creación
 * - updated_at: Timestamp de última modificación
 *
 * **Campos Especiales**:
 * - name: UNIQUE constraint a nivel BD
 * - description: puede ser NULL
 *
 * **Notas**:
 * - Roles predefinidos: Admin, Editor, Viewer (típicamente)
 * - No eliminar roles en uso, dejar inactivos (agregar is_active flag)
 * - Cambios en permisos de rol afectan a todos los usuarios con ese rol
 *
 * @see {@link Permission} para permisos asociados
 * @see {@link UserRole} para asignación a usuarios
 */
export interface Role {
  id: string; // UUID
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Permiso del sistema RBAC
 *
 * Define una acción específica que puede ser permitida o denegada.
 * Los permisos se agrupan en módulos (user:*, role:*, etc).
 * Se asignan a roles, no directamente a usuarios.
 *
 * **Campos**:
 * - id: Semantic ID (e.g., "user:create", "role:assign")
 * - module: Módulo del sistema (Auth, Users, Roles, Permissions, etc)
 * - description: Descripción humana del permiso
 * - created_at: Timestamp de creación
 *
 * **Formato de ID**:
 * - "module:action" (e.g., "user:create", "role:delete", "audit:read")
 * - Permite autocompletar y validación en tiempo de compilación
 * - Formato kebab-case para consistencia
 *
 * **Notas**:
 * - Los permisos se definen en PERMISSIONS constant (src/types/auth.ts)
 * - Se cargan en JWT/sesión para verificación rápida
 * - No cambiar IDs existentes (afecta permisos en BD)
 * - Agregar nuevos con cuidado (migración de permisos)
 *
 * @see {@link RolePermission} para asignación a roles
 * @see {@link PERMISSIONS} para constantes de permisos predefinidos
 */
export interface Permission {
  id: string; // Semantic like "user:create"
  module: string;
  description: string | null;
  created_at: Date;
}

/**
 * Asignación de rol a usuario
 *
 * Tabla de unión (join table) que asigna roles a usuarios.
 * Permite relación many-to-many entre User y Role.
 *
 * **Campos**:
 * - user_id: FK a usuario
 * - role_id: FK a rol
 * - created_at: Cuándo se asignó el rol
 * - created_by: Quién asignó el rol (audit trail)
 *
 * **Notas**:
 * - PK compuesta: (user_id, role_id)
 * - Un usuario puede tener múltiples roles
 * - created_by es NULL para asignaciones automáticas (setup)
 * - Usar para audit log cuando se asigna un rol
 * - Cambios aquí afectan permisos del usuario inmediatamente
 *
 * @see {@link User} usuario que recibe el rol
 * @see {@link Role} rol asignado
 */
export interface UserRole {
  user_id: string; // UUID
  role_id: string; // UUID
  created_at: Date;
  created_by: string | null; // UUID of user who assigned the role
}

/**
 * Asignación de permiso a rol
 *
 * Tabla de unión que asigna permisos a roles.
 * Permite relación many-to-many entre Role y Permission.
 *
 * **Campos**:
 * - role_id: FK a rol
 * - permission_id: FK a permiso (semantic ID)
 * - created_at: Cuándo se asignó el permiso
 *
 * **Notas**:
 * - PK compuesta: (role_id, permission_id)
 * - Un rol puede tener múltiples permisos
 * - Un permiso puede estar en múltiples roles
 * - Cambios aquí afectan a todos los usuarios con ese rol
 * - Usar para audit log cuando se asigna permiso
 *
 * @see {@link Role} rol que recibe el permiso
 * @see {@link Permission} permiso asignado
 */
export interface RolePermission {
  role_id: string; // UUID
  permission_id: string; // Semantic permission ID
  created_at: Date;
}

// ============================================================================
// DATA TRANSFER OBJECTS (DTOs)
// ============================================================================
// Para transferencia de datos en requests/responses. Sin IDs (generados en servidor).

/**
 * DTO para crear un usuario
 *
 * Datos requeridos para registrar o crear un nuevo usuario.
 * Los IDs son generados en el servidor, no se incluyen aquí.
 *
 * **Campos**:
 * - first_name: Primer nombre del usuario (1-100 caracteres)
 * - last_name: Apellido del usuario (1-100 caracteres)
 * - email: Email único (validado como email válido)
 * - password: Contraseña (min 8 chars, con complejidad requerida)
 *
 * **Validaciones**:
 * - Email debe ser único en la BD
 * - Password debe cumplir requisitos de complejidad
 * - Ambos nombres son requeridos (no puede ser null/empty)
 *
 * **Uso**:
 * - Crear usuario desde endpoint /api/admin/users POST
 * - Registro de usuario desde formulario de signup
 *
 * @see {@link User} tipo resultante después de crear
 * @see {@link registerSchema} para validación con Zod
 */
export interface CreateUserDto {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

/**
 * DTO para login
 *
 * Credenciales para autenticar un usuario.
 *
 * **Campos**:
 * - email: Email registrado del usuario
 * - password: Contraseña del usuario
 *
 * **Validaciones**:
 * - Email debe existir en la BD
 * - Contraseña debe coincidir con el hash almacenado
 * - Ambos campos son requeridos
 *
 * **Respuesta en caso de éxito**:
 * - JWT token para sesión
 * - Información del usuario
 * - Permisos cargados
 *
 * @see {@link AuthResponse} tipo de respuesta
 * @see {@link loginSchema} para validación con Zod
 */
export interface LoginDto {
  email: string;
  password: string;
}

/**
 * DTO para actualizar usuario
 *
 * Datos opcionales para actualizar perfil del usuario.
 * Todos los campos son opcionales (solo se actualizan los proporcionados).
 *
 * **Campos**:
 * - first_name?: Nuevo primer nombre
 * - last_name?: Nuevo apellido
 * - email?: Nuevo email (debe ser único)
 *
 * **Notas**:
 * - Sin cambio de contraseña (usar endpoint separate)
 * - Sin ID en el body (viene del URL param)
 * - Campos omitidos no se modifican
 * - Email nuevo debe ser único (UNIQUE constraint)
 *
 * @see {@link User} tipo resultante
 */
export interface UpdateUserDto {
  first_name?: string;
  last_name?: string;
  email?: string;
}

/**
 * DTO para crear rol
 *
 * Datos necesarios para crear un nuevo rol en el sistema.
 *
 * **Campos**:
 * - name: Nombre único del rol (1-50 caracteres)
 * - description?: Descripción opcional de las responsabilidades
 *
 * **Validaciones**:
 * - Name debe ser único (UNIQUE constraint en BD)
 * - Name 1-50 caracteres
 * - Description opcional (puede ser NULL)
 *
 * **Ejemplos**:
 * - { name: "Admin", description: "Acceso total al sistema" }
 * - { name: "Editor", description: "Puede crear y modificar contenido" }
 * - { name: "Viewer", description: "Solo lectura" }
 *
 * @see {@link Role} tipo resultante
 * @see {@link createRoleSchema} para validación con Zod
 */
export interface CreateRoleDto {
  name: string;
  description?: string;
}

/**
 * DTO para asignar rol a usuario
 *
 * Datos para establecer la relación entre usuario y rol.
 *
 * **Campos**:
 * - user_id: UUID del usuario (debe existir)
 * - role_id: UUID del rol (debe existir)
 *
 * **Notas**:
 * - Crea entrada en tabla UserRole (join table)
 * - No requiere created_by (se obtiene de JWT del request)
 * - Un usuario puede tener múltiples roles
 * - Duplicados no se crean (UNIQUE PK compuesta)
 * - Los permisos del usuario se actualizan inmediatamente
 *
 * @see {@link UserRole} tipo de relación creada
 * @see {@link assignRoleSchema} para validación con Zod
 */
export interface AssignRoleDto {
  user_id: string;
  role_id: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================
// Tipos simplificados para respuestas HTTP. Subconjunto de User completo.

/**
 * Respuesta de autenticación exitosa
 *
 * Datos retornados después de un login exitoso.
 * Combina información del usuario y sesión.
 *
 * **Campos**:
 * - user: Información del usuario autenticado
 * - session: Información de la sesión creada
 *
 * **Notas**:
 * - No incluye hash de contraseña (nunca se devuelve)
 * - El JWT token se envía por separado en headers/cookies
 * - La sesión contiene expires_at para saber cuándo expira
 *
 * @see {@link User} estructura del usuario
 * @see {@link Session} estructura de sesión
 */
export interface AuthResponse {
  user: User;
  session: Session;
}

/**
 * Usuario con sus roles asociados
 *
 * Extiende User incluyendo array de roles asignados.
 * Usado para respuestas cuando se necesitan roles del usuario.
 *
 * **Campos heredados**:
 * - id, first_name, last_name, email, email_verified, created_at, updated_at
 *
 * **Campos adicionales**:
 * - roles: Array de Role (puede estar vacío si no tiene roles)
 *
 * **Notas**:
 * - Para obtener permisos, iterar sobre roles[].permissions
 * - Los roles NO incluyen permisos por defecto (usar RoleWithPermissions)
 * - Usado en /api/admin/users/[id] GET response
 *
 * @see {@link User} campos base
 * @see {@link Role} estructura de rol
 * @see {@link RoleWithPermissions} para roles con permisos
 */
export interface UserWithRoles extends User {
  roles: Role[];
}

/**
 * Rol con sus permisos asociados
 *
 * Extiende Role incluyendo array de permisos asignados.
 * Usado para respuestas cuando se necesitan permisos del rol.
 *
 * **Campos heredados**:
 * - id, name, description, created_at, updated_at
 *
 * **Campos adicionales**:
 * - permissions: Array de Permission (puede estar vacío)
 *
 * **Notas**:
 * - Los permisos son completos (id, module, description)
 * - Usado en /api/admin/roles/[id] GET response
 * - Permite ver qué permisos tiene un rol específico
 *
 * @see {@link Role} campos base
 * @see {@link Permission} estructura de permiso
 */
export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

// ============================================================================
// AUTHENTICATION CONTEXT & GUARDS
// ============================================================================
// Para middleware y protección de rutas

/**
 * Contexto de autenticación del usuario actual
 *
 * Información y funciones disponibles sobre el usuario autenticado.
 * Se pasa típicamente a través de middleware o hooks.
 *
 * **Campos**:
 * - user: Objeto User si autenticado, null si no
 * - session: Objeto Session si autenticado, null si no
 * - permissions: Array de IDs de permiso ["user:create", "role:read"]
 * - hasPermission: Función para verificar un permiso
 * - hasRole: Función para verificar un rol
 * - isAuthenticated: Boolean, true si user !== null
 *
 * **Estados**:
 * - Autenticado: user !== null, isAuthenticated = true
 * - No autenticado: user === null, isAuthenticated = false, permissions = []
 * - En carga: puede ser undefined en algunos contextos
 *
 * **Uso típico**:
 * ```typescript
 * const ctx = getAuthContext(req)
 * if (!ctx.isAuthenticated) return unauthorizedResponse()
 * if (!ctx.hasPermission('admin:read')) return forbiddenResponse()
 * ```
 *
 * @see {@link User} estructura del usuario
 * @see {@link Session} estructura de sesión
 */
export interface AuthContext {
  user: User | null;
  session: Session | null;
  permissions: string[]; // Array of permission IDs like ["user:create", "role:read"]
  hasPermission: (permission: string) => boolean;
  hasRole: (roleName: string) => boolean;
  isAuthenticated: boolean;
}

/**
 * Requisitos de protección para una ruta
 *
 * Define qué autenticación/autorización se requiere para acceder a una ruta.
 * Se pasa típicamente a middleware de protección.
 *
 * **Campos**:
 * - requireAuth?: true para requerir estar autenticado
 * - requirePermissions?: Array de permisos requeridos (ALL must match)
 * - requireRoles?: Array de roles requeridos (ANY may match)
 *
 * **Ejemplos**:
 * ```typescript
 * { requireAuth: true } // Solo autenticados
 * { requirePermissions: ['admin:read', 'admin:write'] } // Todos estos permisos
 * { requireRoles: ['admin', 'moderator'] } // Alguno de estos roles
 * ```
 *
 * **Notas**:
 * - Todos los campos son opcionales (vacío = público)
 * - Permisos usa AND (todos requeridos)
 * - Roles usa OR (alguno es suficiente)
 * - Usar permisos cuando sea posible (más flexible que roles)
 *
 * @see {@link AuthContext} para verificar contexto actual
 */
export interface RouteGuard {
  requireAuth?: boolean;
  requirePermissions?: string[];
  requireRoles?: string[];
}

// ============================================================================
// ERROR HANDLING
// ============================================================================
// Tipos y clases para manejar errores de autenticación

/**
 * Enum de códigos de error de autenticación
 *
 * Códigos semánticos para diferentes tipos de error de auth.
 * Permite manejo específico de errores en el cliente.
 *
 * **Valores**:
 * - INVALID_CREDENTIALS: Email/password no coinciden
 * - USER_NOT_FOUND: Usuario no existe
 * - SESSION_EXPIRED: Token/sesión expiró
 * - INSUFFICIENT_PERMISSIONS: Usuario no tiene permisos requeridos
 * - EMAIL_ALREADY_EXISTS: Email ya está registrado
 * - WEAK_PASSWORD: Contraseña no cumple requisitos
 *
 * **Uso**:
 * ```typescript
 * if (error.code === AuthErrorCode.INVALID_CREDENTIALS) {
 *   // Mostrar mensaje específico
 * }
 * ```
 *
 * @see {@link AuthError} clase de error que usa estos códigos
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
}

/**
 * Error tipado de autenticación
 *
 * Clase extendida de Error con información adicional para auth.
 * Permite identificar tipo y código HTTP específico del error.
 *
 * **Propiedades**:
 * - message: Mensaje de error (heredado de Error)
 * - code: AuthErrorCode del error
 * - statusCode: Código HTTP (por defecto 401)
 * - name: Siempre 'AuthError'
 *
 * **Códigos HTTP típicos**:
 * - 401: Unauthorized (credenciales inválidas, session expired)
 * - 403: Forbidden (permisos insuficientes)
 * - 409: Conflict (email ya existe)
 * - 400: Bad Request (contraseña débil)
 *
 * **Uso**:
 * ```typescript
 * throw new AuthError(
 *   'Email ya registrado',
 *   AuthErrorCode.EMAIL_ALREADY_EXISTS,
 *   409
 * )
 * ```
 *
 * **Manejo en Express**:
 * ```typescript
 * catch (error) {
 *   if (error instanceof AuthError) {
 *     return res.status(error.statusCode).json({ code: error.code })
 *   }
 * }
 * ```
 *
 * @see {@link AuthErrorCode} para códigos disponibles
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: AuthErrorCode,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ============================================================================
// PERMISSION CONSTANTS & TYPES
// ============================================================================
// Permisos predefinidos del sistema. Cambios requieren migración de BD.

/**
 * Permisos predefinidos del sistema
 *
 * Objeto anidado con todos los permisos disponibles en el sistema.
 * Estructura: PERMISSIONS.MODULE.ACTION = 'module:action'
 *
 * **Módulos**:
 * - USER: Gestión de usuarios
 * - ROLE: Gestión de roles
 * - PERMISSION: Gestión de permisos
 *
 * **Acciones por Módulo**:
 * - CREATE: Crear nuevo recurso
 * - READ: Leer/ver detalles de recurso
 * - UPDATE: Modificar recurso existente
 * - DELETE: Eliminar recurso
 * - LIST: Listar todos los recursos
 * - ASSIGN (solo ROLE): Asignar rol a usuario
 *
 * **Formato**:
 * - Kebab-case separado por colon: "module:action"
 * - Ejemplo: 'user:create', 'role:assign', 'permission:list'
 *
 * **Uso en Código**:
 * ```typescript
 * const hasCreateUser = hasPermission(PERMISSIONS.USER.CREATE)
 * const hasListRoles = hasPermission(PERMISSIONS.ROLE.LIST)
 * ```
 *
 * **En BD**:
 * - Los permisos se almacenan con estos IDs exactos en tabla Permission
 * - Cambiar un valor aquí requiere migración de BD para actualizar referencias
 * - Los nuevos permisos requieren INSERT en tabla Permission
 *
 * **Enumeración Completa**:
 * - USER: create, read, update, delete, list (5 permisos)
 * - ROLE: create, read, update, delete, list, assign (6 permisos)
 * - PERMISSION: create, read, update, delete, list (5 permisos)
 * - **Total: 16 permisos**
 *
 * **as const Explanation**:
 * - El `as const` hace que TypeScript infiera los tipos literales exactos
 * - Permite usar types inferenciales para autocompletar
 * - Sin `as const`, los tipos serían simples strings
 *
 * @see {@link UserPermissionType} para tipo de permisos de usuario
 * @see {@link RolePermissionType} para tipo de permisos de rol
 * @see {@link PermissionPermissionType} para tipo de permisos de permission
 * @see {@link AllPermissions} para unión de todos los permisos
 *
 * @example
 * ```typescript
 * const permissionId: string = PERMISSIONS.USER.CREATE // 'user:create'
 * const canDelete: boolean = user.permissions.includes(PERMISSIONS.ROLE.DELETE)
 *
 * // En validación de routes
 * { requirePermissions: [PERMISSIONS.USER.LIST, PERMISSIONS.USER.CREATE] }
 * ```
 */
export const PERMISSIONS = {
  USER: {
    CREATE: 'user:create',
    READ: 'user:read',
    UPDATE: 'user:update',
    DELETE: 'user:delete',
    LIST: 'user:list',
  },
  ROLE: {
    CREATE: 'role:create',
    READ: 'role:read',
    UPDATE: 'role:update',
    DELETE: 'role:delete',
    LIST: 'role:list',
    ASSIGN: 'role:assign',
  },
  PERMISSION: {
    CREATE: 'permission:create',
    READ: 'permission:read',
    UPDATE: 'permission:update',
    DELETE: 'permission:delete',
    LIST: 'permission:list',
  },
} as const;

/**
 * Tipo de permisos de usuario
 *
 * Type inferencial que incluye solo permisos del módulo USER.
 * Permite autocompletar en IDE: 'user:create' | 'user:read' | ...
 *
 * **Valores posibles**:
 * - 'user:create'
 * - 'user:read'
 * - 'user:update'
 * - 'user:delete'
 * - 'user:list'
 *
 * **Uso**:
 * ```typescript
 * const perm: UserPermissionType = PERMISSIONS.USER.CREATE
 * ```
 *
 * @see {@link PERMISSIONS} constante base
 */
export type UserPermissionType = typeof PERMISSIONS.USER[keyof typeof PERMISSIONS.USER];

/**
 * Tipo de permisos de rol
 *
 * Type inferencial que incluye solo permisos del módulo ROLE.
 * Permite autocompletar en IDE: 'role:create' | 'role:read' | ...
 *
 * **Valores posibles**:
 * - 'role:create'
 * - 'role:read'
 * - 'role:update'
 * - 'role:delete'
 * - 'role:list'
 * - 'role:assign'
 *
 * @see {@link PERMISSIONS} constante base
 */
export type RolePermissionType = typeof PERMISSIONS.ROLE[keyof typeof PERMISSIONS.ROLE];

/**
 * Tipo de permisos de permiso
 *
 * Type inferencial que incluye solo permisos del módulo PERMISSION.
 * Permite autocompletar en IDE: 'permission:create' | 'permission:read' | ...
 *
 * **Valores posibles**:
 * - 'permission:create'
 * - 'permission:read'
 * - 'permission:update'
 * - 'permission:delete'
 * - 'permission:list'
 *
 * @see {@link PERMISSIONS} constante base
 */
export type PermissionPermissionType = typeof PERMISSIONS.PERMISSION[keyof typeof PERMISSIONS.PERMISSION];

/**
 * Unión de todos los permisos del sistema
 *
 * Type que incluye cualquier permiso válido en el sistema.
 * Usado para verificaciones generales de permisos.
 *
 * **Valores posibles**: Cualquier combinación de:
 * - UserPermissionType (user:*)
 * - RolePermissionType (role:*)
 * - PermissionPermissionType (permission:*)
 *
 * **Uso**:
 * ```typescript
 * const checkPermission = (perm: AllPermissions) => {
 *   // IDE proporciona autocompletar para todos los permisos
 * }
 *
 * checkPermission('user:create')
 * checkPermission('role:assign')
 * checkPermission('permission:delete')
 * ```
 *
 * **Total de valores**: 16 permisos diferentes
 *
 * @see {@link UserPermissionType}
 * @see {@link RolePermissionType}
 * @see {@link PermissionPermissionType}
 * @see {@link PERMISSIONS}
 */
export type AllPermissions = UserPermissionType | RolePermissionType | PermissionPermissionType;