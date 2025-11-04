/**
 * Utilidades de servidor
 * Aurora Nova
 */

export {
  requireAuth,
  getCurrentUserId,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireAdmin,
  withPermission,
  withAuth,
  withAdmin,
  PermissionDeniedError,
  UnauthenticatedError,
} from "./require-permission"
