/**
 * API Endpoint: Audit Logs
 *
 * GET /api/audit - Obtener registros de auditoría con filtros y paginación
 *
 * @module api/audit
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/modules/admin/utils/permission-utils';
import { auditService } from '@/modules/admin/services/audit-service';
import { SYSTEM_PERMISSIONS } from '@/modules/admin/types';
import { structuredLogger } from '@/lib/logger/structured-logger';

/**
 * @api {get} /api/admin/audit
 * @name Obtener Logs de Auditoría
 * @description Obtiene una lista paginada y filtrada de registros de auditoría del sistema.
 * @version 1.0.0
 *
 * @requires "audit:view" - El usuario debe tener el permiso para ver los registros de auditoría.
 *
 * @param {NextRequest} request - La petición HTTP de entrada.
 * @query {string} [userId] - Filtrar por ID de usuario.
 * @query {string} [module] - Filtrar por módulo (e.g., "auth", "users").
 * @query {string} [action] - Filtrar por acción (e.g., "login", "create").
 * @query {string} [area] - Filtrar por área (ADMIN, CUSTOMER, PUBLIC, SYSTEM).
 * @query {string} [entityType] - Filtrar por tipo de entidad (e.g., "Role").
 * @query {string} [entityId] - Filtrar por ID de una entidad específica.
 * @query {string} [requestId] - Filtrar por el ID de la petición que generó el log.
 * @query {string} [startDate] - Fecha de inicio en formato ISO 8601.
 * @query {string} [endDate] - Fecha de fin en formato ISO 8601.
 * @query {number} [limit=50] - Número de registros por página (máximo 100).
 * @query {number} [offset=0] - Número de registros a saltar para la paginación.
 *
 * @response {200} Success - Retorna un objeto con los logs y la información de paginación.
 * @response {400} BadRequest - Parámetros de consulta inválidos (e.g., fecha mal formada).
 * @response {401} Unauthorized - El usuario no está autenticado.
 * @response {403} Forbidden - El usuario no tiene los permisos necesarios.
 * @response {500} InternalServerError - Error inesperado en el servidor.
 *
 * @returns {Promise<NextResponse>} Una promesa que resuelve a la respuesta HTTP con el objeto `AuditLogResult`.
 *
 * @example
 * // Fetch the last 20 login attempts
 * fetch('/api/admin/audit?module=auth&action=login&limit=20')
 *
 * // Fetch all actions performed by a specific user
 * fetch('/api/admin/audit?userId=user-abc-123')
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
    const area = searchParams.get('area') || undefined;
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

    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

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

    let effectiveLimit = limit;
    // Limitar max 100 resultados por request
    if (effectiveLimit > 100) {
      effectiveLimit = 100;
    }

    // Obtener logs con filtros
    const result = await auditService.getLogs({
      userId,
      module,
      action,
      area,
      entityType,
      entityId,
      requestId,
      startDate,
      endDate,
      limit: effectiveLimit,
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
          area,
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
    structuredLogger.error(
      'Error retrieving audit logs via API',
      error instanceof Error ? error : new Error(String(error)), // Ensure error is an Error object
      {
        module: 'audit',
        action: 'api_get_logs_failed',
      }
    );

    return NextResponse.json(
      { error: 'Error al obtener logs de auditoría' },
      { status: 500 }
    );
  }
}
