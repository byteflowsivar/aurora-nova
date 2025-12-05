/**
 * Módulo de Hooks de Autenticación y Autorización
 *
 * Proporciona una familia de hooks para autenticación, roles y permisos.
 * Todos los hooks consumen la sesión de next-auth/react y enriquecen
 * la información con permisos y roles del usuario.
 *
 * **Hooks Disponibles**:
 * - `useAuth()`: Hook principal con contexto completo
 * - `usePermission(permission)`: Verificar un permiso específico
 * - `useRole(role)`: Verificar un rol específico
 * - `usePermissions(permissions)`: Verificar múltiples permisos (AND/OR)
 * - `useAnyPermission(permissions)`: AL MENOS UN permiso (OR)
 * - `useAllPermissions(permissions)`: TODOS los permisos (AND)
 * - `useIsAdmin()`: Verificar si es admin del sistema
 *
 * **Características Principales**:
 * - Integración con next-auth/react para sesión
 * - Permisos cargados en JWT (en session.user.permissions)
 * - Roles disponibles en session (en session.user.roles)
 * - Memoización para optimizar re-renders
 * - Logging de depuración (console.log) en useAuth
 * - Manejo de estados: loading, authenticated, unauthenticated
 *
 * **Seguridad**:
 * - Permisos validados en servidor (JWT)
 * - Hooks solo para verificación en cliente
 * - Nunca confiar SOLO en validación de cliente
 * - Requiere validación en servidor para operaciones críticas
 *
 * @module useAuth
 */

'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react'
import type { AuthContext, UserWithRolesAndPermissions, UserRole } from '@/modules/shared/types'

/**
 * Hook useAuth - Contexto completo de autenticación y autorización
 *
 * Hook principal que proporciona toda la información de autenticación,
 * autorización, usuario y funciones para verificar permisos/roles.
 *
 * @returns {AuthContext} Objeto con:
 *   - `user`: UserWithRolesAndPermissions | null - Usuario autenticado con roles y permisos
 *   - `isAuthenticated`: boolean - Si el usuario está autenticado
 *   - `isLoading`: boolean - Si la sesión está cargando
 *   - `hasPermission(permission)`: (perm: string) => boolean - Verificar permiso
 *   - `hasRole(role)`: (role: string) => boolean - Verificar rol
 *
 * **Datos del Usuario**:
 *   - id: string
 *   - name: string | null
 *   - firstName: string | null
 *   - lastName: string | null
 *   - email: string
 *   - emailVerified: Date | null
 *   - image: string | null
 *   - roles: UserRole[] (si disponible)
 *   - permissions: string[] (desde JWT)
 *   - createdAt: Date
 *   - updatedAt: Date
 *
 * **Estados**:
 *   - Autenticado: user existe + isAuthenticated = true
 *   - No autenticado: user = null + isAuthenticated = false
 *   - Cargando: status = 'loading' + isLoading = true
 *
 * **Flujo**:
 *   1. Hook lee sesión de next-auth/react
 *   2. Extrae permisos de session.user.permissions (JWT)
 *   3. Extrae roles de session.user.roles (si disponible)
 *   4. Enriquece información del usuario
 *   5. Retorna objeto completo de contexto
 *
 * **Notas**:
 *   - Incluye logging de depuración (remover en production)
 *   - createdAt/updatedAt son placeholders (TODO: desde BD)
 *   - Roles aún no están completamente integrados en JWT
 *   - Permisos se usan principalmente (roles son secundarios)
 *
 * @example
 * ```tsx
 * function AdminDashboard() {
 *   const { user, isAuthenticated, hasPermission, isLoading } = useAuth()
 *
 *   if (isLoading) return <div>Cargando...</div>
 *   if (!isAuthenticated) return <div>No autenticado</div>
 *
 *   return (
 *     <div>
 *       <h1>Bienvenido {user?.name}</h1>
 *       {hasPermission('admin:read') && <AdminPanel />}
 *     </div>
 *   )
 * }
 * ```
 *
 * @see {@link usePermission} para verificación de un permiso
 * @see {@link useRole} para verificación de un rol
 * @see {@link useAllPermissions} para verificar múltiples permisos
 */
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
 * Hook usePermission - Verificar UN permiso específico
 *
 * Hook conveniente para verificar si el usuario tiene un permiso específico.
 * Simplifica el caso de uso más común: validar acceso a una acción específica.
 *
 * @param {string} permission - Permiso a verificar (ej: "admin:read", "user:update")
 * @returns {{ hasPermission: boolean, isLoading: boolean }}
 *   - `hasPermission`: true si el usuario tiene el permiso
 *   - `isLoading`: true mientras la sesión está cargando
 *
 * **Uso Típico**:
 *   - Mostrar/ocultar opciones de menú
 *   - Habilitar/deshabilitar botones
 *   - Decidir si renderizar un componente
 *
 * **Formato de Permiso**:
 *   - Formato: "módulo:acción"
 *   - Ejemplos:
 *     - "admin:read" - Leer datos administrativos
 *     - "role:update" - Actualizar roles
 *     - "user:delete" - Eliminar usuarios
 *   - Validación en servidor OBLIGATORIA para operaciones reales
 *
 * @example
 * ```tsx
 * function DeleteButton({ userId }) {
 *   const { hasPermission, isLoading } = usePermission('user:delete')
 *
 *   if (isLoading) return <Button disabled>Cargando...</Button>
 *
 *   return (
 *     <Button disabled={!hasPermission} onClick={() => deleteUser(userId)}>
 *       Eliminar Usuario
 *     </Button>
 *   )
 * }
 * ```
 *
 * @see {@link useAuth} para acceso al contexto completo
 * @see {@link useAllPermissions} para verificar múltiples permisos
 */
export function usePermission(permission: string) {
  const { hasPermission, isLoading } = useAuth()

  return {
    hasPermission: hasPermission(permission),
    isLoading,
  }
}

/**
 * Hook useRole - Verificar UN rol específico
 *
 * Hook para verificar si el usuario tiene un rol específico.
 * Nota: Roles aún no están completamente integrados en JWT.
 *
 * @param {string} role - Rol a verificar (ej: "admin", "editor", "viewer")
 * @returns {{ hasRole: boolean, isLoading: boolean }}
 *
 * **Estado Actual**:
 *   - Roles extraídos de session.user.roles si disponible
 *   - No completamente integrados en JWT (TODO)
 *   - Permisos son el enfoque principal actualmente
 *
 * @example
 * ```tsx
 * const { hasRole } = useRole('admin')
 * ```
 *
 * @see {@link useAuth} para contexto completo
 * @deprecated Usar {@link usePermission} es más recomendado actualmente
 */
export function useRole(role: string) {
  const { hasRole, isLoading } = useAuth()

  return {
    hasRole: hasRole(role),
    isLoading,
  }
}

/**
 * Hook usePermissions - Verificar múltiples permisos (AND/OR)
 *
 * Hook para verificar si el usuario tiene múltiples permisos.
 * Retorna tanto hasAllPermissions (AND) como hasAnyPermission (OR).
 *
 * @param {string[]} permissions - Array de permisos a verificar
 * @returns {{ hasAllPermissions: boolean, hasAnyPermission: boolean, isLoading: boolean }}
 *   - `hasAllPermissions`: true si tiene TODOS los permisos
 *   - `hasAnyPermission`: true si tiene AL MENOS UNO
 *   - `isLoading`: true mientras carga
 *
 * **Casos de Uso**:
 *   - Requerir múltiples permisos para una operación
 *   - Mostrar UI si tiene alguno de varios permisos
 *
 * @example
 * ```tsx
 * function AdminPanel() {
 *   const { hasAllPermissions } = usePermissions([
 *     'role:read',
 *     'role:update'
 *   ])
 *
 *   if (!hasAllPermissions) return <div>Acceso denegado</div>
 *   return <EditRoleForm />
 * }
 * ```
 *
 * @see {@link useAllPermissions} para verificar solo AND
 * @see {@link useAnyPermission} para verificar solo OR
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
 * Hook useAnyPermission - Verificar AL MENOS UN permiso (OR)
 *
 * Hook especializado para verificar si el usuario tiene AL MENOS UNO
 * de los permisos especificados (lógica OR).
 *
 * @param {string[]} permissions - Array de permisos (solo uno necesita cumplirse)
 * @returns {boolean | undefined} - true/false si cargó, undefined mientras carga
 *   - true: tiene al menos uno de los permisos
 *   - false: no tiene ninguno de los permisos (después de cargar)
 *   - undefined: aún está cargando
 *
 * **Caso de Uso**:
 *   - Mostrar componente si el usuario tiene CUALQUIERA de varios permisos
 *   - Ejemplo: mostrar menú si es admin O moderador O editor
 *
 * @example
 * ```tsx
 * function AdminMenu() {
 *   const canManage = useAnyPermission(['admin', 'moderator'])
 *
 *   if (canManage === undefined) return <Skeleton />
 *   if (!canManage) return null
 *
 *   return <Menu />
 * }
 * ```
 *
 * @see {@link useAllPermissions} para verificar TODOS los permisos (AND)
 */
export function useAnyPermission(permissions: string[]) {
  const { hasPermission, isLoading } = useAuth()

  const result = permissions.some(permission => hasPermission(permission))

  return result ? true : isLoading ? undefined : false
}

/**
 * Hook useAllPermissions - Verificar TODOS los permisos (AND)
 *
 * Hook especializado para verificar si el usuario tiene TODOS los permisos
 * especificados (lógica AND). También retorna lista de permisos faltantes.
 *
 * @param {string[]} permissions - Array de permisos (todos deben cumplirse)
 * @returns {{ hasPermission: boolean, missingPermissions: string[] } | null}
 *   - hasPermission: true si tiene TODOS los permisos
 *   - missingPermissions: array vacío si tiene todos, lista de faltantes si no
 *   - null: mientras está cargando
 *
 * **Caso de Uso**:
 *   - Requerir múltiples permisos para una operación crítica
 *   - Mostrar cuales permisos faltan para feedback al usuario
 *
 * @example
 * ```tsx
 * function CriticalOperation() {
 *   const result = useAllPermissions([
 *     'admin:read',
 *     'admin:update'
 *   ])
 *
 *   if (result === null) return <Skeleton />
 *
 *   if (!result.hasPermission) {
 *     return (
 *       <div>
 *         Permisos insuficientes. Faltantes: {result.missingPermissions.join(', ')}
 *       </div>
 *     )
 *   }
 *
 *   return <CriticalForm />
 * }
 * ```
 *
 * @see {@link useAnyPermission} para verificar AL MENOS UNO (OR)
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
 * Hook useIsAdmin - Verificar si es admin del sistema
 *
 * Hook especializado para verificar si el usuario es administrador del sistema.
 * Comprueba el permiso específico 'system:admin'.
 *
 * @returns {boolean | undefined}
 *   - true: es administrador
 *   - false: no es administrador (después de cargar)
 *   - undefined: mientras carga
 *
 * **Caso de Uso**:
 *   - Mostrar opciones administrativas solo a admins
 *   - Proteger rutas/componentes solo para admins
 *   - Verificación rápida sin pasar array de permisos
 *
 * @example
 * ```tsx
 * function MainMenu() {
 *   const isAdmin = useIsAdmin()
 *
 *   return (
 *     <nav>
 *       <Link href="/dashboard">Dashboard</Link>
 *       {isAdmin && <Link href="/admin">Administración</Link>}
 *     </nav>
 *   )
 * }
 * ```
 *
 * @see {@link usePermission} para permisos genéricos
 */
export function useIsAdmin() {
  const { hasPermission, isLoading } = useAuth()

  const isAdmin = hasPermission('system:admin')

  return isAdmin ? true : isLoading ? undefined : false
}