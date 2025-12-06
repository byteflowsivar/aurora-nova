/**
 * Tipos e Interfaces del Sistema de Eventos
 *
 * Aurora Nova - Catálogo de Eventos y Payloads Tipados
 *
 * Define todos los eventos del sistema y sus estructuras de datos.
 * Proporciona type-safety para el sistema pub/sub de eventos.
 *
 * **Contenido**:
 * - {@link SystemEvent}: Enum de todos los eventos del sistema
 * - {@link EventPayload}: Interface con payloads tipados por evento
 * - {@link BaseEvent}: Estructura envolvente con metadata
 * - {@link EventListener}: Tipo de función listener
 *
 * **Eventos por Categoría**:
 * - **Auth**: USER_REGISTERED, USER_LOGGED_IN, USER_LOGGED_OUT, PASSWORD_RESET_REQUESTED, PASSWORD_CHANGED
 * - **Users**: USER_CREATED, USER_UPDATED, USER_DELETED, USER_ROLE_ASSIGNED, USER_ROLE_REMOVED
 * - **Roles**: ROLE_CREATED, ROLE_UPDATED, ROLE_DELETED, ROLE_PERMISSION_ASSIGNED, ROLE_PERMISSION_REMOVED
 * - **Permissions**: PERMISSION_CREATED, PERMISSION_UPDATED, PERMISSION_DELETED
 * - **Sessions**: SESSION_EXPIRED, CONCURRENT_SESSION_DETECTED
 *
 * **Características**:
 * - Type-safe event system con TypeScript
 * - Cada evento tiene payload específico
 * - Listeners fuertemente tipados
 * - Autocomplete completo en IDE
 * - Previene errores de tipos en tiempo de compilación
 *
 * **Listeners Típicos**:
 * - Email: Envía emails por ciertos eventos (USER_REGISTERED, PASSWORD_RESET_REQUESTED)
 * - Audit: Registra todos los eventos en BD para compliance
 * - Webhook: Notifica sistemas externos
 * - Analytics: Rastrea comportamiento de usuario
 * - Notifications: Notifica usuarios de cambios
 *
 * @module lib/events/types
 * @see {@link ./event-bus.ts} para implementación del bus
 * @see {@link ./listeners/} para listeners implementados
 *
 * @example
 * ```typescript
 * import type { SystemEvent, EventPayload } from '@/lib/events/types';
 * import { eventBus } from '@/lib/events/event-bus';
 *
 * // Dispatch evento con payload tipado
 * await eventBus.dispatch(
 *   SystemEvent.USER_REGISTERED,
 *   {
 *     userId: 'user-123',
 *     email: 'user@example.com',
 *     firstName: 'John',
 *     lastName: 'Doe'
 *   } as EventPayload[SystemEvent.USER_REGISTERED]
 * );
 *
 * // Suscribirse a evento con payload tipado
 * eventBus.subscribe(SystemEvent.USER_REGISTERED, async (event) => {
 *   const payload = event.payload; // Tipado automáticamente
 *   console.log(payload.email);   // ✓ Email está disponible
 *   console.log(payload.foo);     // ✗ Error: foo no existe
 * });
 * ```
 */

/**
 * Enum de Eventos del Sistema
 *
 * Catálogo centralizado de todos los eventos que pueden ocurrir en la aplicación.
 * Cada evento representa una acción significativa del dominio.
 *
 * @enum {string} SystemEvent
 *
 * **Auth Events** (Autenticación):
 * - `USER_REGISTERED`: Usuario registrado (dispara email de bienvenida)
 * - `USER_LOGGED_IN`: Usuario inició sesión (para auditoría, analytics)
 * - `USER_LOGGED_OUT`: Usuario cerró sesión (para auditoría)
 * - `PASSWORD_RESET_REQUESTED`: Solicitud de reset (dispara email con link)
 * - `PASSWORD_CHANGED`: Contraseña actualizada (notifica usuario)
 *
 * **User Management** (Gestión de Usuarios):
 * - `USER_CREATED`: Nuevo usuario creado por admin
 * - `USER_UPDATED`: Datos de usuario actualizados
 * - `USER_DELETED`: Usuario eliminado
 * - `USER_ROLE_ASSIGNED`: Rol asignado a usuario
 * - `USER_ROLE_REMOVED`: Rol removido de usuario
 *
 * **Role Management** (Gestión de Roles):
 * - `ROLE_CREATED`: Nuevo rol creado
 * - `ROLE_UPDATED`: Rol actualizado
 * - `ROLE_DELETED`: Rol eliminado
 * - `ROLE_PERMISSION_ASSIGNED`: Permiso asignado a rol
 * - `ROLE_PERMISSION_REMOVED`: Permiso removido de rol
 *
 * **Permission Management** (Gestión de Permisos):
 * - `PERMISSION_CREATED`: Nuevo permiso creado
 * - `PERMISSION_UPDATED`: Permiso actualizado
 * - `PERMISSION_DELETED`: Permiso eliminado
 *
 * **Session Management** (Gestión de Sesiones):
 * - `SESSION_EXPIRED`: Sesión expiró
 * - `CONCURRENT_SESSION_DETECTED`: Acceso concurrente detectado
 *
 * @remarks
 * **Convención de Nombres**:
 * - Patrón: `SUBJECT_ACTION` (ej: USER_LOGGED_IN)
 * - Valores de enum en snake_case
 * - Valores de enumeración en formato "subject.action"
 *
 * **Listener Típicos por Evento**:
 * ```
 * USER_REGISTERED:
 *   - Email: Enviar email de bienvenida
 *   - Audit: Registrar creación de usuario
 *   - Analytics: Rastrear registración
 *
 * USER_LOGGED_IN:
 *   - Audit: Registrar login (IP, dispositivo)
 *   - Analytics: Rastrear actividad
 *   - Webhook: Notificar integración externa
 *
 * PASSWORD_RESET_REQUESTED:
 *   - Email: Enviar email con link de reset
 *   - Audit: Registrar solicitud
 * ```
 *
 * @see {@link EventPayload} para estructura de datos por evento
 * @see {@link ./event-bus.ts} para cómo dispatchear eventos
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
