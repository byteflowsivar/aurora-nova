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
 * GET /api/admin/audit - Obtener registros de auditoría paginados
 *
 * Obtiene una lista paginada y filtrada de registros de auditoría del sistema.
 * Incluye filtros por usuario, módulo, acción, área, tipo de entidad, rango de fechas.
 * Útil para auditar cambios en el sistema y rastrear actividades de usuarios.
 *
 * **Autenticación**: Requerida (permiso: `audit:view`)
 *
 * **Query Parameters** (todos opcionales):
 * - `userId` (string): Filtrar por ID de usuario que realizó la acción
 * - `module` (string): Filtrar por módulo (e.g., "auth", "users", "roles")
 * - `action` (string): Filtrar por acción (e.g., "login", "create", "update", "delete")
 * - `area` (string): Filtrar por área del sistema (ADMIN, CUSTOMER, PUBLIC, SYSTEM)
 * - `entityType` (string): Filtrar por tipo de entidad (e.g., "Role", "User", "Permission")
 * - `entityId` (string): Filtrar por ID de entidad específica
 * - `requestId` (string): Filtrar por ID de petición que generó el log
 * - `startDate` (string): Fecha de inicio en formato ISO 8601 (e.g., "2024-01-01T00:00:00Z")
 * - `endDate` (string): Fecha de fin en formato ISO 8601 (e.g., "2024-12-31T23:59:59Z")
 * - `limit` (number): Registros por página, máximo 100 (default: 50)
 * - `offset` (number): Registros a saltar para paginación (default: 0)
 *
 * **Respuesta** (200):
 * ```json
 * {
 *   "logs": [
 *     {
 *       "id": "uuid",
 *       "userId": "user-uuid",
 *       "module": "roles",
 *       "action": "create",
 *       "area": "ADMIN",
 *       "entityType": "Role",
 *       "entityId": "role-uuid",
 *       "changes": { "name": "moderator" },
 *       "timestamp": "2024-12-05T12:00:00Z"
 *     }
 *   ],
 *   "count": 150,
 *   "limit": 50,
 *   "offset": 0
 * }
 * ```
 *
 * **Errores**:
 * - 400: Parámetros inválidos (fecha mal formada, limit/offset no son números)
 * - 401: No autenticado
 * - 403: Sin permiso `audit:view`
 * - 500: Error del servidor
 *
 * **Validaciones**:
 * - Fechas: formato ISO 8601 válido
 * - limit: número positivo, máximo 100 (se ajusta si supera)
 * - offset: número no negativo
 * - Todos los filtros son opcionales
 *
 * **Casos de Uso**:
 * - Dashboard admin: ver últimas actividades del sistema
 * - Auditoría de cambios: rastrear modificaciones de roles/permisos
 * - Investigación de seguridad: ver acciones de usuario específico
 * - Cumplimiento: generar reportes de actividad para período
 * - Debugging: investigar cambios en entidades específicas
 *
 * **Performance**:
 * - Paginación eficiente (limit máx 100 por request)
 * - Filtros optimizados con índices de BD
 * - Típicamente < 200ms incluso con millones de logs
 * - Logging estructurado de cada acceso por seguridad
 *
 * @method GET
 * @route /api/admin/audit
 * @auth Requerida (JWT válido)
 * @permission audit:view
 *
 * @param {NextRequest} request - Request con query parameters
 * @returns {Promise<NextResponse>} Logs paginados con metadatos (200) o error
 *
 * @example
 * ```typescript
 * // Obtener últimos 20 intentos de login
 * const response = await fetch(
 *   '/api/admin/audit?module=auth&action=login&limit=20',
 *   { headers: { 'Authorization': `Bearer ${token}` } }
 * )
 * const { logs, count } = await response.json()
 * console.log(`Total intentos: ${count}, mostrando 20`)
 *
 * // Obtener cambios en roles durante último mes
 * const startDate = new Date(Date.now() - 30*24*60*60*1000).toISOString()
 * const endDate = new Date().toISOString()
 * const response = await fetch(
 *   `/api/admin/audit?module=roles&startDate=${startDate}&endDate=${endDate}&limit=100`,
 *   { headers: { 'Authorization': `Bearer ${token}` } }
 * )
 * const { logs } = await response.json()
 * logs.forEach(log => console.log(`${log.action}: ${log.entityId}`))
 *
 * // Auditar actividades de un usuario específico
 * const response = await fetch(
 *   `/api/admin/audit?userId=user-123&limit=50`,
 *   { headers: { 'Authorization': `Bearer ${token}` } }
 * )
 * ```
 *
 * @see {@link ../users/[id]/route.ts} para ver detalles de usuario específico
 * @see {@link ../roles/[id]/route.ts} para ver detalles de rol específico
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
