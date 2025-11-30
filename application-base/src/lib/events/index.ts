/**
 * Event System - Public API
 *
 * Sistema de eventos event-driven para desacoplar componentes.
 *
 * @module events
 */

import { EmailEventListener } from './listeners/email-listener';
// import { AuditEventListener } from './listeners/audit-listener'; // Fase 3
import { structuredLogger } from '../logger/structured-logger';

let listenersInitialized = false;

/**
 * Inicializar todos los event listeners del sistema
 *
 * Esta función es idempotente y solo se ejecutará una vez.
 * Debe llamarse en el punto de entrada de la aplicación (ej. layout.tsx).
 */
export function initializeEventListeners() {
  if (listenersInitialized) {
    return;
  }

  structuredLogger.info('Initializing event listeners', {
    module: 'events',
    action: 'init',
  });

  // Email listener
  const emailListener = new EmailEventListener();
  emailListener.register();

  // Audit listener (Fase 3)
  // const auditListener = new AuditEventListener();
  // auditListener.register();

  structuredLogger.info('Event listeners initialized successfully', {
    module: 'events',
    action: 'init_complete',
  });

  listenersInitialized = true;
}

// Export event bus
export { eventBus } from './event-bus';

// Export types
export { SystemEvent } from './types';
export type { BaseEvent, EventPayload, EventListener } from './types';
