/**
 * Constantes de Rutas de API
 * Aurora Nova - API Endpoints
 *
 * Centraliza todas las rutas de API para facilitar mantenimiento y evitar
 * inconsistencias cuando se reorganizan endpoints.
 */

export const API_ROUTES = {
  // ============================================================================
  // APIs Públicas (sin autenticación)
  // ============================================================================
  HEALTH: '/api/public/health',

  // ============================================================================
  // APIs de Autenticación (mantienen ubicación original por convención NextAuth)
  // ============================================================================
  AUTH_NEXTAUTH: '/api/auth',
  AUTH_VALIDATE_TOKEN: '/api/auth/validate-reset-token',
  AUTH_RESET_PASSWORD: '/api/auth/reset-password',

  // ============================================================================
  // APIs de Customer (usuario autenticado)
  // ============================================================================
  CUSTOMER_MENU: '/api/customer/menu',
  CUSTOMER_PROFILE: '/api/customer/profile',
  CUSTOMER_CHANGE_PASSWORD: '/api/customer/change-password',

  // ============================================================================
  // APIs de Administración (requieren permisos)
  // ============================================================================

  // Menú (admin)
  ADMIN_MENU: '/api/admin/menu',
  ADMIN_MENU_ITEM: (id: string) => `/api/admin/menu/${id}`,
  ADMIN_MENU_REORDER: '/api/admin/menu/reorder',

  // Usuarios
  ADMIN_USERS: '/api/admin/users',
  ADMIN_USER: (id: string) => `/api/admin/users/${id}`,
  ADMIN_USER_ROLES: (id: string) => `/api/admin/users/${id}/roles`,
  ADMIN_USER_PERMISSIONS: (id: string) => `/api/admin/users/${id}/permissions`,

  // Roles
  ADMIN_ROLES: '/api/admin/roles',
  ADMIN_ROLE: (id: string) => `/api/admin/roles/${id}`,
  ADMIN_ROLE_PERMISSIONS: (id: string) => `/api/admin/roles/${id}/permissions`,

  // Permisos
  ADMIN_PERMISSIONS: '/api/admin/permissions',

  // Auditoría
  ADMIN_AUDIT: '/api/admin/audit',
} as const
