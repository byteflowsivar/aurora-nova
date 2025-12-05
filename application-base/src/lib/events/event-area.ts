/**
 * Event Area - Definición de áreas de la aplicación
 *
 * Cada evento se genera desde una área específica de la aplicación.
 * Esto permite segmentar auditoría, personalizar comunicaciones y
 * validar el contexto de las acciones.
 *
 * @module events/event-area
 */

/**
 * Áreas de la aplicación desde donde se pueden generar eventos
 *
 * - ADMIN: Panel de administración (/admin/*)
 * - CUSTOMER: Zona de cliente autenticado (/account/*)
 * - PUBLIC: Área pública de la aplicación (sin autenticación)
 * - SYSTEM: Eventos internos del sistema (no iniciados por usuario)
 */
export enum EventArea {
  /** Panel de administración */
  ADMIN = 'admin',

  /** Zona de cliente/usuario autenticado */
  CUSTOMER = 'customer',

  /** Área pública (sin autenticación) */
  PUBLIC = 'public',

  /** Sistema interno (cron jobs, hooks del sistema, etc) */
  SYSTEM = 'system',
}

/**
 * Validar si un valor es un área válida
 *
 * @param value - Valor a validar
 * @returns true si es un EventArea válido
 */
export function isValidEventArea(value: unknown): value is EventArea {
  return Object.values(EventArea).includes(value as EventArea);
}

/**
 * Obtener el nombre legible de un área
 *
 * @param area - EventArea
 * @returns Nombre legible en español
 */
export function getEventAreaLabel(area: EventArea): string {
  const labels: Record<EventArea, string> = {
    [EventArea.ADMIN]: 'Panel de Administración',
    [EventArea.CUSTOMER]: 'Zona de Cliente',
    [EventArea.PUBLIC]: 'Área Pública',
    [EventArea.SYSTEM]: 'Sistema',
  };

  return labels[area];
}
