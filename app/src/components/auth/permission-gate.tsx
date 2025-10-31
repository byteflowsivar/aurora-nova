/**
 * Componentes de autorización basados en permisos
 * Aurora Nova - Sistema RBAC
 *
 * Estos componentes permiten controlar la visibilidad de UI de forma declarativa
 * basándose en los permisos del usuario actual.
 */

"use client"

import { ReactNode } from "react"
import {
  usePermission,
  useAnyPermission,
  useAllPermissions,
  useIsAdmin,
} from "@/lib/hooks/use-permissions"

// ============================================================================
// TIPOS COMPARTIDOS
// ============================================================================

interface BasePermissionGateProps {
  children: ReactNode
  /**
   * Elemento a mostrar mientras se cargan los permisos
   * @default null
   */
  fallback?: ReactNode
  /**
   * Elemento a mostrar si el usuario no tiene los permisos necesarios
   * @default null (no muestra nada)
   */
  unauthorized?: ReactNode
}

// ============================================================================
// PERMISSION GATE - Verificación de un solo permiso
// ============================================================================

interface PermissionGateProps extends BasePermissionGateProps {
  /**
   * Permiso requerido (ej: 'user:create', 'role:update')
   */
  permission: string
}

/**
 * Gate básico para verificar un solo permiso
 * Muestra children solo si el usuario tiene el permiso especificado
 *
 * @example
 * ```tsx
 * <PermissionGate permission="user:create">
 *   <CreateUserButton />
 * </PermissionGate>
 *
 * // Con fallback y unauthorized
 * <PermissionGate
 *   permission="user:delete"
 *   fallback={<Skeleton />}
 *   unauthorized={<AccessDenied />}
 * >
 *   <DeleteButton />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  permission,
  children,
  fallback = null,
  unauthorized = null,
}: PermissionGateProps) {
  const hasPermission = usePermission(permission)

  // Cargando permisos
  if (hasPermission === undefined) {
    return <>{fallback}</>
  }

  // Usuario no tiene el permiso
  if (!hasPermission) {
    return <>{unauthorized}</>
  }

  // Usuario tiene el permiso
  return <>{children}</>
}

// ============================================================================
// REQUIRE ANY PERMISSION - Verificación OR (al menos uno)
// ============================================================================

interface RequireAnyPermissionProps extends BasePermissionGateProps {
  /**
   * Array de permisos - el usuario debe tener AL MENOS UNO
   */
  permissions: string[]
}

/**
 * Gate que requiere AL MENOS UNO de los permisos especificados (lógica OR)
 * Útil cuando quieres dar acceso a usuarios con diferentes permisos
 *
 * @example
 * ```tsx
 * // Mostrar si puede crear O actualizar usuarios
 * <RequireAnyPermission permissions={['user:create', 'user:update']}>
 *   <UserManagementPanel />
 * </RequireAnyPermission>
 *
 * // Con mensaje de acceso denegado
 * <RequireAnyPermission
 *   permissions={['admin:view', 'moderator:view']}
 *   unauthorized={<Alert>Acceso solo para administradores o moderadores</Alert>}
 * >
 *   <AdminPanel />
 * </RequireAnyPermission>
 * ```
 */
export function RequireAnyPermission({
  permissions,
  children,
  fallback = null,
  unauthorized = null,
}: RequireAnyPermissionProps) {
  const hasAnyPermission = useAnyPermission(permissions)

  if (hasAnyPermission === undefined) {
    return <>{fallback}</>
  }

  if (!hasAnyPermission) {
    return <>{unauthorized}</>
  }

  return <>{children}</>
}

// ============================================================================
// REQUIRE ALL PERMISSIONS - Verificación AND (todos)
// ============================================================================

interface RequireAllPermissionsProps extends BasePermissionGateProps {
  /**
   * Array de permisos - el usuario debe tener TODOS
   */
  permissions: string[]
  /**
   * Si true, muestra los permisos faltantes en el mensaje de unauthorized
   * Solo funciona si unauthorized es null (se genera automáticamente)
   * @default false
   */
  showMissingPermissions?: boolean
}

/**
 * Gate que requiere TODOS los permisos especificados (lógica AND)
 * Útil para operaciones que requieren múltiples permisos
 *
 * @example
 * ```tsx
 * // Mostrar solo si tiene ambos permisos
 * <RequireAllPermissions permissions={['user:update', 'role:assign']}>
 *   <AdvancedUserEditor />
 * </RequireAllPermissions>
 *
 * // Mostrar permisos faltantes
 * <RequireAllPermissions
 *   permissions={['user:create', 'user:delete', 'user:update']}
 *   showMissingPermissions
 * >
 *   <FullUserManagement />
 * </RequireAllPermissions>
 * ```
 */
export function RequireAllPermissions({
  permissions,
  children,
  fallback = null,
  unauthorized = null,
  showMissingPermissions = false,
}: RequireAllPermissionsProps) {
  const result = useAllPermissions(permissions)

  if (!result) {
    return <>{fallback}</>
  }

  if (!result.hasPermission) {
    // Si unauthorized es null y showMissingPermissions es true, mostrar mensaje automático
    if (unauthorized === null && showMissingPermissions && result.missingPermissions) {
      return (
        <div className="text-sm text-muted-foreground">
          Permisos requeridos: {result.missingPermissions.join(", ")}
        </div>
      )
    }
    return <>{unauthorized}</>
  }

  return <>{children}</>
}

// ============================================================================
// PROTECTED COMPONENT - Componente flexible con múltiples opciones
// ============================================================================

interface ProtectedComponentProps extends BasePermissionGateProps {
  /**
   * Array de permisos a verificar
   */
  permissions: string[]
  /**
   * Modo de verificación:
   * - 'all': Requiere TODOS los permisos (AND)
   * - 'any': Requiere AL MENOS UNO (OR)
   * @default 'all'
   */
  mode?: "all" | "any"
  /**
   * Si true, muestra los permisos faltantes (solo modo 'all')
   * @default false
   */
  showMissingPermissions?: boolean
}

/**
 * Componente de autorización flexible con múltiples modos
 * Combina la funcionalidad de RequireAnyPermission y RequireAllPermissions
 *
 * @example
 * ```tsx
 * // Modo 'all' (por defecto) - Requiere TODOS
 * <ProtectedComponent permissions={['user:create', 'user:update']}>
 *   <UserForm />
 * </ProtectedComponent>
 *
 * // Modo 'any' - Requiere AL MENOS UNO
 * <ProtectedComponent
 *   permissions={['user:create', 'user:update']}
 *   mode="any"
 * >
 *   <UserManagementSection />
 * </ProtectedComponent>
 *
 * // Con todos los props
 * <ProtectedComponent
 *   permissions={['admin:read', 'admin:write']}
 *   mode="all"
 *   fallback={<Skeleton />}
 *   unauthorized={<AccessDenied />}
 *   showMissingPermissions
 * >
 *   <AdminPanel />
 * </ProtectedComponent>
 * ```
 */
export function ProtectedComponent({
  permissions,
  mode = "all",
  children,
  fallback = null,
  unauthorized = null,
  showMissingPermissions = false,
}: ProtectedComponentProps) {
  if (mode === "any") {
    return (
      <RequireAnyPermission
        permissions={permissions}
        fallback={fallback}
        unauthorized={unauthorized}
      >
        {children}
      </RequireAnyPermission>
    )
  }

  return (
    <RequireAllPermissions
      permissions={permissions}
      fallback={fallback}
      unauthorized={unauthorized}
      showMissingPermissions={showMissingPermissions}
    >
      {children}
    </RequireAllPermissions>
  )
}

// ============================================================================
// ADMIN ONLY - Shortcut para verificar system:admin
// ============================================================================

interface AdminOnlyProps extends Omit<BasePermissionGateProps, "fallback"> {
  /**
   * Elemento a mostrar mientras se cargan los permisos
   * @default null
   */
  fallback?: ReactNode
}

/**
 * Shortcut para verificar si el usuario es administrador del sistema
 * Equivalente a <PermissionGate permission="system:admin">
 *
 * @example
 * ```tsx
 * <AdminOnly>
 *   <SystemConfigPanel />
 * </AdminOnly>
 *
 * // Con mensaje personalizado
 * <AdminOnly unauthorized={<Alert>Solo administradores</Alert>}>
 *   <DangerZone />
 * </AdminOnly>
 * ```
 */
export function AdminOnly({
  children,
  fallback = null,
  unauthorized = null,
}: AdminOnlyProps) {
  const isAdmin = useIsAdmin()

  if (isAdmin === undefined) {
    return <>{fallback}</>
  }

  if (!isAdmin) {
    return <>{unauthorized}</>
  }

  return <>{children}</>
}

// ============================================================================
// INVERSE PERMISSION GATE - Muestra solo si NO tiene el permiso
// ============================================================================

interface InversePermissionGateProps extends BasePermissionGateProps {
  /**
   * Permiso a verificar - muestra children si el usuario NO lo tiene
   */
  permission: string
}

/**
 * Gate inverso - Muestra children solo si el usuario NO tiene el permiso
 * Útil para mostrar mensajes de upgrade o características bloqueadas
 *
 * @example
 * ```tsx
 * // Mostrar banner de upgrade solo si no es premium
 * <InversePermissionGate permission="premium:access">
 *   <UpgradeBanner />
 * </InversePermissionGate>
 *
 * // Mostrar mensaje de característica bloqueada
 * <InversePermissionGate permission="advanced:features">
 *   <div>Esta característica requiere permisos avanzados</div>
 * </InversePermissionGate>
 * ```
 */
export function InversePermissionGate({
  permission,
  children,
  fallback = null,
  unauthorized = null,
}: InversePermissionGateProps) {
  const hasPermission = usePermission(permission)

  if (hasPermission === undefined) {
    return <>{fallback}</>
  }

  // Lógica inversa: mostrar children si NO tiene el permiso
  if (hasPermission) {
    return <>{unauthorized}</>
  }

  return <>{children}</>
}
