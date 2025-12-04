/**
 * Hook de autenticación para Aurora Nova
 * Proporciona estado de autenticación y funciones utilitarias
 */

'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react'
import type { AuthContext, UserWithRolesAndPermissions, UserRole } from '@/modules/shared/types'

export function useAuth(): AuthContext {
  const { data: session, status } = useSession()

  // Extraer permisos directamente de la sesión (ya están cargados en el JWT)
  const userPermissions = React.useMemo(() => {
    console.log("[useAuth] Estado de sesión:", {
      status,
      hasSession: !!session,
      hasUser: !!session?.user,
      sessionData: session
    })

    if (!session?.user) {
      console.log("[useAuth] No hay sesión/usuario, retornando permisos vacíos")
      return []
    }

    // Los permisos están disponibles en session.user.permissions
    const permissions = (session.user as { permissions?: string[] }).permissions || []
    console.log("[useAuth] Permisos cargados desde la sesión:", permissions)
    return permissions
  }, [session, status])

  // En el futuro, los roles también deberían estar en la sesión
  // Por ahora, devolvemos un array vacío
  const userRoles = React.useMemo(() => {
    if (!session?.user) return []

    // Los roles podrían estar en session.user.roles si se agregan al JWT
    const roles = (session.user as { roles?: { name: string }[] }).roles || []
    return roles.map(role => role.name)
  }, [session])

  // Función para verificar si el usuario tiene un permiso específico
  const hasPermission = (permission: string): boolean => {
    return userPermissions.includes(permission)
  }

  // Función para verificar si el usuario tiene un rol específico
  const hasRole = (role: string): boolean => {
    return userRoles.includes(role)
  }

  // Crear objeto de usuario extendido
  const user: UserWithRolesAndPermissions | null = session?.user && session.user.id
    ? {
        id: session.user.id,
        name: session.user.name ?? null,
        firstName: (session.user as { firstName?: string | null }).firstName ?? null,
        lastName: (session.user as { lastName?: string | null }).lastName ?? null,
        email: session.user.email ?? '',
        emailVerified: (session.user as { emailVerified?: Date | null }).emailVerified ?? null,
        image: session.user.image ?? null,
        roles: (session.user as { roles?: UserRole[] }).roles ?? [],
        permissions: userPermissions,
        createdAt: new Date(), // TODO: obtener de la base de datos
        updatedAt: new Date(), // TODO: obtener de la base de datos
      }
    : null

  return {
    user,
    isAuthenticated: !!session?.user,
    hasPermission,
    hasRole,
    isLoading: status === 'loading',
  }
}

/**
 * Hook para verificar permisos específicos
 */
export function usePermission(permission: string) {
  const { hasPermission, isLoading } = useAuth()

  return {
    hasPermission: hasPermission(permission),
    isLoading,
  }
}

/**
 * Hook para verificar roles específicos
 */
export function useRole(role: string) {
  const { hasRole, isLoading } = useAuth()

  return {
    hasRole: hasRole(role),
    isLoading,
  }
}

/**
 * Hook para verificar múltiples permisos
 */
export function usePermissions(permissions: string[]) {
  const { hasPermission, isLoading } = useAuth()

  const hasAllPermissions = permissions.every(permission => hasPermission(permission))
  const hasAnyPermission = permissions.some(permission => hasPermission(permission))

  return {
    hasAllPermissions,
    hasAnyPermission,
    isLoading,
  }
}

/**
 * Hook para verificar si el usuario tiene AL MENOS UNO de los permisos (OR)
 */
export function useAnyPermission(permissions: string[]) {
  const { hasPermission, isLoading } = useAuth()

  const result = permissions.some(permission => hasPermission(permission))

  return result ? true : isLoading ? undefined : false
}

/**
 * Hook para verificar si el usuario tiene TODOS los permisos (AND)
 */
export function useAllPermissions(permissions: string[]) {
  const { hasPermission, isLoading } = useAuth()

  const missingPermissions = permissions.filter(permission => !hasPermission(permission))
  const hasAllPermissions = missingPermissions.length === 0

  if (isLoading) {
    return null
  }

  return {
    hasPermission: hasAllPermissions,
    missingPermissions: hasAllPermissions ? [] : missingPermissions,
  }
}

/**
 * Hook para verificar si el usuario es administrador del sistema
 */
export function useIsAdmin() {
  const { hasPermission, isLoading } = useAuth()

  const isAdmin = hasPermission('system:admin')

  return isAdmin ? true : isLoading ? undefined : false
}