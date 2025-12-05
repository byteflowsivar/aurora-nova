/**
 * Audit System - Type Definitions
 *
 * Tipos para el sistema de auditoría de Aurora Nova.
 *
 * @module audit/types
 */

/**
 * Input para crear un registro de auditoría
 */
export interface AuditLogInput {
  /** ID del usuario que realizó la acción (opcional para acciones del sistema) */
  userId?: string;

  /** Acción realizada (ej: "create", "update", "delete", "login") */
  action: string;

  /** Módulo del sistema (ej: "auth", "users", "roles") */
  module: string;

  /** Área de la aplicación desde donde se originó la acción */
  area?: string;

  /** Tipo de entidad afectada (ej: "User", "Role") */
  entityType?: string;

  /** ID de la entidad afectada */
  entityId?: string;

  /** Estado anterior de la entidad (para updates/deletes) */
  oldValues?: Record<string, unknown>;

  /** Estado nuevo de la entidad (para creates/updates) */
  newValues?: Record<string, unknown>;

  /** Dirección IP del usuario */
  ipAddress?: string;

  /** User Agent del navegador */
  userAgent?: string;

  /** Request ID para correlación de logs */
  requestId?: string;

  /** Metadata adicional */
  metadata?: Record<string, unknown>;
}

/**
 * Filtros para consultar logs de auditoría
 */
export interface AuditLogFilters {
  /** Filtrar por ID de usuario */
  userId?: string;

  /** Filtrar por módulo */
  module?: string;

  /** Filtrar por acción */
  action?: string;

  /** Filtrar por área de la aplicación */
  area?: string;

  /** Filtrar por tipo de entidad */
  entityType?: string;

  /** Filtrar por ID de entidad */
  entityId?: string;

  /** Filtrar por request ID */
  requestId?: string;

  /** Fecha de inicio (inclusive) */
  startDate?: Date;

  /** Fecha de fin (inclusive) */
  endDate?: Date;

  /** Número máximo de resultados (default: 50) */
  limit?: number;

  /** Offset para paginación (default: 0) */
  offset?: number;
}

/**
 * Resultado de consulta de auditoría con paginación
 */
export interface AuditLogResult {
  /** Logs de auditoría */
  logs: AuditLogWithUser[];

  /** Total de registros que coinciden con los filtros */
  total: number;

  /** Número de registros devueltos */
  count: number;

  /** Límite aplicado */
  limit: number;

  /** Offset aplicado */
  offset: number;

  /** Indica si hay más resultados disponibles */
  hasMore: boolean;
}

/**
 * Log de auditoría con información del usuario
 */
export interface AuditLogWithUser {
  id: string;
  userId: string | null;
  action: string;
  module: string;
  area: string | null;
  entityType: string | null;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}
