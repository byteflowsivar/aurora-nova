/**
 * Audit Helpers - Unit Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getAuditContext,
  auditOperation,
  auditEntityChange,
} from '@/modules/admin/services/helpers';
import { auditService } from '@/modules/admin/services/audit-service';

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

// Mock audit service
vi.mock('@/lib/audit/audit-service', () => ({
  auditService: {
    log: vi.fn(),
  },
}));

// Mock uuid
vi.mock('uuid', () => ({
  v7: vi.fn(() => 'mock-uuid-v7'),
}));

describe('Audit Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAuditContext()', () => {
    it('should extract context from headers successfully', async () => {
      const { headers } = await import('next/headers');
      const mockHeaders = new Map([
        ['x-forwarded-for', '192.168.1.1, 10.0.0.1'],
        ['user-agent', 'Mozilla/5.0'],
        ['x-request-id', 'existing-req-id'],
      ]);

      vi.mocked(headers).mockResolvedValue({
        get: (key: string) => mockHeaders.get(key) || null,
      } as any);

      const context = await getAuditContext('user-123');

      expect(context).toEqual({
        userId: 'user-123',
        ipAddress: '192.168.1.1', // First IP from x-forwarded-for
        userAgent: 'Mozilla/5.0',
        requestId: 'existing-req-id',
      });
    });

    it('should fallback to x-real-ip if x-forwarded-for is not present', async () => {
      const { headers } = await import('next/headers');
      const mockHeaders = new Map([
        ['x-real-ip', '10.0.0.5'],
        ['user-agent', 'Mozilla/5.0'],
      ]);

      vi.mocked(headers).mockResolvedValue({
        get: (key: string) => mockHeaders.get(key) || null,
      } as any);

      const context = await getAuditContext();

      expect(context.ipAddress).toBe('10.0.0.5');
    });

    it('should generate requestId if not present in headers', async () => {
      const { headers } = await import('next/headers');
      const mockHeaders = new Map([
        ['user-agent', 'Mozilla/5.0'],
      ]);

      vi.mocked(headers).mockResolvedValue({
        get: (key: string) => mockHeaders.get(key) || null,
      } as any);

      const context = await getAuditContext();

      expect(context.requestId).toBe('mock-uuid-v7');
    });

    it('should handle missing headers gracefully', async () => {
      const { headers } = await import('next/headers');
      const mockHeaders = new Map();

      vi.mocked(headers).mockResolvedValue({
        get: (key: string) => mockHeaders.get(key) || null,
      } as any);

      const context = await getAuditContext('user-123');

      expect(context).toEqual({
        userId: 'user-123',
        ipAddress: undefined,
        userAgent: undefined,
        requestId: 'mock-uuid-v7',
      });
    });

    it('should handle headers() error and return defaults', async () => {
      const { headers } = await import('next/headers');
      vi.mocked(headers).mockRejectedValue(new Error('Not in request context'));

      const context = await getAuditContext('user-123');

      expect(context).toEqual({
        userId: 'user-123',
        requestId: 'mock-uuid-v7',
      });
    });

    it('should work without userId', async () => {
      const { headers } = await import('next/headers');
      const mockHeaders = new Map([
        ['x-forwarded-for', '192.168.1.1'],
        ['user-agent', 'Mozilla/5.0'],
      ]);

      vi.mocked(headers).mockResolvedValue({
        get: (key: string) => mockHeaders.get(key) || null,
      } as any);

      const context = await getAuditContext();

      expect(context.userId).toBeUndefined();
      expect(context.ipAddress).toBe('192.168.1.1');
    });
  });

  describe('auditOperation()', () => {
    it('should execute operation and create audit log on success', async () => {
      const mockOperation = vi.fn(async () => {
        return { success: true, data: 'test result' };
      });

      const mockLog = vi.mocked(auditService.log);

      const result = await auditOperation(
        {
          userId: 'user-1',
          action: 'test_action',
          module: 'test',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-123',
        },
        mockOperation
      );

      expect(result).toEqual({ success: true, data: 'test result' });
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'test_action',
          module: 'test',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-123',
          metadata: expect.objectContaining({
            success: true,
            duration: expect.any(Number),
          }),
        })
      );
    });

    it('should auto-fetch context if not provided', async () => {
      const { headers } = await import('next/headers');
      const mockHeaders = new Map([
        ['x-forwarded-for', '10.0.0.1'],
        ['user-agent', 'TestAgent/1.0'],
        ['x-request-id', 'auto-req-id'],
      ]);

      vi.mocked(headers).mockResolvedValue({
        get: (key: string) => mockHeaders.get(key) || null,
      } as any);

      const mockOperation = vi.fn(async () => 'result');
      const mockLog = vi.mocked(auditService.log);

      await auditOperation(
        {
          userId: 'user-1',
          action: 'test',
          module: 'test',
        },
        mockOperation
      );

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '10.0.0.1',
          userAgent: 'TestAgent/1.0',
          requestId: 'auto-req-id',
        })
      );
    });

    it('should create audit log on operation failure', async () => {
      const { headers } = await import('next/headers');
      const mockHeaders = new Map([
        ['x-forwarded-for', '192.168.1.1'],
      ]);

      vi.mocked(headers).mockResolvedValue({
        get: (key: string) => mockHeaders.get(key) || null,
      } as any);

      const testError = new Error('Operation failed');
      const mockOperation = vi.fn(async () => {
        throw testError;
      });

      const mockLog = vi.mocked(auditService.log);

      await expect(
        auditOperation(
          {
            userId: 'user-1',
            action: 'failing_action',
            module: 'test',
            requestId: 'req-fail',
          },
          mockOperation
        )
      ).rejects.toThrow('Operation failed');

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'failing_action',
          module: 'test',
          requestId: 'req-fail',
          metadata: expect.objectContaining({
            success: false,
            error: 'Operation failed',
            duration: expect.any(Number),
          }),
        })
      );
    });

    it('should include entity information in audit log', async () => {
      const mockOperation = vi.fn(async () => 'success');
      const mockLog = vi.mocked(auditService.log);

      await auditOperation(
        {
          userId: 'user-1',
          action: 'update',
          module: 'users',
          entityType: 'User',
          entityId: 'user-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-123',
        },
        mockOperation
      );

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'User',
          entityId: 'user-123',
        })
      );
    });

    it('should preserve custom metadata', async () => {
      const mockOperation = vi.fn(async () => 'success');
      const mockLog = vi.mocked(auditService.log);

      await auditOperation(
        {
          userId: 'user-1',
          action: 'export',
          module: 'reports',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-123',
          metadata: {
            format: 'xlsx',
            filters: { startDate: '2025-01-01' },
          },
        },
        mockOperation
      );

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            format: 'xlsx',
            filters: { startDate: '2025-01-01' },
            success: true,
            duration: expect.any(Number),
          }),
        })
      );
    });

    it('should measure operation duration', async () => {
      const mockOperation = vi.fn(async () => {
        // Simulate async operation with delay
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'result';
      });

      const mockLog = vi.mocked(auditService.log);

      await auditOperation(
        {
          userId: 'user-1',
          action: 'slow_operation',
          module: 'test',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-123',
        },
        mockOperation
      );

      const logCall = mockLog.mock.calls[0][0];
      expect(logCall.metadata).toHaveProperty('duration');
      expect(logCall.metadata?.duration).toBeGreaterThanOrEqual(10);
    });
  });

  describe('auditEntityChange()', () => {
    it('should create audit log with old and new values', async () => {
      const { headers } = await import('next/headers');
      const mockHeaders = new Map([
        ['x-forwarded-for', '192.168.1.1'],
        ['user-agent', 'Mozilla/5.0'],
      ]);

      vi.mocked(headers).mockResolvedValue({
        get: (key: string) => mockHeaders.get(key) || null,
      } as any);

      const mockLog = vi.mocked(auditService.log);

      await auditEntityChange(
        {
          userId: 'user-1',
          action: 'update',
          module: 'users',
          entityType: 'User',
          entityId: 'user-123',
        },
        { email: 'old@example.com', name: 'Old Name' },
        { email: 'new@example.com', name: 'New Name' }
      );

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'update',
          module: 'users',
          entityType: 'User',
          entityId: 'user-123',
          oldValues: { email: 'old@example.com', name: 'Old Name' },
          newValues: { email: 'new@example.com', name: 'New Name' },
        })
      );
    });

    it('should auto-fetch context if not provided', async () => {
      const { headers } = await import('next/headers');
      const mockHeaders = new Map([
        ['x-forwarded-for', '10.0.0.1'],
        ['user-agent', 'TestAgent/1.0'],
        ['x-request-id', 'auto-req-id'],
      ]);

      vi.mocked(headers).mockResolvedValue({
        get: (key: string) => mockHeaders.get(key) || null,
      } as any);

      const mockLog = vi.mocked(auditService.log);

      await auditEntityChange(
        {
          userId: 'user-1',
          action: 'update',
          module: 'users',
          entityType: 'User',
          entityId: 'user-123',
        },
        { status: 'active' },
        { status: 'inactive' }
      );

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '10.0.0.1',
          userAgent: 'TestAgent/1.0',
          requestId: 'auto-req-id',
        })
      );
    });

    it('should support custom metadata', async () => {
      const { headers } = await import('next/headers');
      const mockHeaders = new Map();

      vi.mocked(headers).mockResolvedValue({
        get: (key: string) => mockHeaders.get(key) || null,
      } as any);

      const mockLog = vi.mocked(auditService.log);

      await auditEntityChange(
        {
          userId: 'user-1',
          action: 'update',
          module: 'users',
          entityType: 'User',
          entityId: 'user-123',
          metadata: {
            reason: 'User requested change',
            approvedBy: 'admin-1',
          },
        },
        { role: 'user' },
        { role: 'admin' }
      );

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            reason: 'User requested change',
            approvedBy: 'admin-1',
          },
        })
      );
    });

    it('should use provided context over auto-fetch', async () => {
      const mockLog = vi.mocked(auditService.log);

      await auditEntityChange(
        {
          userId: 'user-1',
          action: 'update',
          module: 'users',
          entityType: 'User',
          entityId: 'user-123',
          ipAddress: '1.2.3.4',
          userAgent: 'CustomAgent',
          requestId: 'custom-req-id',
        },
        { field: 'old' },
        { field: 'new' }
      );

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '1.2.3.4',
          userAgent: 'CustomAgent',
          requestId: 'custom-req-id',
        })
      );
    });
  });
});
