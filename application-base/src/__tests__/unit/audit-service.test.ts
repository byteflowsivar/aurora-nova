/**
 * Audit Service - Unit Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuditService } from '@/modules/admin/services/audit-service';
import { prisma } from '@/lib/prisma/connection';

// Mock Prisma
vi.mock('@/lib/prisma/connection', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    auditService = new AuditService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log()', () => {
    it('should create audit log successfully', async () => {
      const mockCreate = vi.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({
        id: 'uuid-123',
        userId: 'user-1',
        action: 'login',
        module: 'auth',
        entityType: null,
        entityId: null,
        oldValues: null,
        newValues: null,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        requestId: 'req-123',
        metadata: null,
        timestamp: new Date(),
      });

      await auditService.log({
        userId: 'user-1',
        action: 'login',
        module: 'auth',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        requestId: 'req-123',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'login',
          module: 'auth',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-123',
        }),
      });
    });

    it('should handle null userId for system actions', async () => {
      const mockCreate = vi.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({
        id: 'uuid-123',
        userId: null,
        action: 'cleanup',
        module: 'system',
        entityType: null,
        entityId: null,
        oldValues: null,
        newValues: null,
        ipAddress: null,
        userAgent: null,
        requestId: null,
        metadata: null,
        timestamp: new Date(),
      });

      await auditService.log({
        action: 'cleanup',
        module: 'system',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          action: 'cleanup',
          module: 'system',
        }),
      });
    });

    it('should handle oldValues and newValues', async () => {
      const mockCreate = vi.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({
        id: 'uuid-123',
        userId: 'user-1',
        action: 'update',
        module: 'users',
        entityType: 'User',
        entityId: 'user-2',
        oldValues: { email: 'old@example.com' },
        newValues: { email: 'new@example.com' },
        ipAddress: null,
        userAgent: null,
        requestId: null,
        metadata: null,
        timestamp: new Date(),
      });

      await auditService.log({
        userId: 'user-1',
        action: 'update',
        module: 'users',
        entityType: 'User',
        entityId: 'user-2',
        oldValues: { email: 'old@example.com' },
        newValues: { email: 'new@example.com' },
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          oldValues: { email: 'old@example.com' },
          newValues: { email: 'new@example.com' },
        }),
      });
    });

    it('should not throw on error (fail silently)', async () => {
      const mockCreate = vi.mocked(prisma.auditLog.create);
      mockCreate.mockRejectedValue(new Error('Database error'));

      await expect(
        auditService.log({
          action: 'test',
          module: 'test',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('getLogs()', () => {
    it('should retrieve logs with default pagination', async () => {
      const mockCount = vi.mocked(prisma.auditLog.count);
      const mockFindMany = vi.mocked(prisma.auditLog.findMany);

      mockCount.mockResolvedValue(100);
      mockFindMany.mockResolvedValue([
        {
          id: 'log-1',
          userId: 'user-1',
          action: 'login',
          module: 'auth',
          entityType: null,
          entityId: null,
          oldValues: null,
          newValues: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-1',
          metadata: null,
          timestamp: new Date(),
          user: {
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User',
          },
        },
      ]);

      const result = await auditService.getLogs();

      expect(result).toMatchObject({
        total: 100,
        count: 1,
        limit: 50,
        offset: 0,
        hasMore: true,
      });
      expect(result.logs).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
          orderBy: { timestamp: 'desc' },
        })
      );
    });

    it('should apply userId filter', async () => {
      const mockCount = vi.mocked(prisma.auditLog.count);
      const mockFindMany = vi.mocked(prisma.auditLog.findMany);

      mockCount.mockResolvedValue(10);
      mockFindMany.mockResolvedValue([]);

      await auditService.getLogs({ userId: 'user-123' });

      expect(mockCount).toHaveBeenCalledWith({
        where: expect.objectContaining({ userId: 'user-123' }),
      });
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-123' }),
        })
      );
    });

    it('should apply multiple filters', async () => {
      const mockCount = vi.mocked(prisma.auditLog.count);
      const mockFindMany = vi.mocked(prisma.auditLog.findMany);

      mockCount.mockResolvedValue(5);
      mockFindMany.mockResolvedValue([]);

      await auditService.getLogs({
        userId: 'user-123',
        module: 'users',
        action: 'update',
        entityType: 'User',
      });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            module: 'users',
            action: 'update',
            entityType: 'User',
          }),
        })
      );
    });

    it('should apply date range filter', async () => {
      const mockCount = vi.mocked(prisma.auditLog.count);
      const mockFindMany = vi.mocked(prisma.auditLog.findMany);

      mockCount.mockResolvedValue(15);
      mockFindMany.mockResolvedValue([]);

      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-30');

      await auditService.getLogs({ startDate, endDate });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });

    it('should handle custom pagination', async () => {
      const mockCount = vi.mocked(prisma.auditLog.count);
      const mockFindMany = vi.mocked(prisma.auditLog.findMany);

      mockCount.mockResolvedValue(100);
      mockFindMany.mockResolvedValue([]);

      await auditService.getLogs({ limit: 20, offset: 40 });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 40,
        })
      );
    });

    it('should return empty result on error', async () => {
      const mockCount = vi.mocked(prisma.auditLog.count);
      mockCount.mockRejectedValue(new Error('Database error'));

      const result = await auditService.getLogs();

      expect(result).toMatchObject({
        logs: [],
        total: 0,
        count: 0,
        hasMore: false,
      });
    });
  });

  describe('getEntityLogs()', () => {
    it('should retrieve logs for specific entity', async () => {
      const mockCount = vi.mocked(prisma.auditLog.count);
      const mockFindMany = vi.mocked(prisma.auditLog.findMany);

      mockCount.mockResolvedValue(5);
      mockFindMany.mockResolvedValue([
        {
          id: 'log-1',
          userId: 'user-1',
          action: 'update',
          module: 'users',
          entityType: 'User',
          entityId: 'user-123',
          oldValues: { email: 'old@example.com' },
          newValues: { email: 'new@example.com' },
          ipAddress: null,
          userAgent: null,
          requestId: null,
          metadata: null,
          timestamp: new Date(),
          user: {
            id: 'user-1',
            email: 'admin@example.com',
            name: 'Admin',
          },
        },
      ]);

      const logs = await auditService.getEntityLogs('User', 'user-123');

      expect(logs).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'User',
            entityId: 'user-123',
          }),
        })
      );
    });
  });

  describe('getRequestLogs()', () => {
    it('should retrieve logs for specific request', async () => {
      const mockCount = vi.mocked(prisma.auditLog.count);
      const mockFindMany = vi.mocked(prisma.auditLog.findMany);

      mockCount.mockResolvedValue(3);
      mockFindMany.mockResolvedValue([]);

      await auditService.getRequestLogs('req-123');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            requestId: 'req-123',
          }),
          take: 100,
        })
      );
    });
  });

  describe('getStats()', () => {
    it('should return audit statistics', async () => {
      const mockCount = vi.mocked(prisma.auditLog.count);
      const mockGroupBy = vi.mocked(prisma.auditLog.groupBy);
      const mockUserFindMany = vi.mocked(prisma.user.findMany);

      mockCount.mockResolvedValue(150);

      // Mock action breakdown
      mockGroupBy
        .mockResolvedValueOnce([
          { action: 'login', _count: { action: 80 } },
          { action: 'update', _count: { action: 50 } },
          { action: 'delete', _count: { action: 20 } },
        ] as any)
        .mockResolvedValueOnce([
          { module: 'auth', _count: { module: 80 } },
          { module: 'users', _count: { module: 70 } },
        ] as any)
        .mockResolvedValueOnce([
          { userId: 'user-1', _count: { userId: 60 } },
          { userId: 'user-2', _count: { userId: 40 } },
        ] as any);

      mockUserFindMany.mockResolvedValue([
        { id: 'user-1', email: 'admin@example.com' },
        { id: 'user-2', email: 'user@example.com' },
      ] as any);

      const stats = await auditService.getStats();

      expect(stats).toMatchObject({
        totalLogs: 150,
        actionBreakdown: {
          login: 80,
          update: 50,
          delete: 20,
        },
        moduleBreakdown: {
          auth: 80,
          users: 70,
        },
      });
      expect(stats.topUsers).toHaveLength(2);
    });

    it('should apply date filters to stats', async () => {
      const mockCount = vi.mocked(prisma.auditLog.count);
      const mockGroupBy = vi.mocked(prisma.auditLog.groupBy);
      const mockUserFindMany = vi.mocked(prisma.user.findMany);

      mockCount.mockResolvedValue(50);
      mockGroupBy.mockResolvedValue([]);
      mockUserFindMany.mockResolvedValue([]);

      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-30');

      await auditService.getStats({ startDate, endDate });

      expect(mockCount).toHaveBeenCalledWith({
        where: expect.objectContaining({
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        }),
      });
    });
  });
});
