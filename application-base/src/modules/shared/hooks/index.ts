/**
 * Re-exports de hooks compartidos
 * Importa desde aquí en lugar de desde archivos individuales
 */

export { useAuth, usePermission, useRole, usePermissions, useAnyPermission, useAllPermissions, useIsAdmin } from './use-auth'
export { useDebounce } from './use-debounce'
export { useIsMobile } from './use-mobile'
