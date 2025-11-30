/**
 * Audit Event Listener - Unit Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuditEventListener } from '@/lib/events/listeners/audit-listener';
import { eventBus } from '@/lib/events/event-bus';
import { SystemEvent } from '@/lib/events/types';
import { auditService } from '@/lib/audit/audit-service';

// Mock audit service
vi.mock('@/lib/audit/audit-service', () => ({
  auditService: {
    log: vi.fn(),
  },
}));

describe('AuditEventListener', () => {
  let listener: AuditEventListener;

  beforeEach(() => {
    listener = new AuditEventListener();
    vi.clearAllMocks();
    // Limpiar todos los listeners del event bus
    eventBus.unsubscribeAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('register()', () => {
    it('should register all audit listeners', () => {
      const listenerCountBefore = eventBus.getListenerCount(SystemEvent.USER_LOGGED_IN);

      listener.register();

      const listenerCountAfter = eventBus.getListenerCount(SystemEvent.USER_LOGGED_IN);
      expect(listenerCountAfter).toBeGreaterThan(listenerCountBefore);
    });
  });

  describe('Auth Events', () => {
    beforeEach(() => {
      listener.register();
    });

    it('should audit USER_LOGGED_IN event', async () => {
      const mockLog = vi.mocked(auditService.log);

      await eventBus.dispatch(
        SystemEvent.USER_LOGGED_IN,
        {
          userId: 'user-1',
          email: 'test@example.com',
          sessionId: 'session-1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
        {
          requestId: 'req-1',
        }
      );

      // Wait for async listener
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'login',
          module: 'auth',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-1',
          metadata: expect.objectContaining({
            sessionId: 'session-1',
          }),
        })
      );
    });

    it('should audit USER_LOGGED_OUT event', async () => {
      const mockLog = vi.mocked(auditService.log);

      await eventBus.dispatch(SystemEvent.USER_LOGGED_OUT, {
        userId: 'user-1',
        sessionId: 'session-1',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'logout',
          module: 'auth',
        })
      );
    });

    it('should audit USER_REGISTERED event', async () => {
      const mockLog = vi.mocked(auditService.log);

      await eventBus.dispatch(SystemEvent.USER_REGISTERED, {
        userId: 'user-1',
        email: 'new@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'register',
          module: 'auth',
          entityType: 'User',
          entityId: 'user-1',
          newValues: expect.objectContaining({
            email: 'new@example.com',
            firstName: 'John',
            lastName: 'Doe',
          }),
        })
      );
    });

    it('should audit PASSWORD_RESET_REQUESTED event', async () => {
      const mockLog = vi.mocked(auditService.log);
      const expiresAt = new Date('2025-12-01');

      await eventBus.dispatch(SystemEvent.PASSWORD_RESET_REQUESTED, {
        userId: 'user-1',
        email: 'test@example.com',
        token: 'token-123',
        expiresAt,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'password_reset_request',
          module: 'auth',
          entityType: 'User',
          entityId: 'user-1',
        })
      );
    });

    it('should audit PASSWORD_CHANGED event', async () => {
      const mockLog = vi.mocked(auditService.log);

      await eventBus.dispatch(SystemEvent.PASSWORD_CHANGED, {
        userId: 'user-1',
        email: 'test@example.com',
        changedBy: 'self',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'password_change',
          module: 'auth',
          entityType: 'User',
          entityId: 'user-1',
          metadata: expect.objectContaining({
            changedBy: 'self',
          }),
        })
      );
    });
  });

  describe('User Events', () => {
    beforeEach(() => {
      listener.register();
    });

    it('should audit USER_CREATED event', async () => {
      const mockLog = vi.mocked(auditService.log);

      await eventBus.dispatch(
        SystemEvent.USER_CREATED,
        {
          userId: 'user-2',
          email: 'created@example.com',
          name: 'Created User',
          createdBy: 'admin-1',
        },
        {
          userId: 'admin-1',
          requestId: 'req-2',
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'create',
          module: 'users',
          entityType: 'User',
          entityId: 'user-2',
          requestId: 'req-2',
        })
      );
    });

    it('should audit USER_UPDATED event', async () => {
      const mockLog = vi.mocked(auditService.log);

      await eventBus.dispatch(SystemEvent.USER_UPDATED, {
        userId: 'user-1',
        oldValues: { email: 'old@example.com' },
        newValues: { email: 'new@example.com' },
        updatedBy: 'admin-1',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'update',
          module: 'users',
          entityType: 'User',
          entityId: 'user-1',
          oldValues: expect.objectContaining({ email: 'old@example.com' }),
          newValues: expect.objectContaining({ email: 'new@example.com' }),
        })
      );
    });

    it('should audit USER_DELETED event', async () => {
      const mockLog = vi.mocked(auditService.log);

      await eventBus.dispatch(SystemEvent.USER_DELETED, {
        userId: 'user-1',
        email: 'deleted@example.com',
        deletedBy: 'admin-1',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'delete',
          module: 'users',
          entityType: 'User',
          entityId: 'user-1',
        })
      );
    });
  });

  describe('Role Events', () => {
    beforeEach(() => {
      listener.register();
    });

    it('should audit USER_ROLE_ASSIGNED event', async () => {
      const mockLog = vi.mocked(auditService.log);

      await eventBus.dispatch(SystemEvent.USER_ROLE_ASSIGNED, {
        userId: 'user-1',
        roleId: 'role-1',
        roleName: 'Admin',
        assignedBy: 'admin-1',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'role_assign',
          module: 'roles',
          entityType: 'UserRole',
        })
      );
    });

    it('should audit ROLE_CREATED event', async () => {
      const mockLog = vi.mocked(auditService.log);

      await eventBus.dispatch(SystemEvent.ROLE_CREATED, {
        roleId: 'role-1',
        name: 'Editor',
        description: 'Can edit content',
        createdBy: 'admin-1',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'create',
          module: 'roles',
          entityType: 'Role',
          entityId: 'role-1',
        })
      );
    });

    it('should audit ROLE_PERMISSION_ASSIGNED event', async () => {
      const mockLog = vi.mocked(auditService.log);

      await eventBus.dispatch(SystemEvent.ROLE_PERMISSION_ASSIGNED, {
        roleId: 'role-1',
        roleName: 'Admin',
        permissionId: 'user:create',
        permissionName: 'Create Users',
        assignedBy: 'admin-1',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'permission_assign',
          module: 'roles',
          entityType: 'RolePermission',
        })
      );
    });
  });

  describe('Permission Events', () => {
    beforeEach(() => {
      listener.register();
    });

    it('should audit PERMISSION_CREATED event', async () => {
      const mockLog = vi.mocked(auditService.log);

      await eventBus.dispatch(SystemEvent.PERMISSION_CREATED, {
        permissionId: 'user:delete',
        name: 'Delete Users',
        description: 'Can delete users',
        createdBy: 'admin-1',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'create',
          module: 'permissions',
          entityType: 'Permission',
          entityId: 'user:delete',
        })
      );
    });
  });

  describe('Session Events', () => {
    beforeEach(() => {
      listener.register();
    });

    it('should audit SESSION_EXPIRED event', async () => {
      const mockLog = vi.mocked(auditService.log);
      const expiresAt = new Date('2025-12-01');

      await eventBus.dispatch(SystemEvent.SESSION_EXPIRED, {
        userId: 'user-1',
        sessionId: 'session-1',
        expiresAt,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'session_expire',
          module: 'auth',
        })
      );
    });

    it('should audit CONCURRENT_SESSION_DETECTED event', async () => {
      const mockLog = vi.mocked(auditService.log);

      await eventBus.dispatch(SystemEvent.CONCURRENT_SESSION_DETECTED, {
        userId: 'user-1',
        newSessionId: 'session-2',
        existingSessionId: 'session-1',
        ipAddress: '192.168.1.2',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'concurrent_session',
          module: 'auth',
        })
      );
    });
  });
});
