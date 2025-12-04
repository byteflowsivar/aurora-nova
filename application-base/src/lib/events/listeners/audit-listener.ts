/**
 * Audit Event Listener
 *
 * Escucha eventos del sistema y crea registros de auditoría automáticamente.
 *
 * @module events/listeners/audit-listener
 */

import { eventBus } from '../event-bus';
import { SystemEvent } from '../types';
import { auditService } from '@/modules/admin/services/audit-service';
import { structuredLogger } from '@/lib/logger/structured-logger';

/**
 * Listener para crear registros de auditoría basados en eventos del sistema
 *
 * Este listener se suscribe a todos los eventos relevantes y crea
 * registros de auditoría automáticamente, sin necesidad de código
 * manual en cada server action.
 */
export class AuditEventListener {
  /**
   * Registrar todos los listeners de auditoría
   */
  register() {
    // ========================================================================
    // AUTH EVENTS - Eventos de autenticación
    // ========================================================================

    // Login
    eventBus.subscribe(SystemEvent.USER_LOGGED_IN, async (event) => {
      await auditService.log({
        userId: event.payload.userId,
        action: 'login',
        module: 'auth',
        ipAddress: event.payload.ipAddress,
        userAgent: event.payload.userAgent,
        requestId: event.metadata.requestId,
        metadata: {
          sessionId: event.payload.sessionId,
        },
      });
    });

    // Logout
    eventBus.subscribe(SystemEvent.USER_LOGGED_OUT, async (event) => {
      await auditService.log({
        userId: event.payload.userId,
        action: 'logout',
        module: 'auth',
        requestId: event.metadata.requestId,
        metadata: {
          sessionId: event.payload.sessionId,
        },
      });
    });

    // User registered
    eventBus.subscribe(SystemEvent.USER_REGISTERED, async (event) => {
      await auditService.log({
        userId: event.payload.userId,
        action: 'register',
        module: 'auth',
        entityType: 'User',
        entityId: event.payload.userId,
        requestId: event.metadata.requestId,
        newValues: {
          email: event.payload.email,
          firstName: event.payload.firstName,
          lastName: event.payload.lastName,
        },
      });
    });

    // Password reset requested
    eventBus.subscribe(SystemEvent.PASSWORD_RESET_REQUESTED, async (event) => {
      await auditService.log({
        userId: event.payload.userId,
        action: 'password_reset_request',
        module: 'auth',
        entityType: 'User',
        entityId: event.payload.userId,
        requestId: event.metadata.requestId,
        metadata: {
          expiresAt: event.payload.expiresAt.toISOString(),
        },
      });
    });

    // Password changed
    eventBus.subscribe(SystemEvent.PASSWORD_CHANGED, async (event) => {
      await auditService.log({
        userId: event.payload.userId,
        action: 'password_change',
        module: 'auth',
        entityType: 'User',
        entityId: event.payload.userId,
        requestId: event.metadata.requestId,
        metadata: {
          changedBy: event.payload.changedBy,
        },
      });
    });

    // ========================================================================
    // USER EVENTS - Eventos de gestión de usuarios
    // ========================================================================

    // User created (by admin)
    eventBus.subscribe(SystemEvent.USER_CREATED, async (event) => {
      await auditService.log({
        userId: event.metadata.userId, // Admin que creó
        action: 'create',
        module: 'users',
        entityType: 'User',
        entityId: event.payload.userId,
        requestId: event.metadata.requestId,
        newValues: {
          email: event.payload.email,
          name: event.payload.name,
        },
      });
    });

    // User updated
    eventBus.subscribe(SystemEvent.USER_UPDATED, async (event) => {
      await auditService.log({
        userId: event.payload.updatedBy,
        action: 'update',
        module: 'users',
        entityType: 'User',
        entityId: event.payload.userId,
        requestId: event.metadata.requestId,
        oldValues: event.payload.oldValues,
        newValues: event.payload.newValues,
      });
    });

    // User deleted
    eventBus.subscribe(SystemEvent.USER_DELETED, async (event) => {
      await auditService.log({
        userId: event.payload.deletedBy,
        action: 'delete',
        module: 'users',
        entityType: 'User',
        entityId: event.payload.userId,
        requestId: event.metadata.requestId,
        oldValues: {
          email: event.payload.email,
        },
      });
    });

    // ========================================================================
    // ROLE EVENTS - Eventos de gestión de roles
    // ========================================================================

    // User role assigned
    eventBus.subscribe(SystemEvent.USER_ROLE_ASSIGNED, async (event) => {
      await auditService.log({
        userId: event.payload.assignedBy,
        action: 'role_assign',
        module: 'roles',
        entityType: 'UserRole',
        entityId: `${event.payload.userId}-${event.payload.roleId}`,
        requestId: event.metadata.requestId,
        newValues: {
          userId: event.payload.userId,
          roleId: event.payload.roleId,
          roleName: event.payload.roleName,
        },
      });
    });

    // User role removed
    eventBus.subscribe(SystemEvent.USER_ROLE_REMOVED, async (event) => {
      await auditService.log({
        userId: event.payload.removedBy,
        action: 'role_remove',
        module: 'roles',
        entityType: 'UserRole',
        entityId: `${event.payload.userId}-${event.payload.roleId}`,
        requestId: event.metadata.requestId,
        oldValues: {
          userId: event.payload.userId,
          roleId: event.payload.roleId,
          roleName: event.payload.roleName,
        },
      });
    });

    // Role created
    eventBus.subscribe(SystemEvent.ROLE_CREATED, async (event) => {
      await auditService.log({
        userId: event.payload.createdBy,
        action: 'create',
        module: 'roles',
        entityType: 'Role',
        entityId: event.payload.roleId,
        requestId: event.metadata.requestId,
        newValues: {
          name: event.payload.name,
          description: event.payload.description,
        },
      });
    });

    // Role updated
    eventBus.subscribe(SystemEvent.ROLE_UPDATED, async (event) => {
      await auditService.log({
        userId: event.payload.updatedBy,
        action: 'update',
        module: 'roles',
        entityType: 'Role',
        entityId: event.payload.roleId,
        requestId: event.metadata.requestId,
        oldValues: event.payload.oldValues,
        newValues: event.payload.newValues,
      });
    });

    // Role deleted
    eventBus.subscribe(SystemEvent.ROLE_DELETED, async (event) => {
      await auditService.log({
        userId: event.payload.deletedBy,
        action: 'delete',
        module: 'roles',
        entityType: 'Role',
        entityId: event.payload.roleId,
        requestId: event.metadata.requestId,
        oldValues: {
          name: event.payload.name,
        },
      });
    });

    // Role permission assigned
    eventBus.subscribe(SystemEvent.ROLE_PERMISSION_ASSIGNED, async (event) => {
      await auditService.log({
        userId: event.payload.assignedBy,
        action: 'permission_assign',
        module: 'roles',
        entityType: 'RolePermission',
        entityId: `${event.payload.roleId}-${event.payload.permissionId}`,
        requestId: event.metadata.requestId,
        newValues: {
          roleId: event.payload.roleId,
          roleName: event.payload.roleName,
          permissionId: event.payload.permissionId,
          permissionName: event.payload.permissionName,
        },
      });
    });

    // Role permission removed
    eventBus.subscribe(SystemEvent.ROLE_PERMISSION_REMOVED, async (event) => {
      await auditService.log({
        userId: event.payload.removedBy,
        action: 'permission_remove',
        module: 'roles',
        entityType: 'RolePermission',
        entityId: `${event.payload.roleId}-${event.payload.permissionId}`,
        requestId: event.metadata.requestId,
        oldValues: {
          roleId: event.payload.roleId,
          roleName: event.payload.roleName,
          permissionId: event.payload.permissionId,
          permissionName: event.payload.permissionName,
        },
      });
    });

    // ========================================================================
    // PERMISSION EVENTS - Eventos de gestión de permisos
    // ========================================================================

    // Permission created
    eventBus.subscribe(SystemEvent.PERMISSION_CREATED, async (event) => {
      await auditService.log({
        userId: event.payload.createdBy,
        action: 'create',
        module: 'permissions',
        entityType: 'Permission',
        entityId: event.payload.permissionId,
        requestId: event.metadata.requestId,
        newValues: {
          name: event.payload.name,
          description: event.payload.description,
        },
      });
    });

    // Permission updated
    eventBus.subscribe(SystemEvent.PERMISSION_UPDATED, async (event) => {
      await auditService.log({
        userId: event.payload.updatedBy,
        action: 'update',
        module: 'permissions',
        entityType: 'Permission',
        entityId: event.payload.permissionId,
        requestId: event.metadata.requestId,
        oldValues: event.payload.oldValues,
        newValues: event.payload.newValues,
      });
    });

    // Permission deleted
    eventBus.subscribe(SystemEvent.PERMISSION_DELETED, async (event) => {
      await auditService.log({
        userId: event.payload.deletedBy,
        action: 'delete',
        module: 'permissions',
        entityType: 'Permission',
        entityId: event.payload.permissionId,
        requestId: event.metadata.requestId,
        oldValues: {
          name: event.payload.name,
        },
      });
    });

    // ========================================================================
    // SESSION EVENTS - Eventos de sesiones
    // ========================================================================

    // Session expired
    eventBus.subscribe(SystemEvent.SESSION_EXPIRED, async (event) => {
      await auditService.log({
        userId: event.payload.userId,
        action: 'session_expire',
        module: 'auth',
        requestId: event.metadata.requestId,
        metadata: {
          sessionId: event.payload.sessionId,
          expiresAt: event.payload.expiresAt.toISOString(),
        },
      });
    });

    // Concurrent session detected
    eventBus.subscribe(SystemEvent.CONCURRENT_SESSION_DETECTED, async (event) => {
      await auditService.log({
        userId: event.payload.userId,
        action: 'concurrent_session',
        module: 'auth',
        requestId: event.metadata.requestId,
        metadata: {
          newSessionId: event.payload.newSessionId,
          existingSessionId: event.payload.existingSessionId,
          ipAddress: event.payload.ipAddress,
        },
      });
    });

    structuredLogger.info('Audit event listeners registered', {
      module: 'events',
      action: 'register_audit_listeners',
      metadata: {
        totalListeners: 18,
        categories: ['auth', 'users', 'roles', 'permissions', 'sessions'],
      },
    });
  }
}
