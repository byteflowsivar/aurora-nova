/**
 * Hook de autenticación para Aurora Nova
 * Proporciona estado de autenticación y funciones utilitarias
 */

'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import type { AuthContext, UserWithRolesAndPermissions, UserRole } from '@/lib/types/auth'

export function useAuth(): AuthContext {
  const { data: session, status } = useSession()
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Cargar permisos y roles del usuario cuando la sesión esté disponible
  useEffect(() => {
    async function loadUserData() {
      if (session?.user?.id) {
        try {
          // Cargar permisos del usuario
          const permissionsResponse = await fetch(`/api/users/${session.user.id}/permissions`)
          if (permissionsResponse.ok) {
            const data = await permissionsResponse.json()
            // Extraer los módulos de permisos de la estructura anidada
            const permissionModules: string[] = []
            if (data.permissions) {
              Object.values(data.permissions).forEach((perms: { module: string }[]) => {
                if (Array.isArray(perms)) {
                  perms.forEach((perm) => {
                    if (perm.module) {
                      permissionModules.push(perm.module)
                    }
                  })
                }
              })
            }
            setUserPermissions(permissionModules)
          }

          // Cargar roles del usuario
          const rolesResponse = await fetch(`/api/users/${session.user.id}/roles`)
          if (rolesResponse.ok) {
            const roles = await rolesResponse.json()
            setUserRoles(roles.map((role: { name: string }) => role.name))
          }
        } catch (error) {
          console.error('Error loading user data:', error)
        }
      }
      setIsLoading(false)
    }

    if (status !== 'loading') {
      loadUserData()
    }
  }, [session, status])

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
    isLoading: status === 'loading' || isLoading,
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