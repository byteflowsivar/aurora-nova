/**
 * Tipos TypeScript para el sistema de autenticación y autorización
 * Basado en el esquema de base de datos documentado en docs/
 */

// Tipos base de la base de datos
export interface User {
  id: string; // UUID
  first_name: string;
  last_name: string;
  email: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string; // UUID
  user_id: string; // UUID
  expires_at: Date;
}

export interface Key {
  id: string; // Semantic key like "email:user@example.com"
  user_id: string; // UUID
  hashed_password: string | null; // Nullable for OAuth providers
}

export interface Role {
  id: string; // UUID
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Permission {
  id: string; // Semantic like "user:create"
  module: string;
  description: string | null;
  created_at: Date;
}

export interface UserRole {
  user_id: string; // UUID
  role_id: string; // UUID
  created_at: Date;
  created_by: string | null; // UUID of user who assigned the role
}

export interface RolePermission {
  role_id: string; // UUID
  permission_id: string; // Semantic permission ID
  created_at: Date;
}

// Tipos para DTOs (Data Transfer Objects)
export interface CreateUserDto {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UpdateUserDto {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
}

export interface AssignRoleDto {
  user_id: string;
  role_id: string;
}

// Tipos para respuestas de API
export interface AuthResponse {
  user: User;
  session: Session;
}

export interface UserWithRoles extends User {
  roles: Role[];
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

// Tipos para el contexto de autenticación
export interface AuthContext {
  user: User | null;
  session: Session | null;
  permissions: string[]; // Array of permission IDs like ["user:create", "role:read"]
  hasPermission: (permission: string) => boolean;
  hasRole: (roleName: string) => boolean;
  isAuthenticated: boolean;
}

// Tipos para middleware y guards
export interface RouteGuard {
  requireAuth?: boolean;
  requirePermissions?: string[];
  requireRoles?: string[];
}

// Tipos de error específicos para auth
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

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
}

// Constantes para permisos predefinidos
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

// Tipos derivados para los permisos
export type UserPermissionType = typeof PERMISSIONS.USER[keyof typeof PERMISSIONS.USER];
export type RolePermissionType = typeof PERMISSIONS.ROLE[keyof typeof PERMISSIONS.ROLE];
export type PermissionPermissionType = typeof PERMISSIONS.PERMISSION[keyof typeof PERMISSIONS.PERMISSION];
export type AllPermissions = UserPermissionType | RolePermissionType | PermissionPermissionType;