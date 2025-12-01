/**
 * Audit Service
 *
 * Servicio centralizado para registrar y consultar auditoría del sistema.
 *
 * @module audit/audit-service
 */

import { prisma } from '@/lib/prisma/connection';
import { structuredLogger } from '@/lib/logger/structured-logger';
import type { Prisma } from '@/lib/prisma/generated';
import type {
  AuditLogInput,
  AuditLogFilters,
  AuditLogResult,
  AuditLogWithUser,
} from './types';

/**
 * Servicio de auditoría
 *
 * Proporciona métodos para:
 * - Crear registros de auditoría
 * - Consultar logs con filtros avanzados
 * - Obtener estadísticas de auditoría
 */
export class AuditService {
  /**
   * Crear un registro de auditoría
   *
   * @param input - Datos del registro de auditoría
   *
   * @example
   * ```typescript
   * await auditService.log({
   *   userId: 'uuid-123',
   *   action: 'login',
   *   module: 'auth',
   *   ipAddress: '192.168.1.1',
   *   userAgent: 'Mozilla/5.0...'
   * });
   * ```
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: input.userId ?? null,
          action: input.action,
          module: input.module,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          oldValues: input.oldValues
            ? (input.oldValues as Prisma.InputJsonValue)
            : undefined,
          newValues: input.newValues
            ? (input.newValues as Prisma.InputJsonValue)
            : undefined,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          requestId: input.requestId ?? null,
          metadata: input.metadata
            ? (input.metadata as Prisma.InputJsonValue)
            : undefined,
        },
      });

      structuredLogger.info('Audit log created', {
        module: 'audit',
        action: 'log',
        userId: input.userId,
        requestId: input.requestId,
        metadata: {
          auditAction: input.action,
          auditModule: input.module,
          entityType: input.entityType,
          entityId: input.entityId,
        },
      });
    } catch (error) {
      structuredLogger.error('Failed to create audit log', error as Error, {
        module: 'audit',
        action: 'log_failed',
        userId: input.userId,
        requestId: input.requestId,
        metadata: {
          auditAction: input.action,
          auditModule: input.module,
        },
      });

      // No lanzar error - la auditoría es importante pero no debe romper el flujo
      // El error ya quedó registrado en los logs
    }
  }

  /**
   * Obtener logs de auditoría con filtros
   *
   * @param filters - Filtros de búsqueda
   * @returns Resultado paginado con logs de auditoría
   *
   * @example
   * ```typescript
   * const result = await auditService.getLogs({
   *   userId: 'uuid-123',
   *   module: 'users',
   *   action: 'update',
   *   startDate: new Date('2025-01-01'),
   *   limit: 20,
   *   offset: 0
   * });
   * ```
   */
  async getLogs(filters: AuditLogFilters = {}): Promise<AuditLogResult> {
    const where: Prisma.AuditLogWhereInput = {};

    // Aplicar filtros
    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.module) {
      where.module = filters.module;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.requestId) {
      where.requestId = filters.requestId;
    }

    // Filtros de fecha
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};

      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }

      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    try {
      // Obtener total de registros
      const total = await prisma.auditLog.count({ where });

      // Obtener registros con paginación
      const logs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: limit,
        skip: offset,
      });

      // Mapear a tipo de resultado
      const mappedLogs: AuditLogWithUser[] = logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        module: log.module,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValues: log.oldValues as Record<string, unknown> | null,
        newValues: log.newValues as Record<string, unknown> | null,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        requestId: log.requestId,
        metadata: log.metadata as Record<string, unknown> | null,
        timestamp: log.timestamp,
        user: log.user,
      }));

      const count = mappedLogs.length;
      const hasMore = offset + count < total;

      structuredLogger.info('Audit logs retrieved', {
        module: 'audit',
        action: 'get_logs',
        metadata: {
          total,
          count,
          limit,
          offset,
          filters: {
            userId: filters.userId,
            module: filters.module,
            action: filters.action,
          },
        },
      });

      return {
        logs: mappedLogs,
        total,
        count,
        limit,
        offset,
        hasMore,
      };
    } catch (error) {
      structuredLogger.error('Failed to retrieve audit logs', error as Error, {
        module: 'audit',
        action: 'get_logs_failed',
        metadata: {
          filters,
        },
      });

      // En caso de error, devolver resultado vacío
      return {
        logs: [],
        total: 0,
        count: 0,
        limit,
        offset,
        hasMore: false,
      };
    }
  }

  /**
   * Obtener logs de auditoría de una entidad específica
   *
   * @param entityType - Tipo de entidad
   * @param entityId - ID de la entidad
   * @param limit - Límite de resultados (default: 50)
   * @returns Logs de auditoría de la entidad
   *
   * @example
   * ```typescript
   * // Obtener todos los cambios de un usuario
   * const userAudit = await auditService.getEntityLogs('User', 'uuid-123');
   * ```
   */
  async getEntityLogs(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<AuditLogWithUser[]> {
    const result = await this.getLogs({
      entityType,
      entityId,
      limit,
    });

    return result.logs;
  }

  /**
   * Obtener logs de auditoría de un request específico
   *
   * Útil para ver todas las acciones que ocurrieron en un mismo request HTTP.
   *
   * @param requestId - ID del request
   * @returns Logs de auditoría del request
   *
   * @example
   * ```typescript
   * // Ver todas las acciones de un request
   * const requestAudit = await auditService.getRequestLogs('uuid-req-123');
   * ```
   */
  async getRequestLogs(requestId: string): Promise<AuditLogWithUser[]> {
    const result = await this.getLogs({
      requestId,
      limit: 100, // Los requests suelen tener pocas acciones
    });

    return result.logs;
  }

  /**
   * Obtener estadísticas de auditoría
   *
   * @param filters - Filtros opcionales
   * @returns Estadísticas agregadas
   *
   * @example
   * ```typescript
   * const stats = await auditService.getStats({
   *   module: 'users',
   *   startDate: new Date('2025-11-01'),
   *   endDate: new Date('2025-11-30')
   * });
   * ```
   */
  async getStats(filters: Omit<AuditLogFilters, 'limit' | 'offset'> = {}): Promise<{
    totalLogs: number;
    actionBreakdown: Record<string, number>;
    moduleBreakdown: Record<string, number>;
    topUsers: Array<{ userId: string; email: string; count: number }>;
  }> {
    const where: Prisma.AuditLogWhereInput = {};

    // Aplicar filtros de fecha
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};

      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }

      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    if (filters.module) {
      where.module = filters.module;
    }

    try {
      // Total de logs
      const totalLogs = await prisma.auditLog.count({ where });

      // Breakdown por acción
      const actionGroups = await prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: {
          action: true,
        },
      });

      const actionBreakdown: Record<string, number> = {};
      actionGroups.forEach((group) => {
        actionBreakdown[group.action] = group._count.action;
      });

      // Breakdown por módulo
      const moduleGroups = await prisma.auditLog.groupBy({
        by: ['module'],
        where,
        _count: {
          module: true,
        },
      });

      const moduleBreakdown: Record<string, number> = {};
      moduleGroups.forEach((group) => {
        moduleBreakdown[group.module] = group._count.module;
      });

      // Top usuarios (solo si userId no es null)
      const userGroups = await prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          ...where,
          userId: { not: null },
        },
        _count: {
          userId: true,
        },
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: 10,
      });

      // Obtener información de usuarios
      const userIds = userGroups
        .map((g) => g.userId)
        .filter((id): id is string => id !== null);

      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: {
          id: true,
          email: true,
        },
      });

      const userMap = new Map(users.map((u) => [u.id, u.email]));

      const topUsers = userGroups
        .filter((g) => g.userId !== null)
        .map((g) => ({
          userId: g.userId as string,
          email: userMap.get(g.userId as string) || 'Unknown',
          count: g._count.userId,
        }));

      return {
        totalLogs,
        actionBreakdown,
        moduleBreakdown,
        topUsers,
      };
    } catch (error) {
      structuredLogger.error('Failed to get audit stats', error as Error, {
        module: 'audit',
        action: 'get_stats_failed',
      });

      return {
        totalLogs: 0,
        actionBreakdown: {},
        moduleBreakdown: {},
        topUsers: [],
      };
    }
  }
}

/**
 * Instancia singleton del servicio de auditoría
 */
export const auditService = new AuditService();
