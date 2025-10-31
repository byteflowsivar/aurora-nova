/**
 * Tipos TypeScript para Prisma queries en Aurora Nova
 * Tipos derivados del cliente Prisma generado
 */

import type { Prisma } from './generated'

// ============================================================================
// TIPOS BASE DE PRISMA
// ============================================================================

export type User = Prisma.UserGetPayload<object>
export type Role = Prisma.RoleGetPayload<object>
export type Permission = Prisma.PermissionGetPayload<object>
export type UserCredentials = Prisma.UserCredentialsGetPayload<object>
export type Session = Prisma.SessionGetPayload<object>
export type Account = Prisma.AccountGetPayload<object>

// ============================================================================
// TIPOS COMPLEJOS CON RELACIONES
// ============================================================================

export type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    userRoles: {
      include: {
        role: true
      }
    }
  }
}>

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

export type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: {
    rolePermissions: {
      include: {
        permission: true
      }
    }
  }
}>

export type UserWithCredentials = Prisma.UserGetPayload<{
  include: {
    credentials: true
  }
}>

// ============================================================================
// TIPOS DE PAYLOAD PARA OPERACIONES
// ============================================================================

export type CreateUserData = Prisma.UserCreateInput
export type UpdateUserData = Prisma.UserUpdateInput
export type CreateRoleData = Prisma.RoleCreateInput
export type CreatePermissionData = Prisma.PermissionCreateInput

// ============================================================================
// TIPOS DE RESPUESTA SIMPLIFICADOS
// ============================================================================

export interface UserRole {
  id: string
  name: string
  description: string | null
}

export interface UserPermission {
  id: string
  module: string
  description: string | null
}

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