/**
 * Audit API Endpoint - Integration Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GET } from '@/app/api/audit/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/utils/permission-utils', () => ({
  hasPermission: vi.fn(),
}));

vi.mock('@/lib/audit/audit-service', () => ({
  auditService: {
    getLogs: vi.fn(),
  },
}));

describe('GET /api/audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      const { auth } = await import('@/lib/auth');
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/audit');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'No autorizado' });
    });

    it('should return 401 if session has no user', async () => {
      const { auth } = await import('@/lib/auth');
      vi.mocked(auth).mockResolvedValue({ user: null } as any);

      const request = new NextRequest('http://localhost:3000/api/audit');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'No autorizado' });
    });
  });

  describe('Authorization', () => {
    it('should return 403 if user lacks audit:view permission', async () => {
      const { auth } = await import('@/lib/auth');
      const { hasPermission } = await import('@/lib/utils/permission-utils');

      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', name: 'Test' },
      } as any);

      vi.mocked(hasPermission).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/audit');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Sin permisos para ver logs de auditoría',
      });

      expect(hasPermission).toHaveBeenCalledWith('user-1', 'audit:view');
    });
  });

  describe('Success Cases', () => {
    beforeEach(async () => {
      const { auth } = await import('@/lib/auth');
      const { hasPermission } = await import('@/lib/utils/permission-utils');

      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-1', email: 'admin@example.com', name: 'Admin' },
      } as any);

      vi.mocked(hasPermission).mockResolvedValue(true);
    });

    it('should return audit logs with default pagination', async () => {
      const { auditService } = await import('@/lib/audit/audit-service');

      const mockResult = {
        logs: [
          {
            id: 'log-1',
            userId: 'user-1',
            action: 'login',
            module: 'auth',
            timestamp: new Date('2025-11-30'),
            user: { id: 'user-1', email: 'test@example.com', name: 'Test' },
          },
        ],
        total: 100,
        count: 1,
        limit: 50,
        offset: 0,
        hasMore: true,
      };

      // Expect serialized result (dates become strings in JSON)
      const expectedResult = {
        ...mockResult,
        logs: mockResult.logs.map((log) => ({
          ...log,
          timestamp: log.timestamp.toISOString(),
        })),
      };

      vi.mocked(auditService.getLogs).mockResolvedValue(mockResult as any);

      const request = new NextRequest('http://localhost:3000/api/audit');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(expectedResult);

      expect(auditService.getLogs).toHaveBeenCalledWith({
        userId: undefined,
        module: undefined,
        action: undefined,
        entityType: undefined,
        entityId: undefined,
        requestId: undefined,
        startDate: undefined,
        endDate: undefined,
        limit: 50,
        offset: 0,
      });
    });

    it('should apply filters from query parameters', async () => {
      const { auditService } = await import('@/lib/audit/audit-service');

      vi.mocked(auditService.getLogs).mockResolvedValue({
        logs: [],
        total: 0,
        count: 0,
        limit: 20,
        offset: 10,
        hasMore: false,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/audit?userId=user-123&module=auth&action=login&limit=20&offset=10'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(auditService.getLogs).toHaveBeenCalledWith({
        userId: 'user-123',
        module: 'auth',
        action: 'login',
        entityType: undefined,
        entityId: undefined,
        requestId: undefined,
        startDate: undefined,
        endDate: undefined,
        limit: 20,
        offset: 10,
      });
    });

    it('should parse date filters correctly', async () => {
      const { auditService } = await import('@/lib/audit/audit-service');

      vi.mocked(auditService.getLogs).mockResolvedValue({
        logs: [],
        total: 0,
        count: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
      });

      const startDate = '2025-11-01T00:00:00Z';
      const endDate = '2025-11-30T23:59:59Z';

      const request = new NextRequest(
        `http://localhost:3000/api/audit?startDate=${startDate}&endDate=${endDate}`
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(auditService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        })
      );
    });

    it('should limit max results to 100', async () => {
      const { auditService } = await import('@/lib/audit/audit-service');

      vi.mocked(auditService.getLogs).mockResolvedValue({
        logs: [],
        total: 0,
        count: 0,
        limit: 100,
        offset: 0,
        hasMore: false,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/audit?limit=500'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(auditService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100, // Should be capped at 100
        })
      );
    });

    it('should apply entityType and entityId filters', async () => {
      const { auditService } = await import('@/lib/audit/audit-service');

      vi.mocked(auditService.getLogs).mockResolvedValue({
        logs: [],
        total: 0,
        count: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/audit?entityType=User&entityId=user-123'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(auditService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'User',
          entityId: 'user-123',
        })
      );
    });

    it('should apply requestId filter', async () => {
      const { auditService } = await import('@/lib/audit/audit-service');

      vi.mocked(auditService.getLogs).mockResolvedValue({
        logs: [],
        total: 0,
        count: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/audit?requestId=req-123'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(auditService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-123',
        })
      );
    });
  });

  describe('Validation Errors', () => {
    beforeEach(async () => {
      const { auth } = await import('@/lib/auth');
      const { hasPermission } = await import('@/lib/utils/permission-utils');

      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-1', email: 'admin@example.com', name: 'Admin' },
      } as any);

      vi.mocked(hasPermission).mockResolvedValue(true);
    });

    it('should return 400 for invalid startDate', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/audit?startDate=invalid-date'
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('startDate inválido');
    });

    it('should return 400 for invalid endDate', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/audit?endDate=not-a-date'
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('endDate inválido');
    });

    it('should return 400 for invalid limit', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/audit?limit=invalid'
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('limit debe ser un número positivo');
    });

    it('should return 400 for negative limit', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/audit?limit=-10'
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('limit debe ser un número positivo');
    });

    it('should return 400 for invalid offset', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/audit?offset=abc'
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('offset debe ser un número no negativo');
    });

    it('should return 400 for negative offset', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/audit?offset=-5'
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('offset debe ser un número no negativo');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      const { auth } = await import('@/lib/auth');
      const { hasPermission } = await import('@/lib/utils/permission-utils');

      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-1', email: 'admin@example.com', name: 'Admin' },
      } as any);

      vi.mocked(hasPermission).mockResolvedValue(true);
    });

    it('should return 500 on service error', async () => {
      const { auditService } = await import('@/lib/audit/audit-service');

      vi.mocked(auditService.getLogs).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3000/api/audit');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: 'Error al obtener logs de auditoría' });
    });
  });
});
