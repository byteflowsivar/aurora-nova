/**
 * Audit Helpers
 *
 * Utilidades para auditoría manual en casos no cubiertos por eventos.
 *
 * @module audit/helpers
 */

'use server';

import { headers } from 'next/headers';
import { v7 as uuidv7 } from 'uuid';
import { auditService } from './audit-service';
import { AuditLogInput } from './audit-types';
import { structuredLogger } from '@/lib/logger/structured-logger';

/**
 * Contexto de auditoría extraído de la request
 */
export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
}

/**
 * Opciones para auditOperation
 */
export interface AuditOperationOptions {
  userId?: string;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Obtener contexto de auditoría desde la request actual
 *
 * Extrae información de la request de Next.js para auditoría:
 * - IP address (desde headers x-forwarded-for o x-real-ip)
 * - User agent
 * - Request ID (genera uno si no existe)
 *
 * @param userId - ID del usuario que realiza la acción (opcional)
 * @returns Contexto de auditoría
 *
 * @example
 * ```ts
 * const context = await getAuditContext(session.user.id);
 * await auditService.log({
 *   ...context,
 *   action: 'custom_action',
 *   module: 'custom',
 * });
 * ```
 */
export async function getAuditContext(userId?: string): Promise<AuditContext> {
  try {
    const headersList = await headers();

    // Obtener IP address (priorizar x-forwarded-for para proxies/load balancers)
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ipAddress =
      forwardedFor?.split(',')[0].trim() || realIp || undefined;

    // Obtener User Agent
    const userAgent = headersList.get('user-agent') || undefined;

    // Obtener o generar Request ID
    const existingRequestId = headersList.get('x-request-id');
    const requestId = existingRequestId || uuidv7();

    return {
      userId,
      ipAddress,
      userAgent,
      requestId,
    };
  } catch (error) {
    // En caso de error (ej. no estamos en un request context), retornar valores por defecto
    structuredLogger.warn(
      'Failed to get audit context',
      {
        module: 'audit',
        action: 'get_context_failed',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      }
    );

    return {
      userId,
      requestId: uuidv7(),
    };
  }
}

/**
 * Wrapper para ejecutar una operación con auditoría automática
 *
 * Ejecuta una función y crea un registro de auditoría automáticamente.
 * Útil para operaciones complejas que no emiten eventos del sistema.
 *
 * @param options - Opciones de auditoría
 * @param operation - Función a ejecutar
 * @returns Resultado de la operación
 *
 * @example
 * ```ts
 * // Ejemplo 1: Operación batch con valores nuevos
 * const deletedUsers = await auditOperation(
 *   {
 *     userId: session.user.id,
 *     action: 'batch_delete',
 *     module: 'users',
 *     metadata: { reason: 'Cleanup inactive users' },
 *   },
 *   async () => {
 *     const users = await prisma.user.deleteMany({
 *       where: { lastLoginAt: { lt: oneYearAgo } }
 *     });
 *     return users;
 *   }
 * );
 *
 * // Ejemplo 2: Operación con contexto automático
 * await auditOperation(
 *   {
 *     userId: session.user.id,
 *     action: 'export',
 *     module: 'reports',
 *     metadata: { format: 'xlsx', filters: {...} },
 *   },
 *   async () => {
 *     return await generateReport();
 *   }
 * );
 * ```
 */
export async function auditOperation<T>(
  options: AuditOperationOptions,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    // Obtener contexto de la request si no se proporcionó
    let auditData: AuditLogInput = {
      userId: options.userId,
      action: options.action,
      module: options.module,
      entityType: options.entityType,
      entityId: options.entityId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      requestId: options.requestId,
      metadata: options.metadata,
    };

    // Si no se proporcionó IP/UserAgent/RequestID, obtenerlos del contexto
    if (!options.ipAddress || !options.userAgent || !options.requestId) {
      const context = await getAuditContext(options.userId);
      auditData = {
        ...auditData,
        ipAddress: auditData.ipAddress || context.ipAddress,
        userAgent: auditData.userAgent || context.userAgent,
        requestId: auditData.requestId || context.requestId,
      };
    }

    // Ejecutar la operación
    const result = await operation();

    // Calcular duración
    const duration = Date.now() - startTime;

    // Registrar auditoría exitosa
    await auditService.log({
      ...auditData,
      metadata: {
        ...auditData.metadata,
        duration,
        success: true,
      },
    });

    structuredLogger.info('Audit operation completed', {
      module: options.module,
      action: options.action,
      userId: options.userId,
      requestId: auditData.requestId,
      duration,
    });

    return result;
  } catch (error) {
    // Calcular duración incluso en caso de error
    const duration = Date.now() - startTime;

    // Registrar auditoría de error
    const context = await getAuditContext(options.userId);
    await auditService.log({
      userId: options.userId,
      action: options.action,
      module: options.module,
      entityType: options.entityType,
      entityId: options.entityId,
      ipAddress: options.ipAddress || context.ipAddress,
      userAgent: options.userAgent || context.userAgent,
      requestId: options.requestId || context.requestId,
      metadata: {
        ...options.metadata,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    structuredLogger.error(
      'Audit operation failed',
      error instanceof Error ? error : new Error(String(error)),
      {
        module: options.module,
        action: options.action,
        userId: options.userId,
        requestId: options.requestId || context.requestId,
        duration,
      }
    );

    // Re-lanzar el error para que el caller pueda manejarlo
    throw error;
  }
}

/**
 * Helper para auditar cambios en entidades con valores viejos/nuevos
 *
 * Simplifica la auditoría de actualizaciones con oldValues y newValues.
 *
 * @param options - Opciones de auditoría
 * @param oldValues - Valores antes del cambio
 * @param newValues - Valores después del cambio
 *
 * @example
 * ```ts
 * await auditEntityChange(
 *   {
 *     userId: session.user.id,
 *     action: 'update',
 *     module: 'users',
 *     entityType: 'User',
 *     entityId: user.id,
 *   },
 *   { email: 'old@example.com', name: 'Old Name' },
 *   { email: 'new@example.com', name: 'New Name' }
 * );
 * ```
 */
export async function auditEntityChange(
  options: AuditOperationOptions,
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
): Promise<void> {
  const context = await getAuditContext(options.userId);

  await auditService.log({
    userId: options.userId,
    action: options.action,
    module: options.module,
    entityType: options.entityType,
    entityId: options.entityId,
    ipAddress: options.ipAddress || context.ipAddress,
    userAgent: options.userAgent || context.userAgent,
    requestId: options.requestId || context.requestId,
    oldValues,
    newValues,
    metadata: options.metadata,
  });

  structuredLogger.info('Entity change audited', {
    module: options.module,
    action: options.action,
    userId: options.userId,
    requestId: options.requestId || context.requestId,
    metadata: {
        entityType: options.entityType,
        entityId: options.entityId,
    }
  });
}
