/**
 * Definiciones de Tipos para Prisma en Aurora Nova
 *
 * Aurora Nova - Prisma Type Definitions
 *
 * Exporta tipos TypeScript derivados del schema Prisma.
 * Proporciona type-safety completa para queries y mutations.
 *
 * **Contenido**:
 * - Tipos base: User, Role, Permission, Session, Account
 * - Tipos con relaciones: UserWithRoles, UserWithFullData, etc
 * - Tipos de payload: CreateUserData, UpdateUserData, etc
 * - Tipos simplificados: UserRole, UserPermission para respuestas API
 *
 * **Propósito**:
 * - Type-safe queries desde BD (no any types)
 * - Autocompletar en IDE para campos de BD
 * - Validación en tiempo de compilación
 * - Seguridad: evita errores de nombres de campos
 *
 * **Derivación de Tipos**:
 * - Prisma.UserGetPayload: Tipo completo del modelo User
 * - Con `include`: Relaciones se incluyen en tipo
 * - Completamente type-safe sin casteos
 *
 * @module lib/prisma/types
 * @see {@link ./generated} para Prisma client types
 * @see {@link ./queries.ts} para funciones que usan estos tipos
 * @see {@link ../../actions/auth.ts} para uso en Server Actions
 *
 * @example
 * ```typescript
 * import type { User, UserWithFullData } from '@/lib/prisma/types';
 *
 * const basicUser: User = await getUserById('123');
 * const fullUser: UserWithFullData = await getUserWithFullData('456');
 *
 * // Type-safe: IDE autocomplete funciona
 * basicUser.email; // ✓ Existe
 * basicUser.roles; // ✗ No existe (usar UserWithRoles)
 *
 * fullUser.userRoles[0].role.rolePermissions; // ✓ Existe
 * ```
 */

import type { Prisma } from './generated'

// ============================================================================
// TIPOS BASE DE PRISMA - Base Model Types
// ============================================================================

/**
 * Usuario sin relaciones
 *
 * Campos: id, email, name, firstName, lastName, emailVerified, image, createdAt, updatedAt
 *
 * @type {Prisma.UserGetPayload<object>}
 *
 * @remarks
 * Tipos base SIN relaciones incluidas.
 * Para obtener roles o permisos, usar tipos con relaciones.
 *
 * @see {@link UserWithRoles} para usuario + roles
 * @see {@link UserWithFullData} para usuario + roles + permisos
 */
export type User = Prisma.UserGetPayload<object>

/**
 * Rol sin relaciones
 *
 * Campos: id, name, description, createdAt, updatedAt
 *
 * @type {Prisma.RoleGetPayload<object>}
 */
export type Role = Prisma.RoleGetPayload<object>

/**
 * Permiso sin relaciones
 *
 * Campos: id, name, module, description, createdAt, updatedAt
 *
 * @type {Prisma.PermissionGetPayload<object>}
 */
export type Permission = Prisma.PermissionGetPayload<object>

/**
 * Credenciales de usuario (hash de contraseña)
 *
 * Campos: userId, hashedPassword (bcryptjs 12 rounds), updatedAt
 *
 * @type {Prisma.UserCredentialsGetPayload<object>}
 *
 * @remarks
 * Almacena hash de contraseña (nunca contraseña en texto).
 * Relación 1:1 con User.
 */
export type UserCredentials = Prisma.UserCredentialsGetPayload<object>

/**
 * Sesión de autenticación
 *
 * Campos: sessionToken (único), userId, expires, createdAt, updatedAt
 *
 * @type {Prisma.SessionGetPayload<object>}
 *
 * @remarks
 * Token almacenado en BD para Database Session Strategy.
 * Híbrido con JWT: permite validar sin queries en cada request.
 */
export type Session = Prisma.SessionGetPayload<object>

/**
 * Cuenta de proveedor OAuth (si implementado)
 *
 * Campos para OAuth: provider, providerAccountId, userId, etc
 *
 * @type {Prisma.AccountGetPayload<object>}
 *
 * @remarks
 * Para integración futura con proveedores (Google, GitHub, etc).
 * Actualmente no usado, pero disponible en schema.
 */
export type Account = Prisma.AccountGetPayload<object>

// ============================================================================
// TIPOS COMPLEJOS CON RELACIONES - Types with Relations
// ============================================================================

/**
 * Usuario con sus roles asignados
 *
 * Estructura:
 * - User base + relación userRoles
 * - userRoles: Array de asignaciones usuario-rol
 * - userRoles[].role: Datos completos del rol (SIN permisos)
 *
 * @type {Prisma.UserGetPayload}
 *
 * @remarks
 * Use para:
 * - Mostrar roles del usuario en UI
 * - Administración de asignación de roles
 * - Verificar membresía en roles específicos
 *
 * @see {@link UserWithFullData} si necesitas también los permisos
 */
export type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    userRoles: {
      include: {
        role: true
      }
    }
  }
}>

/**
 * Usuario con roles AND permisos (máxima información)
 *
 * Cadena completa:
 * - User → userRoles → roles → rolePermissions → permissions
 *
 * Estructura anidada profunda con TODA la información de autorización.
 *
 * @type {Prisma.UserGetPayload}
 *
 * @remarks
 * ⚠️ Query más "pesada": carga múltiples niveles de relaciones.
 * Usar solo cuando necesites permisos completos.
 *
 * Alternativa más eficiente: getUserPermissions() retorna solo array de IDs.
 *
 * @see {@link getUserWithFullData} en queries.ts para cómo usarlo
 * @see {@link simplifyUserWithFullData} para transformar a formato simple
 */
export type UserWithFullData = Prisma.UserGetPayload<{
  include: {
    userRoles: {
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    }
  }
}>

/**
 * Rol con todos sus permisos asociados
 *
 * Estructura:
 * - Role base + relación rolePermissions
 * - rolePermissions: Array de asignaciones rol-permiso
 * - rolePermissions[].permission: Datos completos del permiso
 *
 * @type {Prisma.RoleGetPayload}
 *
 * @remarks
 * Use para:
 * - Edición de rol (mostrar permisos actuales)
 * - Administración de RBAC
 * - Verificar permisos de un rol
 */
export type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: {
    rolePermissions: {
      include: {
        permission: true
      }
    }
  }
}>

/**
 * Usuario con credenciales de autenticación
 *
 * Estructura:
 * - User base + relación credentials
 * - credentials: Hash bcryptjs de contraseña
 *
 * @type {Prisma.UserGetPayload}
 *
 * @remarks
 * Use para:
 * - Verificación de contraseña en login
 * - Cambio de contraseña
 * - Validación de credenciales
 *
 * **Seguridad**: Nunca retorna contraseña en texto, solo hash
 */
export type UserWithCredentials = Prisma.UserGetPayload<{
  include: {
    credentials: true
  }
}>

// ============================================================================
// TIPOS DE PAYLOAD PARA OPERACIONES - Input Types
// ============================================================================

/**
 * Datos para crear nuevo usuario
 *
 * Mismo formato que Usuario base pero para input (CREATE).
 * Usa tipos de Prisma para validación.
 *
 * @type {Prisma.UserCreateInput}
 *
 * @remarks
 * Se define en createUserWithCredentials() con credenciales inline.
 */
export type CreateUserData = Prisma.UserCreateInput

/**
 * Datos para actualizar usuario
 *
 * Todos los campos opcionales para UPDATE parcial.
 * Usa tipos de Prisma para validación.
 *
 * @type {Prisma.UserUpdateInput}
 */
export type UpdateUserData = Prisma.UserUpdateInput

/**
 * Datos para crear nuevo rol
 *
 * Campos: name (requerido), description (opcional)
 *
 * @type {Prisma.RoleCreateInput}
 */
export type CreateRoleData = Prisma.RoleCreateInput

/**
 * Datos para crear nuevo permiso
 *
 * Campos: name, module, description
 *
 * @type {Prisma.PermissionCreateInput}
 */
export type CreatePermissionData = Prisma.PermissionCreateInput

// ============================================================================
// TIPOS DE RESPUESTA SIMPLIFICADOS - Simplified Response Types
// ============================================================================

/**
 * Rol simplificado para respuestas de API
 *
 * Subset de campos de Role para serialización en respuestas.
 * Evita exponer todos los campos o generar tipos complejos.
 *
 * @interface UserRole
 * @property {string} id - ID del rol
 * @property {string} name - Nombre del rol (ej: "Admin", "Editor")
 * @property {string | null} description - Descripción opcional
 *
 * @remarks
 * Usado en UserWithRolesAndPermissions para respuesta simplificada.
 */
export interface UserRole {
  id: string
  name: string
  description: string | null
}

/**
 * Permiso simplificado para respuestas de API
 *
 * Subset de campos de Permission.
 *
 * @interface UserPermission
 * @property {string} id - ID del permiso (ej: "user:create")
 * @property {string} module - Módulo del permiso (ej: "users")
 * @property {string | null} description - Descripción opcional
 *
 * @remarks
 * Usado en respuestas de autorización.
 * Alternativa: retornar solo array de IDs si no necesitas detalles.
 */
export interface UserPermission {
  id: string
  module: string
  description: string | null
}

/**
 * Usuario simplificado con roles y permisos (para API)
 *
 * Transformación de UserWithFullData a estructura simple.
 * Facilita serialización JSON y respuestas de API.
 *
 * **Estructura**:
 * ```
 * {
 *   id, name, firstName, lastName, email, image,
 *   roles: [{ id, name, description }],
 *   permissions: ["user:read", "user:create", ...],
 *   createdAt, updatedAt
 * }
 * ```
 *
 * @interface UserWithRolesAndPermissions
 *
 * @property {string} id - ID del usuario
 * @property {string | null} name - Nombre completo
 * @property {string | null} firstName - Nombre
 * @property {string | null} lastName - Apellido
 * @property {string} email - Email del usuario
 * @property {Date | null} emailVerified - Si email fue verificado
 * @property {string | null} image - URL de foto de perfil
 * @property {UserRole[]} roles - Array simplificado de roles
 * @property {string[]} permissions - Array de IDs de permisos (deduplicated)
 * @property {Date} createdAt - Cuándo se creó
 * @property {Date} updatedAt - Cuándo se actualizó por última vez
 *
 * @remarks
 * Generada por simplifyUserWithFullData() helper function.
 * Deduplicación automática: si 2 roles comparten permiso, aparece 1 sola vez.
 *
 * @see {@link simplifyUserWithFullData} para transformación
 * @see {@link getUserWithFullData} para origen de datos
 *
 * **Casos de Uso**:
 * - Respuesta de login
 * - Payload de JWT token
 * - Almacenamiento en sesión
 * - Serialización a JSON
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