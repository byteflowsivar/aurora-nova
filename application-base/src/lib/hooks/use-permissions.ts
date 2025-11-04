/**
 * Hooks de React para verificación de permisos
 * Aurora Nova - Sistema RBAC
 *
 * Estos hooks permiten verificar permisos en componentes cliente de forma reactiva
 */

"use client"

import { useSession } from "next-auth/react"
import { useMemo } from "react"
import {
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
} from "@/lib/utils/permission-utils"
import type { PermissionCheckResult } from "@/lib/types/permissions"

// ============================================================================
// HOOKS DE PERMISOS
// ============================================================================

/**
 * Hook para obtener los permisos del usuario actual desde la sesión
 *
 * @returns Array de permission IDs o undefined si no hay sesión
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const permissions = useUserPermissions()
 *
 *   if (!permissions) return <div>Cargando...</div>
 *
 *   return <div>Tienes {permissions.length} permisos</div>
 * }
 * ```
 */
export function useUserPermissions(): string[] | undefined {
  const { data: session } = useSession()

  return useMemo(() => {
    if (!session?.user) return undefined

    // Los permisos se cargan en la sesión via callback
    // Ver src/lib/auth.ts para la implementación
    return (session as any).user?.permissions || []
  }, [session])
}

/**
 * Hook para verificar si el usuario actual tiene un permiso específico
 *
 * @param permission - ID del permiso a verificar
 * @returns true si tiene el permiso, false si no, undefined si cargando
 *
 * @example
 * ```tsx
 * function CreateUserButton() {
 *   const canCreate = usePermission('user:create')
 *
 *   if (canCreate === undefined) return <Skeleton />
 *   if (!canCreate) return null
 *
 *   return <Button>Crear Usuario</Button>
 * }
 * ```
 */
export function usePermission(permission: string): boolean | undefined {
  const permissions = useUserPermissions()

  return useMemo(() => {
    if (!permissions) return undefined
    return checkPermission(permissions, permission)
  }, [permissions, permission])
}

/**
 * Hook para verificar si el usuario tiene AL MENOS UNO de varios permisos (OR)
 *
 * @param permissionList - Array de permisos a verificar
 * @returns true si tiene al menos uno, false si no, undefined si cargando
 *
 * @example
 * ```tsx
 * function UserManagementSection() {
 *   // Mostrar si puede crear O actualizar usuarios
 *   const canManage = useAnyPermission(['user:create', 'user:update'])
 *
 *   if (!canManage) return null
 *
 *   return <UserManagementPanel />
 * }
 * ```
 */
export function useAnyPermission(permissionList: string[]): boolean | undefined {
  const permissions = useUserPermissions()

  return useMemo(() => {
    if (!permissions) return undefined
    return checkAnyPermission(permissions, permissionList)
  }, [permissions, permissionList])
}

/**
 * Hook para verificar si el usuario tiene TODOS los permisos especificados (AND)
 *
 * @param permissionList - Array de permisos a verificar
 * @returns PermissionCheckResult o undefined si cargando
 *
 * @example
 * ```tsx
 * function AdvancedUserEditor() {
 *   const result = useAllPermissions(['user:update', 'role:assign'])
 *
 *   if (!result) return <Skeleton />
 *
 *   if (!result.hasPermission) {
 *     return (
 *       <Alert>
 *         Permisos faltantes: {result.missingPermissions?.join(', ')}
 *       </Alert>
 *     )
 *   }
 *
 *   return <AdvancedEditor />
 * }
 * ```
 */
export function useAllPermissions(
  permissionList: string[]
): PermissionCheckResult | undefined {
  const permissions = useUserPermissions()

  return useMemo(() => {
    if (!permissions) return undefined
    return checkAllPermissions(permissions, permissionList)
  }, [permissions, permissionList])
}

/**
 * Hook para verificar múltiples permisos con opciones
 * Versión flexible que permite AND o OR
 *
 * @param permissionList - Array de permisos a verificar
 * @param requireAll - Si true requiere TODOS (AND), si false requiere AL MENOS UNO (OR)
 * @returns PermissionCheckResult o undefined si cargando
 *
 * @example
 * ```tsx
 * function ConditionalComponent() {
 *   // Requiere TODOS los permisos (AND)
 *   const resultAll = usePermissions(['user:create', 'user:update'], true)
 *
 *   // Requiere AL MENOS UNO (OR)
 *   const resultAny = usePermissions(['user:create', 'user:update'], false)
 *
 *   // ...
 * }
 * ```
 */
export function usePermissions(
  permissionList: string[],
  requireAll: boolean = true
): PermissionCheckResult | undefined {
  const permissions = useUserPermissions()

  return useMemo(() => {
    if (!permissions) return undefined

    if (requireAll) {
      return checkAllPermissions(permissions, permissionList)
    } else {
      const hasAny = checkAnyPermission(permissions, permissionList)
      return { hasPermission: hasAny }
    }
  }, [permissions, permissionList, requireAll])
}

/**
 * Hook para verificar si el usuario es administrador del sistema
 * Shortcut para verificar el permiso system:admin
 *
 * @returns true si es admin, false si no, undefined si cargando
 *
 * @example
 * ```tsx
 * function AdminPanel() {
 *   const isAdmin = useIsAdmin()
 *
 *   if (!isAdmin) return <AccessDenied />
 *
 *   return <AdminDashboard />
 * }
 * ```
 */
export function useIsAdmin(): boolean | undefined {
  return usePermission("system:admin")
}

/**
 * Hook para obtener información del usuario actual y sus permisos
 * Combina useSession con useUserPermissions
 *
 * @returns Objeto con userId, permissions y loading state
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { userId, permissions, isLoading } = useCurrentUser()
 *
 *   if (isLoading) return <Skeleton />
 *   if (!userId) return <Login />
 *
 *   return (
 *     <div>
 *       <p>ID: {userId}</p>
 *       <p>Permisos: {permissions.length}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function useCurrentUser() {
  const { data: session, status } = useSession()
  const permissions = useUserPermissions()

  return useMemo(
    () => ({
      userId: session?.user?.id,
      permissions: permissions || [],
      isLoading: status === "loading",
      isAuthenticated: status === "authenticated",
    }),
    [session, permissions, status]
  )
}
