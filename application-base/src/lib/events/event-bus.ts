/**
 * Event Bus - Sistema de eventos centralizado
 *
 * Implementación de un event bus basado en EventEmitter de Node.js
 * para desacoplar componentes y permitir arquitectura event-driven.
 *
 * Características:
 * - Dispatch asíncrono de eventos
 * - Múltiples listeners por evento
 * - Manejo automático de errores en listeners
 * - Logging integrado con structured logger
 * - Soporte para wildcard listener (escuchar todos los eventos)
 *
 * @module events/event-bus
 */

import { EventEmitter } from 'events';
import { structuredLogger } from '../logger/structured-logger';
import type { SystemEvent, BaseEvent, EventPayload, EventListener } from './types';

/**
 * Event Bus Singleton
 *
 * Gestiona la emisión y suscripción de eventos del sistema.
 * Utiliza EventEmitter de Node.js como base.
 */
class EventBus extends EventEmitter {
  private static instance: EventBus;

  /**
   * Map para mantener referencia de listeners originales a listeners envueltos
   * Necesario para poder hacer unsubscribe correctamente
   */
  private listenerMap = new Map<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EventListener<any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (eventData: BaseEvent<any>) => Promise<void>
  >();

  private constructor() {
    super();
    // Permitir múltiples listeners sin warnings
    this.setMaxListeners(50);
  }

  /**
   * Obtener instancia singleton del event bus
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
      structuredLogger.info('Event bus initialized', {
        module: 'events',
        action: 'init',
      });
    }
    return EventBus.instance;
  }

  /**
   * Emitir un evento
   *
   * El evento se dispara de forma asíncrona. Los listeners se ejecutan
   * en paralelo y sus errores se capturan individualmente.
   *
   * @param event - Tipo de evento a emitir
   * @param payload - Datos del evento
   * @param metadata - Metadata opcional (requestId, userId)
   *
   * @example
   * ```typescript
   * await eventBus.dispatch(
   *   SystemEvent.USER_LOGGED_IN,
   *   {
   *     userId: 'user-123',
   *     email: 'user@example.com',
   *     sessionId: 'session-456',
   *     ipAddress: '192.168.1.1',
   *     userAgent: 'Mozilla/5.0...',
   *   },
   *   {
   *     requestId: 'req-789',
   *     userId: 'user-123',
   *   }
   * );
   * ```
   */
  async dispatch<T extends SystemEvent>(
    event: T,
    payload: EventPayload[T],
    metadata?: {
      requestId?: string;
      userId?: string;
    }
  ): Promise<void> {
    const eventData: BaseEvent<T> = {
      event,
      payload,
      metadata: {
        timestamp: new Date(),
        ...metadata,
      },
    };

    structuredLogger.info('Event dispatched', {
      module: 'events',
      action: 'dispatch',
      requestId: metadata?.requestId,
      userId: metadata?.userId,
      metadata: {
        event,
        hasPayload: !!payload,
      },
    });

    // Emitir evento específico
    this.emit(event, eventData);

    // Emitir también evento genérico para logging global
    this.emit('*', eventData);
  }

  /**
   * Suscribirse a un evento específico
   *
   * El listener se ejecutará cada vez que el evento se emita.
   * Los errores en el listener se capturan y loggean automáticamente.
   *
   * @param event - Tipo de evento a escuchar
   * @param listener - Función a ejecutar cuando el evento ocurra
   *
   * @example
   * ```typescript
   * eventBus.subscribe(SystemEvent.USER_LOGGED_IN, async (event) => {
   *   console.log('User logged in:', event.payload.email);
   *   await sendWelcomeEmail(event.payload.email);
   * });
   * ```
   */
  subscribe<T extends SystemEvent>(event: T, listener: EventListener<T>): void {
    // Crear wrapper que maneja errores
    const wrappedListener = async (eventData: BaseEvent<T>) => {
      try {
        await listener(eventData);
      } catch (error) {
        structuredLogger.error('Event listener failed', error as Error, {
          module: 'events',
          action: 'listener_error',
          requestId: eventData.metadata.requestId,
          userId: eventData.metadata.userId,
          metadata: {
            event,
            errorMessage: (error as Error).message,
          },
        });
      }
    };

    // Guardar referencia del listener original al wrapped
    this.listenerMap.set(listener, wrappedListener);

    // Registrar el wrapped listener
    this.on(event, wrappedListener);

    structuredLogger.info('Event listener registered', {
      module: 'events',
      action: 'subscribe',
      metadata: { event },
    });
  }

  /**
   * Suscribirse a todos los eventos
   *
   * Útil para logging global o debugging.
   *
   * @param listener - Función a ejecutar para cualquier evento
   *
   * @example
   * ```typescript
   * // Logger global de eventos
   * eventBus.subscribeAll((event) => {
   *   console.log('Event occurred:', event.event);
   * });
   * ```
   */
  subscribeAll(listener: EventListener<SystemEvent>): void {
    this.on('*', async (eventData: BaseEvent<SystemEvent>) => {
      try {
        await listener(eventData);
      } catch (error) {
        structuredLogger.error('Wildcard listener failed', error as Error, {
          module: 'events',
          action: 'wildcard_listener_error',
          metadata: {
            errorMessage: (error as Error).message,
          },
        });
      }
    });

    structuredLogger.info('Wildcard event listener registered', {
      module: 'events',
      action: 'subscribe_all',
    });
  }

  /**
   * Remover listener específico
   *
   * @param event - Evento del que remover el listener
   * @param listener - Listener a remover
   */
  unsubscribe<T extends SystemEvent>(event: T, listener: EventListener<T>): void {
    // Obtener el wrapped listener del map
    const wrappedListener = this.listenerMap.get(listener);

    if (wrappedListener) {
      this.off(event, wrappedListener as never);
      // Remover del map
      this.listenerMap.delete(listener);

      structuredLogger.info('Event listener unregistered', {
        module: 'events',
        action: 'unsubscribe',
        metadata: { event },
      });
    }
  }

  /**
   * Remover todos los listeners de un evento
   *
   * @param event - Evento del que remover todos los listeners
   */
  unsubscribeAll(event?: SystemEvent): void {
    if (event) {
      this.removeAllListeners(event);
      structuredLogger.info('All listeners removed for event', {
        module: 'events',
        action: 'unsubscribe_all',
        metadata: { event },
      });
    } else {
      this.removeAllListeners();
      // Limpiar el map de listeners
      this.listenerMap.clear();
      structuredLogger.info('All event listeners removed', {
        module: 'events',
        action: 'unsubscribe_all',
      });
    }
  }

  /**
   * Obtener número de listeners para un evento
   *
   * @param event - Evento a consultar
   * @returns Número de listeners registrados
   */
  getListenerCount(event: SystemEvent): number {
    return this.listenerCount(event);
  }
}

/**
 * Instancia singleton del event bus
 *
 * Importa y usa esta instancia en toda la aplicación.
 *
 * @example
 * ```typescript
 * import { eventBus, SystemEvent } from '@/lib/events';
 *
 * // Dispatch
 * await eventBus.dispatch(SystemEvent.USER_CREATED, payload);
 *
 * // Subscribe
 * eventBus.subscribe(SystemEvent.USER_CREATED, handler);
 * ```
 */
export const eventBus = EventBus.getInstance();
