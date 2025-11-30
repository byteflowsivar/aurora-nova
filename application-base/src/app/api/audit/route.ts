/**
 * API Endpoint: Audit Logs
 *
 * GET /api/audit - Obtener registros de auditoría con filtros y paginación
 *
 * @module api/audit
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/utils/permission-utils';
import { auditService } from '@/lib/audit/audit-service';
import { SYSTEM_PERMISSIONS } from '@/lib/types/permissions';
import { structuredLogger } from '@/lib/logger/structured-logger';

/**
 * GET /api/audit - Obtener registros de auditoría
 *
 * Query parameters:
 * - userId: string (optional) - Filtrar por ID de usuario
 * - module: string (optional) - Filtrar por módulo (auth, users, roles, etc.)
 * - action: string (optional) - Filtrar por acción (login, create, update, etc.)
 * - entityType: string (optional) - Filtrar por tipo de entidad (User, Role, etc.)
 * - entityId: string (optional) - Filtrar por ID de entidad específica
 * - requestId: string (optional) - Filtrar por request ID
 * - startDate: string (optional) - Fecha inicio (ISO 8601)
 * - endDate: string (optional) - Fecha fin (ISO 8601)
 * - limit: number (optional, default: 50, max: 100) - Límite de resultados
 * - offset: number (optional, default: 0) - Offset para paginación
 *
 * Requires: audit:view permission
 *
 * @returns AuditLogResult con logs, total, count, limit, offset, hasMore
 *
 * @example
 * GET /api/audit?module=auth&limit=20&offset=0
 * GET /api/audit?userId=user-123&startDate=2025-11-01T00:00:00Z
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permiso audit:view
    const canViewAudit = await hasPermission(
      session.user.id,
      SYSTEM_PERMISSIONS.AUDIT_VIEW
    );

    if (!canViewAudit) {
      structuredLogger.warn('Unauthorized audit access attempt', {
        module: 'audit',
        action: 'unauthorized_access',
        userId: session.user.id,
      });

      return NextResponse.json(
        { error: 'Sin permisos para ver logs de auditoría' },
        { status: 403 }
      );
    }

    // Parsear query parameters
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get('userId') || undefined;
    const module = searchParams.get('module') || undefined;
    const action = searchParams.get('action') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const requestId = searchParams.get('requestId') || undefined;

    // Parsear fechas
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    // Validar fechas
    if (startDate && isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'startDate inválido. Use formato ISO 8601' },
        { status: 400 }
      );
    }

    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'endDate inválido. Use formato ISO 8601' },
        { status: 400 }
      );
    }

    // Parsear paginación
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    let limit = limitParam ? parseInt(limitParam, 10) : 50;
    let offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    // Validar paginación
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        { error: 'limit debe ser un número positivo' },
        { status: 400 }
      );
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { error: 'offset debe ser un número no negativo' },
        { status: 400 }
      );
    }

    // Limitar max 100 resultados por request
    if (limit > 100) {
      limit = 100;
    }

    // Obtener logs con filtros
    const result = await auditService.getLogs({
      userId,
      module,
      action,
      entityType,
      entityId,
      requestId,
      startDate,
      endDate,
      limit,
      offset,
    });

    structuredLogger.info('Audit logs retrieved via API', {
      module: 'audit',
      action: 'api_get_logs',
      userId: session.user.id,
      metadata: {
        filters: {
          userId,
          module,
          action,
          entityType,
          entityId,
          requestId,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        },
        pagination: { limit, offset },
        resultCount: result.count,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    structuredLogger.error('Error retrieving audit logs via API', {
      module: 'audit',
      action: 'api_get_logs_failed',
      error,
    });

    return NextResponse.json(
      { error: 'Error al obtener logs de auditoría' },
      { status: 500 }
    );
  }
}
