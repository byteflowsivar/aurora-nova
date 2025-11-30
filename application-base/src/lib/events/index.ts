/**
 * Event System - Public API
 *
 * Sistema de eventos event-driven para desacoplar componentes.
 *
 * @module events
 */

// Export event bus
export { eventBus } from './event-bus';

// Export types
export { SystemEvent } from './types';
export type { BaseEvent, EventPayload, EventListener } from './types';
