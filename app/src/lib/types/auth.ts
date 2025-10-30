/**
 * Tipos TypeScript para autenticación y autorización en Aurora Nova
 * Incluye tipos extendidos para Auth.js y RBAC
 */

// ============================================================================
// TIPOS DE AUTENTICACIÓN Y RBAC
// ============================================================================
// Los tipos extendidos de Auth.js están en auth-types.ts para evitar conflictos

// ============================================================================
// TIPOS DE AUTENTICACIÓN
// ============================================================================

/**
 * Credenciales para login
 */
export interface LoginCredentials {
  email: string
  password: string
}

/**
 * Datos para registro de usuario
 */
export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  confirmPassword: string
}

/**
 * Datos para cambio de contraseña
 */
export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

/**
 * Datos para recuperación de contraseña
 */
export interface ResetPasswordData {
  email: string
}

/**
 * Datos para establecer nueva contraseña
 */
export interface SetPasswordData {
  token: string
  password: string
  confirmPassword: string
}

// ============================================================================
// TIPOS DE RBAC
// ============================================================================

/**
 * Rol de usuario simplificado
 */
export interface UserRole {
  id: string
  name: string
  description: string | null
}

/**
 * Permiso simplificado
 */
export interface Permission {
  id: string
  module: string
  description: string
}

/**
 * Rol con permisos
 */
export interface RoleWithPermissions {
  id: string
  name: string
  description: string | null
  permissions: Permission[]
}

/**
 * Usuario con roles completos
 */
export interface UserWithRolesAndPermissions {
  id: string
  name: string | null
  firstName: string | null
  lastName: string | null
  email: string
  emailVerified: Date | null
  image: string | null
  roles: UserRole[]
  permissions: string[]
  createdAt: Date
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