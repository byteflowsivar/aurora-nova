/**
 * Tipos para Autenticación y Autorización - Aurora Nova
 *
 * Define interfaces para el flujo de autenticación, RBAC (Role-Based Access Control),
 * y operaciones relacionadas.
 *
 * **Separación de Tipos**:
 * - **Este archivo** (shared/types/auth.ts): DTOs, RBAC, respuestas API
 * - **src/types/next-auth.d.ts**: Module augmentation para NextAuth
 * - **src/types/auth.ts**: Tipos globales extendidos (User, Role, Permission)
 *
 * **Diferencia entre los 3**:
 * ```typescript
 * // 1. Global (src/types/auth.ts)
 * export interface User {
 *   id: string
 *   email: string
 *   roles: UserRole[]
 * }
 *
 * // 2. NextAuth Augmentation (src/types/next-auth.d.ts)
 * declare module "next-auth" {
 *   interface Session extends DefaultSession {
 *     user: { ... } & DefaultSession["user"]
 *   }
 * }
 *
 * // 3. Shared DTOs (este archivo)
 * export interface LoginCredentials {
 *   email: string
 *   password: string
 * }
 * ```
 *
 * **Temas Cubiertos**:
 * 1. **Autenticación**: LoginCredentials, RegisterData, ResetPasswordData
 * 2. **RBAC**: UserRole, Permission, RoleWithPermissions, UserWithRolesAndPermissions
 * 3. **Respuestas API**: AuthResponse, PermissionCheckResponse, RoleAssignmentResponse
 * 4. **Middleware**: AuthMiddlewareConfig, AuthContext
 * 5. **Validación**: PasswordValidationRules, ValidationResult
 * 6. **Eventos**: AuthEvent, AuthEventPayload
 * 7. **Configuración**: AuthConfig, PasswordValidationRules
 *
 * @module shared/types/auth
 * @see {@link ../../../types/auth.ts} para tipos globales (User, Role, Permission)
 * @see {@link ../../../types/next-auth.d.ts} para module augmentation de NextAuth
 * @see {@link ../api} para funciones que usan estos tipos (queries, mutations)
 * @see {@link ../validations/auth.ts} para schemas Zod de validación
 */

// ============================================================================
// TIPOS DE AUTENTICACIÓN Y RBAC
// ============================================================================
// Los tipos extendidos de Auth.js/NextAuth están en ../../types/next-auth.d.ts para evitar conflictos
// Los tipos globales de User, Role, Permission están en ../../types/auth.ts

// ============================================================================
// TIPOS DE AUTENTICACIÓN - CREDENCIALES Y VALIDACIÓN
// ============================================================================

/**
 * Credenciales para Login de Usuario
 *
 * Parámetros requeridos para autenticar un usuario con email y contraseña.
 * Se valida con Zod schema en src/modules/shared/validations/auth.ts
 *
 * **Flujo de Login**:
 * ```
 * Cliente forma → credenciales
 *   ↓ POST /api/auth/signin (NextAuth)
 * NextAuth validates credentials contra BD
 *   ↓ si válido: genera JWT
 * JWT + sesión table creada
 *   ↓
 * Cliente recibe cookie JWT
 * ```
 *
 * **Validación**:
 * - `email`: Debe ser email válido, existir en BD
 * - `password`: Mínimo 8 caracteres, debe coincidir con hash en BD
 * - La contraseña se compara con bcrypt (nunca se retorna)
 *
 * **Seguridad**:
 * - Las contraseñas se hashean con bcrypt (salt rounds=10)
 * - Nunca enviar contraseña en respuesta
 * - Rate limiting en endpoint (preventivo contra brute force)
 * - Mensajes genéricos: "Email o contraseña incorrectos" (no revelar cuál)
 *
 * @interface LoginCredentials
 * @example
 * ```typescript
 * const credentials: LoginCredentials = {
 *   email: 'user@example.com',
 *   password: 'securePassword123'
 * }
 * // POST /api/auth/signin (NextAuth)
 * const response = await signIn('credentials', credentials)
 * ```
 *
 * @see {@link RegisterData} para registro de nuevo usuario
 * @see {@link ResetPasswordData} para recuperación de contraseña
 * @see {@link ../validations/auth.ts} para Zod schema de validación
 */
export interface LoginCredentials {
  /**
   * Email del usuario
   *
   * Debe ser email válido y existir en BD.
   * Es case-insensitive (normalizado a minúsculas en BD).
   *
   * **Validación**:
   * - Formato: RFC 5322 (email válido)
   * - Longitud: máximo 255 caracteres
   * - Existencia: debe existir en tabla users
   * - Case: normalizado a minúscula
   *
   * **Ejemplos Válidos**:
   * - user@example.com
   * - first.last@example.co.uk
   * - test+tag@example.com
   *
   * @type {string}
   * @required
   * @example 'user@example.com'
   */
  email: string

  /**
   * Contraseña del usuario
   *
   * Se valida contra el hash guardado en BD usando bcrypt.
   * La contraseña se compara, nunca se retorna.
   *
   * **Validación**:
   * - Longitud: mínimo 8 caracteres
   * - Sin límite máximo (se hashea)
   * - Puede contener cualquier carácter UTF-8
   *
   * **Seguridad**:
   * - Nunca guardar en texto plano
   * - Siempre transmitir sobre HTTPS
   * - Never log o exponer en errores
   * - Comparación con bcrypt (time-safe)
   *
   * **Nota**: Si contraseña es incorrecta, retornar mensaje genérico
   * "Email o contraseña incorrectos" (no revelar cuál campo es incorrecto).
   *
   * @type {string}
   * @required
   * @minLength 8
   * @example 'securePassword123'
   * @see {@link PasswordValidationRules} para reglas de validación de contraseña
   */
  password: string
}

/**
 * Datos para Registro de Nuevo Usuario
 *
 * Parámetros necesarios para crear una nueva cuenta de usuario.
 * Se valida con Zod schema incluidos confirmPassword y password strength.
 *
 * **Flujo de Registro**:
 * ```
 * Usuario rellena forma → RegisterData
 *   ↓ Validar: emails únicos, contraseña fuerte, confirmPassword coincide
 * Crear usuario en BD (email, firstName, lastName)
 *   ↓ Hash contraseña con bcrypt
 * Guardar usuario con password hash
 *   ↓ Opcionalmente: enviar email de verificación
 * Redirect a login o auto-login
 * ```
 *
 * **Validación**:
 * - `email`: Único, formato válido, no existe en BD
 * - `firstName`/`lastName`: No vacío, máximo 100 caracteres
 * - `password`: Mínimo 8, mayúscula, minúscula, número, carácter especial (configurable)
 * - `confirmPassword`: Debe coincidir exactamente con `password`
 *
 * **Seguridad**:
 * - Validar unicidad de email en BD ANTES de guardar (índice único)
 * - Usar bcrypt con salt rounds=10 para hashar contraseña
 * - Aplicar rate limiting (máximo N registros por IP en tiempo)
 * - Enviar email de verificación (si required en config)
 *
 * @interface RegisterData
 * @example
 * ```typescript
 * const data: RegisterData = {
 *   email: 'newuser@example.com',
 *   firstName: 'Juan',
 *   lastName: 'Pérez',
 *   password: 'SecurePass123!',
 *   confirmPassword: 'SecurePass123!'
 * }
 * // POST /api/auth/register (Server Action)
 * const response = await registerUser(data)
 * ```
 *
 * @see {@link LoginCredentials} para login después del registro
 * @see {@link PasswordValidationRules} para reglas de validación de contraseña
 * @see {@link ../validations/auth.ts} para Zod schema
 */
export interface RegisterData {
  /**
   * Email del nuevo usuario
   *
   * Debe ser único en BD y formato válido.
   *
   * **Validación**:
   * - Formato: RFC 5322 (email válido)
   * - Unicidad: no debe existir en tabla users
   * - Longitud: máximo 255 caracteres
   *
   * @type {string}
   * @required
   * @example 'newuser@example.com'
   */
  email: string

  /**
   * Primer nombre del usuario
   *
   * @type {string}
   * @required
   * @minLength 1
   * @maxLength 100
   * @example 'Juan'
   */
  firstName: string

  /**
   * Apellido del usuario
   *
   * @type {string}
   * @required
   * @minLength 1
   * @maxLength 100
   * @example 'Pérez'
   */
  lastName: string

  /**
   * Contraseña del nuevo usuario
   *
   * Se valida según PasswordValidationRules.
   * Default: mín 8 chars, mayúscula, minúscula, número, especial.
   *
   * @type {string}
   * @required
   * @minLength 8
   * @example 'SecurePass123!'
   * @see {@link PasswordValidationRules} para reglas exactas
   */
  password: string

  /**
   * Confirmación de contraseña
   *
   * Debe coincidir exactamente con `password`.
   * Se valida en Zod con `.refine()`.
   *
   * **Validación**:
   * - Formato: exactamente igual a `password`
   * - Caso sensible: "Pass" ≠ "pass"
   * - Si no coincide: mensaje de error "Las contraseñas no coinciden"
   *
   * @type {string}
   * @required
   * @example 'SecurePass123!'
   */
  confirmPassword: string
}

/**
 * Datos para Cambio de Contraseña de Usuario Autenticado
 *
 * Parámetros para que usuario autenticado cambie su contraseña.
 * Se usa en endpoint `/api/auth/change-password` (autenticado).
 *
 * **Flujo**:
 * ```
 * Usuario autenticado en dashboard
 *   ↓ Forma de cambio de contraseña
 * currentPassword validado contra hash en BD
 *   ↓ si válido: contraseña actual confirmada
 * newPassword validado (rules, ≠ currentPassword)
 *   ↓ Hash con bcrypt y guardar
 * Sessionvalida (no logout automático)
 * ```
 *
 * **Validación**:
 * - `currentPassword`: Debe coincidir con hash en BD (autenticado)
 * - `newPassword`: Debe cumplir PasswordValidationRules, diferente a actual
 * - `confirmPassword`: Debe coincidir con newPassword
 *
 * **Seguridad**:
 * - Requiere autenticación (usuario debe estar logueado)
 * - Verificar currentPassword para confirmar identidad
 * - La sesión sigue válida después (no logout automático)
 * - Registrar evento en auditoría (PASSWORD_CHANGED)
 * - Opcionalmente: enviar email notificando cambio
 *
 * @interface ChangePasswordData
 * @example
 * ```typescript
 * const data: ChangePasswordData = {
 *   currentPassword: 'OldPass123!',
 *   newPassword: 'NewPass456!',
 *   confirmPassword: 'NewPass456!'
 * }
 * // POST /api/auth/change-password (autenticado)
 * const response = await changePassword(data)
 * ```
 *
 * @see {@link ResetPasswordData} para recuperación si olvida contraseña
 * @see {@link PasswordValidationRules} para reglas de validación
 */
export interface ChangePasswordData {
  /**
   * Contraseña actual del usuario
   *
   * Se valida contra el hash en BD para confirmar identidad.
   *
   * **Validación**:
   * - Comparación: bcrypt compare con hash en BD
   * - Si es incorrecta: retornar error "Contraseña actual incorrecta"
   * - Case sensitive
   *
   * @type {string}
   * @required
   * @example 'OldPass123!'
   */
  currentPassword: string

  /**
   * Nueva contraseña del usuario
   *
   * Debe cumplir PasswordValidationRules y ser diferente a currentPassword.
   *
   * **Validación**:
   * - Rules: mín 8, mayúscula, minúscula, número, especial
   * - Diferencia: no puede ser igual a currentPassword
   * - Si igual: error "La nueva contraseña debe ser diferente"
   *
   * @type {string}
   * @required
   * @minLength 8
   * @example 'NewPass456!'
   * @see {@link PasswordValidationRules} para reglas exactas
   */
  newPassword: string

  /**
   * Confirmación de nueva contraseña
   *
   * Debe coincidir exactamente con `newPassword`.
   *
   * @type {string}
   * @required
   * @example 'NewPass456!'
   */
  confirmPassword: string
}

/**
 * Datos para Recuperación de Contraseña Olvidada
 *
 * Email del usuario que olvidó su contraseña.
 * Sistema envía link de reset (token de corta duración).
 *
 * **Flujo**:
 * ```
 * Usuario en página /forgot-password
 *   ↓ Ingresa email
 * Sistema valida email existe en BD
 *   ↓ si existe: generar token con expiry
 * Guardar token en tabla password_reset_tokens
 *   ↓ Enviar email con link: /reset-password?token=...
 * Usuario hace click en link (token + nueva contraseña)
 *   ↓ Token validado (existe, no expirado, no usado)
 * Contraseña actualizada en BD
 * ```
 *
 * **Seguridad**:
 * - Si email NO existe en BD: retornar mensaje genérico
 *   "Si el email existe, se envió un link de reset" (no revelar usuarios)
 * - Token debe tener expiry corto (15-60 minutos)
 * - Token debe ser único (UUID v4 o similar)
 * - Después de usar: marcar token como usado (o eliminar)
 * - Rate limiting: máximo N resets por IP/hora
 *
 * @interface ResetPasswordData
 * @example
 * ```typescript
 * const data: ResetPasswordData = {
 *   email: 'user@example.com'
 * }
 * // POST /api/auth/forgot-password
 * const response = await requestPasswordReset(data)
 * ```
 *
 * @see {@link SetPasswordData} para resetear con token
 * @see {@link ChangePasswordData} para cambio con usuario autenticado
 */
export interface ResetPasswordData {
  /**
   * Email del usuario que olvidó su contraseña
   *
   * **Validación**:
   * - Formato: RFC 5322
   * - Existencia: no importa para respuesta (por seguridad)
   * - Si existe: enviar email con link reset
   * - Si no existe: no revelar (mismo mensaje genérico)
   *
   * @type {string}
   * @required
   * @example 'user@example.com'
   */
  email: string
}

/**
 * Datos para Establecer Nueva Contraseña (con Token Reset)
 *
 * Token de reset + nueva contraseña.
 * Se usa en página `/reset-password?token=...` después de click en email.
 *
 * **Flujo**:
 * ```
 * Usuario recibe email con link: /reset-password?token=xyz
 *   ↓ Abre página, ingresa nueva contraseña
 * Sistema valida token:
 *   - Token existe en password_reset_tokens
 *   - No expirado (expires > now)
 *   - No usado (used_at = null o similar)
 *   ↓ si válido: actualizar usuario password hash
 * Marcar token como usado (update used_at = now)
 *   ↓ Redirect a login
 * Usuario puede login con nueva contraseña
 * ```
 *
 * **Seguridad**:
 * - Token corta duración (15-60 minutos)
 * - Token único (UUID v4)
 * - Validar antes de actualizar
 * - Marcar como usado DESPUÉS de actualizar (no antes)
 * - Si token inválido/expirado: error genérico sin detalles
 * - Registrar evento PASSWORD_RESET en auditoría
 *
 * @interface SetPasswordData
 * @example
 * ```typescript
 * const data: SetPasswordData = {
 *   token: 'abc123def456...',
 *   password: 'NewPass789!',
 *   confirmPassword: 'NewPass789!'
 * }
 * // POST /api/auth/reset-password
 * const response = await resetPassword(data)
 * ```
 *
 * @see {@link ResetPasswordData} para solicitar reset
 * @see {@link ChangePasswordData} para cambio sin token
 */
export interface SetPasswordData {
  /**
   * Token de reset de contraseña
   *
   * Token único generado en solicitud de reset.
   * Válido solo por tiempo limitado (15-60 minutos).
   *
   * **Origen**:
   * - Generado: `crypto.randomUUID()` o similar en endpoint forgot-password
   * - Guardado: en tabla password_reset_tokens
   * - Transmitido: en URL como query parameter `?token=...`
   *
   * **Validación**:
   * - Existe en password_reset_tokens
   * - No expirado: expires > now
   * - No usado: used_at = null (o ausente)
   * - Si invalido: error "Link de reset inválido o expirado"
   *
   * @type {string}
   * @required
   * @example 'abc123def456ghi789jkl012mno345pqr'
   */
  token: string

  /**
   * Nueva contraseña
   *
   * Debe cumplir PasswordValidationRules.
   *
   * **Validación**:
   * - Reglas: mín 8, mayúscula, minúscula, número, especial
   * - No validar contra contraseña anterior (puede ser misma)
   *
   * @type {string}
   * @required
   * @minLength 8
   * @example 'NewPass789!'
   * @see {@link PasswordValidationRules} para reglas exactas
   */
  password: string

  /**
   * Confirmación de nueva contraseña
   *
   * Debe coincidir exactamente con `password`.
   *
   * @type {string}
   * @required
   * @example 'NewPass789!'
   */
  confirmPassword: string
}

// ============================================================================
// TIPOS DE RBAC (ROLE-BASED ACCESS CONTROL)
// ============================================================================
// Definiciones de Role, Permission, y composiciones para acceso y autorización

/**
 * Rol de Usuario Simplificado
 *
 * Representación mínima de un rol asignado a un usuario.
 * Versión simplificada de Role (del tipo global en src/types/auth.ts).
 *
 * **Diferencia entre tipos**:
 * - `UserRole` (este): campos mínimos cuando se asocia a usuario
 * - `Role` (global): versión completa con timestamps, permisos detallados
 * - `RoleWithPermissions`: extensión de UserRole con array de Permission
 *
 * **Uso**:
 * - En sesión de usuario: `session.user.roles: UserRole[]`
 * - En responses API: `{ user: { ..., roles: UserRole[] } }`
 * - Para filtrado en UI: verificar roles disponibles del usuario
 *
 * **Ciclo de Vida**:
 * 1. Rol creado por admin: Role completo en tabla roles
 * 2. Rol asignado a usuario: se agrega a tabla user_roles (FK)
 * 3. Usuario loguea: se carga UserRole en sesión
 * 4. En cliente: se usa para verificar acceso (hasRole('admin'))
 *
 * @interface UserRole
 * @example
 * ```typescript
 * const roles: UserRole[] = [
 *   { id: '123', name: 'admin', description: 'Administrador del sistema' },
 *   { id: '456', name: 'user', description: null }
 * ]
 * ```
 *
 * @see {@link RoleWithPermissions} para versión con permisos incluidos
 * @see {@link ../../../types/auth.ts} para tipo global Role (más completo)
 */
export interface UserRole {
  /**
   * ID único del rol (UUID)
   *
   * Identificador en tabla roles.
   *
   * @type {string}
   * @required
   * @example '550e8400-e29b-41d4-a716-446655440000'
   */
  id: string

  /**
   * Nombre del rol
   *
   * Identificador único del rol (ej: 'admin', 'editor', 'viewer').
   * Se usa para comparación en código y mensajes de error.
   *
   * **Convención**:
   * - Minúsculas
   * - Sin espacios (kebab-case si es compuesto)
   * - Ej: 'admin', 'content-editor', 'read-only'
   *
   * @type {string}
   * @required
   * @example 'admin' or 'content-editor'
   */
  name: string

  /**
   * Descripción del rol (optional)
   *
   * Texto descriptivo para UI/admin, explicando qué hace este rol.
   *
   * @type {string | null}
   * @optional
   * @example 'Administrador con acceso completo al sistema'
   */
  description: string | null
}

/**
 * Permiso Simplificado
 *
 * Representación mínima de un permiso.
 * Versión simple del tipo Permission global (ver src/types/auth.ts).
 *
 * **Semántica de IDs**:
 * - Formato: `module:action` (ej: 'user:create', 'role:delete')
 * - Module: área de la aplicación (user, role, permission, audit)
 * - Action: qué se puede hacer (create, read, update, delete, list, manage)
 *
 * **Ciclo de Vida**:
 * 1. Permission creado por admin: se guarda en tabla permissions
 * 2. Permission asignado a rol: se agrega a tabla role_permissions
 * 3. Usuario asignado a rol: hereda todos los permissions del rol
 * 4. En JWT: se incluyen IDs de permisos (para validación rápida sin BD)
 * 5. En cliente/servidor: se valida con hasPermission('user:create')
   *
   * @interface Permission
   * @example
   * ```typescript
   * const permissions: Permission[] = [
   *   { id: 'user:create', module: 'user', description: 'Crear usuarios' },
   *   { id: 'user:read', module: 'user', description: 'Ver usuarios' },
   *   { id: 'role:manage', module: 'role', description: 'Gestionar roles' }
   * ]
   * ```
   *
   * @see {@link RoleWithPermissions} para rol con permisos incluidos
   * @see {@link ../../../types/auth.ts} para tipos globales con constantes PERMISSIONS
   */
export interface Permission {
  /**
   * ID único del permiso (semantic ID)
   *
   * Formato: `module:action` (ej: 'user:create', 'role:delete').
   * Se usa como clave de búsqueda y validación.
   *
   * **Módulos Típicos**:
   * - 'user': gestión de usuarios
   * - 'role': gestión de roles
   * - 'permission': gestión de permisos
   * - 'audit': auditoría y logs
   *
   * **Acciones Típicas**:
   * - 'create': crear nuevo recurso
   * - 'read'/'view': leer/ver recurso
   * - 'update': modificar recurso
   * - 'delete': eliminar recurso
   * - 'list': listar recursos
   * - 'manage': acceso completo
   *
   * @type {string}
   * @required
   * @example 'user:create' or 'role:delete'
   */
  id: string

  /**
   * Módulo o área de la aplicación
   *
   * Categoría del permiso para agrupar en UI.
   *
   * @type {string}
   * @required
   * @example 'user' or 'role'
   */
  module: string

  /**
   * Descripción del permiso
   *
   * Texto legible describiendo qué se puede hacer.
   * Se muestra en UI de gestión de permisos.
   *
   * @type {string}
   * @required
   * @example 'Crear nuevos usuarios en el sistema'
   */
  description: string
}

/**
 * Rol con Permisos Asociados
 *
 * Extiende UserRole con array de permisos que el rol tiene.
 * Se usa cuando necesitas saber exactamente qué puede hacer un rol.
 *
 * **Uso Típico**:
 * - Página de gestión de roles (admin)
 * - Validación: verificar que rol tiene permiso X
 * - Seeding de BD: crear roles con permisos
 * - Auditoría: registrar qué permisos tiene cada rol
 *
 * **Relación**:
 * ```
 * Role 1:N RolePermission N:1 Permission
 *
 * Un rol puede tener muchos permisos
 * Un permiso puede estar en muchos roles
 * ```
 *
 * **Ejemplo de Uso**:
 * ```typescript
 * const adminRole: RoleWithPermissions = {
 *   id: 'admin-id',
 *   name: 'admin',
 *   description: 'Administrador del sistema',
 *   permissions: [
 *     { id: 'user:create', ... },
 *     { id: 'user:read', ... },
 *     { id: 'user:update', ... },
 *     // ... todos los permisos
 *   ]
 * }
 * ```
 *
 * @interface RoleWithPermissions
 * @extends UserRole
 * @example
 * ```typescript
 * // Recuperar rol con permisos en admin panel
 * const role = await getRole(roleId) // retorna RoleWithPermissions
 * console.log(role.permissions.map(p => p.id)) // ['user:create', 'user:read', ...]
 * ```
 *
 * @see {@link UserRole} para versión sin permisos
 * @see {@link Permission} para estructura de permiso
 */
export interface RoleWithPermissions extends UserRole {
  /**
   * Array de permisos asignados a este rol
   *
   * Todos los permisos que un usuario con este rol puede hacer.
   *
   * @type {Permission[]}
   * @required
   * @example [{ id: 'user:create', ... }, { id: 'role:delete', ... }]
   */
  permissions: Permission[]
}

/**
 * Usuario con Roles y Permisos Completos
 *
 * Representa un usuario autenticado con toda su información de autorización.
 * Se usa como tipo para `session.user` en NextAuth y respuestas API.
 *
 * **Origen**:
 * - Se construye en JWT callback: enriquece User con roles/permisos
 * - Se retorna en responses de login/register
 * - Se mantiene en session para acceso rápido
 *
 * **Ciclo de Vida**:
 * 1. Login exitoso: Usuario recuperado de BD
 * 2. JWT callback: Se cargan roles y permisos del usuario
 * 3. Session callback: Se convierte JWT a Session (crea este tipo)
 * 4. Cliente: `const { data: session } = useSession()` → tiene este tipo
 * 5. Servidor: `const session = await getServerSession()` → tiene este tipo
 *
 * **Nota sobre `permissions`**:
 * - Array de IDs de permiso (strings), no objetos Permission
 * - Se carga en JWT para acceso sin BD
 * - Se deduplica (si usuario tiene múltiples roles con mismo permiso)
 * - En sesión client: disponible para validación rápida
 *
 * @interface UserWithRolesAndPermissions
 * @example
 * ```typescript
 * const user: UserWithRolesAndPermissions = {
   *   id: 'user-123',
   *   name: 'Juan Pérez',
   *   firstName: 'Juan',
   *   lastName: 'Pérez',
   *   email: 'juan@example.com',
   *   emailVerified: new Date('2024-01-01'),
   *   image: 'https://example.com/avatar.jpg',
   *   roles: [
   *     { id: 'admin-id', name: 'admin', description: '...' }
   *   ],
   *   permissions: ['user:create', 'user:read', 'role:manage'],
   *   createdAt: new Date('2024-01-01'),
   *   updatedAt: new Date('2024-12-05')
   * }
   * ```
   *
   * @see {@link UserRole} para estructura simplificada de rol
   * @see {@link Permission} para estructura de permiso
   * @see {@link RoleWithPermissions} para rol con permisos detallados
   */
export interface UserWithRolesAndPermissions {
  /**
   * ID único del usuario (UUID)
   *
   * @type {string}
   * @required
   * @example 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
   */
  id: string

  /**
   * Nombre completo del usuario (opcional)
   *
   * `name = firstName + ' ' + lastName` (generalmente).
   * Puede ser null si no se proporciona.
   *
   * @type {string | null}
   * @optional
   * @example 'Juan Pérez'
   */
  name: string | null

  /**
   * Primer nombre del usuario
   *
   * @type {string | null}
   * @optional
   * @example 'Juan'
   */
  firstName: string | null

  /**
   * Apellido del usuario
   *
   * @type {string | null}
   * @optional
   * @example 'Pérez'
   */
  lastName: string | null

  /**
   * Email del usuario
   *
   * Usado para login y comunicación.
   *
   * @type {string}
   * @required
   * @example 'juan@example.com'
   */
  email: string

  /**
   * Fecha de verificación del email (si aplica)
   *
   * null si email no está verificado.
   * Solo se verifica si email.verification.required = true en config.
   *
   * @type {Date | null}
   * @optional
   * @example new Date('2024-01-01')
   */
  emailVerified: Date | null

  /**
   * Avatar URL del usuario
   *
   * URL de imagen de perfil (de provider OAuth o subida).
   *
   * @type {string | null}
   * @optional
   * @example 'https://example.com/avatars/user-123.jpg'
   */
  image: string | null

  /**
   * Roles asignados al usuario
   *
   * Array de roles que el usuario tiene.
   * Se carga en JWT callback desde tabla user_roles.
   *
   * @type {UserRole[]}
   * @required
   * @example [{ id: '...', name: 'admin', ... }]
   */
  roles: UserRole[]

  /**
   * Permisos del usuario
   *
   * Array de IDs de permiso (strings) que el usuario tiene.
   * Se deduplica: si múltiples roles tienen 'user:create', aparece una vez.
   *
   * **Origen**:
   * - Se carga en JWT callback: combinando permisos de todos los roles
   * - Se almacena en JWT para acceso sin BD
   * - En sesión: disponible en cliente para validación rápida
   *
   * **Formato**:
   * - Array de strings: `['user:create', 'user:read', 'role:manage']`
   * - Puede ser vacío si usuario sin roles o roles sin permisos
   *
   * @type {string[]}
   * @required
   * @example ['user:create', 'user:read', 'role:manage']
   */
  permissions: string[]

  /**
   * Fecha de creación del usuario
   *
   * Cuándo fue registrado el usuario.
   *
   * @type {Date}
   * @required
   * @example new Date('2024-01-01')
   */
  createdAt: Date

  /**
   * Fecha de última actualización
   *
   * Cuándo se modificó por última vez el usuario (nombre, email, etc).
   *
   * @type {Date}
   * @required
   * @example new Date('2024-12-05')
   */
  updatedAt: Date
}

// ============================================================================
// TIPOS DE RESPUESTA DE API
// ============================================================================

/**
 * Respuesta estándar de autenticación
 */
export interface AuthResponse {
  success: boolean
  message: string
  user?: UserWithRolesAndPermissions
  error?: string
}

/**
 * Respuesta de verificación de permisos
 */
export interface PermissionCheckResponse {
  hasPermission: boolean
  userId: string
  permissionId: string
}

/**
 * Respuesta de asignación de roles
 */
export interface RoleAssignmentResponse {
  success: boolean
  message: string
  userId: string
  roleId: string
  action: 'assigned' | 'removed'
}

// ============================================================================
// TIPOS DE MIDDLEWARE
// ============================================================================

/**
 * Configuración de middleware de autenticación
 */
export interface AuthMiddlewareConfig {
  requireAuth?: boolean
  requirePermissions?: string[]
  requireRoles?: string[]
  redirectTo?: string
}

/**
 * Contexto de usuario autenticado
 */
export interface AuthContext {
  user: UserWithRolesAndPermissions | null
  isAuthenticated: boolean
  hasPermission: (permission: string) => boolean
  hasRole: (role: string) => boolean
  isLoading: boolean
}

// ============================================================================
// TIPOS DE VALIDACIÓN
// ============================================================================

/**
 * Reglas de validación para passwords
 */
export interface PasswordValidationRules {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
}

/**
 * Resultado de validación
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// ============================================================================
// TIPOS DE EVENTOS
// ============================================================================

/**
 * Eventos de autenticación
 */
export type AuthEvent =
  | 'USER_SIGNED_IN'
  | 'USER_SIGNED_OUT'
  | 'USER_REGISTERED'
  | 'PASSWORD_CHANGED'
  | 'EMAIL_VERIFIED'
  | 'ROLE_ASSIGNED'
  | 'ROLE_REMOVED'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED'

/**
 * Payload de evento de autenticación
 */
export interface AuthEventPayload {
  event: AuthEvent
  userId: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

// ============================================================================
// TIPOS DE CONFIGURACIÓN
// ============================================================================

/**
 * Configuración de autenticación
 */
export interface AuthConfig {
  session: {
    maxAge: number
    updateAge: number
  }
  password: PasswordValidationRules
  email: {
    verification: {
      required: boolean
      tokenExpiry: number
    }
  }
  security: {
    maxLoginAttempts: number
    lockoutDuration: number
  }
}