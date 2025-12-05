/**
 * Event System - Type Definitions
 *
 * Catálogo completo de eventos del sistema y sus payloads tipados.
 *
 * @module events/types
 */

/**
 * Catálogo de eventos del sistema
 *
 * Cada evento representa una acción significativa que ocurre en el sistema.
 * Los listeners pueden suscribirse a estos eventos para ejecutar acciones
 * secundarias como enviar emails, registrar auditoría, o notificaciones.
 */
export enum SystemEvent {
  // ============================================================================
  // AUTH EVENTS - Eventos relacionados con autenticación
  // ============================================================================

  /** Usuario registrado exitosamente */
  USER_REGISTERED = 'user.registered',

  /** Usuario inició sesión */
  USER_LOGGED_IN = 'user.logged_in',

  /** Usuario cerró sesión */
  USER_LOGGED_OUT = 'user.logged_out',

  /** Solicitud de reset de contraseña */
  PASSWORD_RESET_REQUESTED = 'password.reset_requested',

  /** Contraseña cambiada exitosamente */
  PASSWORD_CHANGED = 'password.changed',

  // ============================================================================
  // USER EVENTS - Eventos relacionados con gestión de usuarios
  // ============================================================================

  /** Usuario creado por admin */
  USER_CREATED = 'user.created',

  /** Usuario actualizado */
  USER_UPDATED = 'user.updated',

  /** Usuario eliminado */
  USER_DELETED = 'user.deleted',

  /** Rol asignado a usuario */
  USER_ROLE_ASSIGNED = 'user.role_assigned',

  /** Rol removido de usuario */
  USER_ROLE_REMOVED = 'user.role_removed',

  // ============================================================================
  // ROLE EVENTS - Eventos relacionados con roles
  // ============================================================================

  /** Rol creado */
  ROLE_CREATED = 'role.created',

  /** Rol actualizado */
  ROLE_UPDATED = 'role.updated',

  /** Rol eliminado */
  ROLE_DELETED = 'role.deleted',

  /** Permiso asignado a rol */
  ROLE_PERMISSION_ASSIGNED = 'role.permission_assigned',

  /** Permiso removido de rol */
  ROLE_PERMISSION_REMOVED = 'role.permission_removed',

  // ============================================================================
  // PERMISSION EVENTS - Eventos relacionados con permisos
  // ============================================================================

  /** Permiso creado */
  PERMISSION_CREATED = 'permission.created',

  /** Permiso actualizado */
  PERMISSION_UPDATED = 'permission.updated',

  /** Permiso eliminado */
  PERMISSION_DELETED = 'permission.deleted',

  // ============================================================================
  // SESSION EVENTS - Eventos relacionados con sesiones
  // ============================================================================

  /** Sesión expirada */
  SESSION_EXPIRED = 'session.expired',

  /** Sesión concurrente detectada */
  CONCURRENT_SESSION_DETECTED = 'session.concurrent_detected',
}

/**
 * Payloads tipados para cada evento del sistema
 *
 * Cada evento tiene su payload específico con los datos necesarios
 * para que los listeners puedan ejecutar sus acciones.
 */
export interface EventPayload {
  // ============================================================================
  // AUTH EVENT PAYLOADS
  // ============================================================================

  [SystemEvent.USER_REGISTERED]: {
    userId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };

  [SystemEvent.USER_LOGGED_IN]: {
    userId: string;
    email: string;
    sessionId: string;
    ipAddress: string;
    userAgent: string;
  };

  [SystemEvent.USER_LOGGED_OUT]: {
    userId: string;
    sessionId: string;
  };

  [SystemEvent.PASSWORD_RESET_REQUESTED]: {
    userId: string;
    email: string;
    token: string;
    expiresAt: Date;
  };

  [SystemEvent.PASSWORD_CHANGED]: {
    userId: string;
    email: string;
    changedBy: 'self' | 'admin';
  };

  // ============================================================================
  // USER EVENT PAYLOADS
  // ============================================================================

  [SystemEvent.USER_CREATED]: {
    userId: string;
    email: string;
    name: string | null;
    createdBy: string; // Admin user ID
  };

  [SystemEvent.USER_UPDATED]: {
    userId: string;
    oldValues: Record<string, unknown>;
    newValues: Record<string, unknown>;
    updatedBy: string;
  };

  [SystemEvent.USER_DELETED]: {
    userId: string;
    email: string;
    deletedBy: string;
  };

  [SystemEvent.USER_ROLE_ASSIGNED]: {
    userId: string;
    roleId: string;
    roleName: string;
    assignedBy: string;
  };

  [SystemEvent.USER_ROLE_REMOVED]: {
    userId: string;
    roleId: string;
    roleName: string;
    removedBy: string;
  };

  // ============================================================================
  // ROLE EVENT PAYLOADS
  // ============================================================================

  [SystemEvent.ROLE_CREATED]: {
    roleId: string;
    name: string;
    description: string | null;
    createdBy: string;
  };

  [SystemEvent.ROLE_UPDATED]: {
    roleId: string;
    oldValues: Record<string, unknown>;
    newValues: Record<string, unknown>;
    updatedBy: string;
  };

  [SystemEvent.ROLE_DELETED]: {
    roleId: string;
    name: string;
    deletedBy: string;
  };

  [SystemEvent.ROLE_PERMISSION_ASSIGNED]: {
    roleId: string;
    roleName: string;
    permissionId: string;
    permissionName: string;
    assignedBy: string;
  };

  [SystemEvent.ROLE_PERMISSION_REMOVED]: {
    roleId: string;
    roleName: string;
    permissionId: string;
    permissionName: string;
    removedBy: string;
  };

  // ============================================================================
  // PERMISSION EVENT PAYLOADS
  // ============================================================================

  [SystemEvent.PERMISSION_CREATED]: {
    permissionId: string;
    name: string;
    description: string | null;
    createdBy: string;
  };

  [SystemEvent.PERMISSION_UPDATED]: {
    permissionId: string;
    oldValues: Record<string, unknown>;
    newValues: Record<string, unknown>;
    updatedBy: string;
  };

  [SystemEvent.PERMISSION_DELETED]: {
    permissionId: string;
    name: string;
    deletedBy: string;
  };

  // ============================================================================
  // SESSION EVENT PAYLOADS
  // ============================================================================

  [SystemEvent.SESSION_EXPIRED]: {
    userId: string;
    sessionId: string;
    expiresAt: Date;
  };

  [SystemEvent.CONCURRENT_SESSION_DETECTED]: {
    userId: string;
    newSessionId: string;
    existingSessionId: string;
    ipAddress: string;
  };
}

/**
 * Estructura base para todos los eventos
 *
 * Cada evento emitido incluye:
 * - event: El tipo de evento (de SystemEvent)
 * - payload: Los datos específicos del evento
 * - metadata: Contexto adicional (timestamp, requestId, userId, area)
 */
export interface BaseEvent<T extends SystemEvent> {
  /** Tipo de evento */
  event: T;

  /** Datos específicos del evento */
  payload: EventPayload[T];

  /** Metadata contextual */
  metadata: {
    /** Timestamp de cuando ocurrió el evento */
    timestamp: Date;

    /** Request ID para correlación de logs */
    requestId?: string;

    /** ID del usuario que disparó el evento (si aplica) */
    userId?: string;

    /** Área de la aplicación desde donde se generó el evento */
    area?: string; // EventArea enum value
  };
}

/**
 * Tipo de función listener para eventos
 *
 * Los listeners pueden ser síncronos o asíncronos.
 */
export type EventListener<T extends SystemEvent> = (
  event: BaseEvent<T>
) => Promise<void> | void;
