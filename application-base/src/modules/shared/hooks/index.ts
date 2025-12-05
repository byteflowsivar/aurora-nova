/**
 * Módulo de Hooks Compartidos - Aurora Nova
 *
 * Colección de hooks reutilizables para toda la aplicación.
 * Importa desde este archivo en lugar de desde archivos individuales.
 *
 * **Disponibles**:
 *
 * **Autenticación y Autorización** (desde use-auth.ts):
 * - `useAuth()` - Contexto completo de auth, usuario y permisos
 * - `usePermission(permission)` - Verificar UN permiso específico
 * - `useRole(role)` - Verificar UN rol específico
 * - `usePermissions(permissions)` - Verificar múltiples permisos (AND/OR)
 * - `useAnyPermission(permissions)` - AL MENOS UN permiso (OR logic)
 * - `useAllPermissions(permissions)` - TODOS los permisos (AND logic)
 * - `useIsAdmin()` - Quick check para 'system:admin'
 *
 * **Utilidades** (desde use-debounce.ts):
 * - `useDebounce<T>(value, delay)` - Debounce genérico para cualquier valor
 *
 * **Responsive** (desde use-mobile.ts):
 * - `useIsMobile()` - Detectar si viewport es móvil (< 768px)
 *
 * @example
 * ```typescript
 * // Importar todos los hooks desde aquí
 * import { useAuth, usePermission, useDebounce, useIsMobile } from '@/modules/shared/hooks'
 *
 * function MyComponent() {
 *   const { user, isAuthenticated } = useAuth()
 *   const { hasPermission } = usePermission('admin:read')
 *   const isMobile = useIsMobile()
 *   const debouncedValue = useDebounce(value, 500)
 *
 *   return <div>{user?.email}</div>
 * }
 * ```
 *
 * @module hooks
 * @see {@link ./use-auth.ts} para documentación de hooks de auth
 * @see {@link ./use-debounce.ts} para documentación de debounce
 * @see {@link ./use-mobile.ts} para documentación de responsive detection
 */

export { useAuth, usePermission, useRole, usePermissions, useAnyPermission, useAllPermissions, useIsAdmin } from './use-auth'
export { useDebounce } from './use-debounce'
export { useIsMobile } from './use-mobile'
