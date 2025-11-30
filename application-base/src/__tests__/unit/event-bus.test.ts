/**
 * Event Bus - Unit Tests
 *
 * Tests para el sistema de eventos event-driven.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eventBus } from '@/lib/events/event-bus';
import { SystemEvent } from '@/lib/events/types';
import type { BaseEvent } from '@/lib/events/types';

describe('EventBus', () => {
  beforeEach(() => {
    // Limpiar todos los listeners antes de cada test
    eventBus.unsubscribeAll();
  });

  afterEach(() => {
    // Limpiar después de cada test
    eventBus.unsubscribeAll();
  });

  describe('dispatch', () => {
    it('should dispatch events successfully', async () => {
      const mockListener = vi.fn();

      eventBus.subscribe(SystemEvent.USER_LOGGED_IN, mockListener);

      await eventBus.dispatch(
        SystemEvent.USER_LOGGED_IN,
        {
          userId: 'user-123',
          email: 'test@example.com',
          sessionId: 'session-456',
          ipAddress: '192.168.1.1',
          userAgent: 'Test Agent',
        },
        {
          requestId: 'req-789',
          userId: 'user-123',
        }
      );

      // Esperar a que el listener se ejecute (asíncrono)
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          event: SystemEvent.USER_LOGGED_IN,
          payload: {
            userId: 'user-123',
            email: 'test@example.com',
            sessionId: 'session-456',
            ipAddress: '192.168.1.1',
            userAgent: 'Test Agent',
          },
          metadata: expect.objectContaining({
            requestId: 'req-789',
            userId: 'user-123',
            timestamp: expect.any(Date),
          }),
        })
      );
    });

    it('should dispatch events with minimal metadata', async () => {
      const mockListener = vi.fn();

      eventBus.subscribe(SystemEvent.USER_CREATED, mockListener);

      await eventBus.dispatch(SystemEvent.USER_CREATED, {
        userId: 'user-456',
        email: 'new@example.com',
        name: 'New User',
        createdBy: 'admin-123',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockListener).toHaveBeenCalledTimes(1);
      const callArg = mockListener.mock.calls[0][0] as BaseEvent<SystemEvent.USER_CREATED>;
      expect(callArg.metadata.timestamp).toBeInstanceOf(Date);
      expect(callArg.metadata.requestId).toBeUndefined();
      expect(callArg.metadata.userId).toBeUndefined();
    });
  });

  describe('subscribe', () => {
    it('should allow multiple listeners for the same event', async () => {
      const mockListener1 = vi.fn();
      const mockListener2 = vi.fn();

      eventBus.subscribe(SystemEvent.USER_LOGGED_IN, mockListener1);
      eventBus.subscribe(SystemEvent.USER_LOGGED_IN, mockListener2);

      await eventBus.dispatch(SystemEvent.USER_LOGGED_IN, {
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Agent',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockListener1).toHaveBeenCalledTimes(1);
      expect(mockListener2).toHaveBeenCalledTimes(1);
    });

    it('should handle async listeners', async () => {
      const mockListener = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      });

      eventBus.subscribe(SystemEvent.USER_CREATED, mockListener);

      await eventBus.dispatch(SystemEvent.USER_CREATED, {
        userId: 'user-789',
        email: 'async@example.com',
        name: 'Async User',
        createdBy: 'admin-123',
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(mockListener).toHaveBeenCalledTimes(1);
    });

    it('should catch errors in listeners without breaking other listeners', async () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const successListener = vi.fn();

      eventBus.subscribe(SystemEvent.USER_UPDATED, errorListener);
      eventBus.subscribe(SystemEvent.USER_UPDATED, successListener);

      await eventBus.dispatch(SystemEvent.USER_UPDATED, {
        userId: 'user-123',
        oldValues: { name: 'Old' },
        newValues: { name: 'New' },
        updatedBy: 'admin-123',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(successListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribeAll', () => {
    it('should receive all events', async () => {
      const wildcardListener = vi.fn();

      eventBus.subscribeAll(wildcardListener);

      await eventBus.dispatch(SystemEvent.USER_LOGGED_IN, {
        userId: 'user-1',
        email: 'test1@example.com',
        sessionId: 'session-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Test',
      });

      await eventBus.dispatch(SystemEvent.USER_CREATED, {
        userId: 'user-2',
        email: 'test2@example.com',
        name: 'User 2',
        createdBy: 'admin-123',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(wildcardListener).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in wildcard listener', async () => {
      const errorWildcard = vi.fn(() => {
        throw new Error('Wildcard error');
      });

      eventBus.subscribeAll(errorWildcard);

      await eventBus.dispatch(SystemEvent.ROLE_CREATED, {
        roleId: 'role-123',
        name: 'Admin',
        description: 'Admin role',
        createdBy: 'system',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorWildcard).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribe', () => {
    it('should remove specific listener', async () => {
      const mockListener = vi.fn();

      eventBus.subscribe(SystemEvent.USER_DELETED, mockListener);

      // Dispatch first time
      await eventBus.dispatch(SystemEvent.USER_DELETED, {
        userId: 'user-123',
        email: 'deleted@example.com',
        deletedBy: 'admin-123',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockListener).toHaveBeenCalledTimes(1);

      // Unsubscribe
      eventBus.unsubscribe(SystemEvent.USER_DELETED, mockListener);

      // Dispatch second time
      await eventBus.dispatch(SystemEvent.USER_DELETED, {
        userId: 'user-456',
        email: 'deleted2@example.com',
        deletedBy: 'admin-123',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should still be 1 (not 2)
      expect(mockListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribeAll', () => {
    it('should remove all listeners for specific event', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const otherListener = vi.fn();

      eventBus.subscribe(SystemEvent.ROLE_UPDATED, listener1);
      eventBus.subscribe(SystemEvent.ROLE_UPDATED, listener2);
      eventBus.subscribe(SystemEvent.ROLE_CREATED, otherListener);

      // Remove all for ROLE_UPDATED
      eventBus.unsubscribeAll(SystemEvent.ROLE_UPDATED);

      await eventBus.dispatch(SystemEvent.ROLE_UPDATED, {
        roleId: 'role-123',
        oldValues: {},
        newValues: {},
        updatedBy: 'admin',
      });

      await eventBus.dispatch(SystemEvent.ROLE_CREATED, {
        roleId: 'role-456',
        name: 'New Role',
        description: null,
        createdBy: 'admin',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
      expect(otherListener).toHaveBeenCalledTimes(1);
    });

    it('should remove all listeners for all events', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      eventBus.subscribe(SystemEvent.PERMISSION_CREATED, listener1);
      eventBus.subscribe(SystemEvent.PERMISSION_DELETED, listener2);

      // Remove all listeners
      eventBus.unsubscribeAll();

      await eventBus.dispatch(SystemEvent.PERMISSION_CREATED, {
        permissionId: 'perm-123',
        name: 'read',
        description: 'Read permission',
        createdBy: 'admin',
      });

      await eventBus.dispatch(SystemEvent.PERMISSION_DELETED, {
        permissionId: 'perm-456',
        name: 'write',
        deletedBy: 'admin',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('getListenerCount', () => {
    it('should return correct listener count', () => {
      expect(eventBus.getListenerCount(SystemEvent.SESSION_EXPIRED)).toBe(0);

      const listener1 = vi.fn();
      const listener2 = vi.fn();

      eventBus.subscribe(SystemEvent.SESSION_EXPIRED, listener1);
      expect(eventBus.getListenerCount(SystemEvent.SESSION_EXPIRED)).toBe(1);

      eventBus.subscribe(SystemEvent.SESSION_EXPIRED, listener2);
      expect(eventBus.getListenerCount(SystemEvent.SESSION_EXPIRED)).toBe(2);

      eventBus.unsubscribe(SystemEvent.SESSION_EXPIRED, listener1);
      expect(eventBus.getListenerCount(SystemEvent.SESSION_EXPIRED)).toBe(1);
    });
  });
});
