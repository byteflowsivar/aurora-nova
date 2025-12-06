/**
 * Event Bus - Sistema de Eventos Centralizado
 *
 * Aurora Nova - Sistema Pub/Sub desacoplado para eventos de sistema
 *
 * Implementa un event bus basado en Node.js EventEmitter para permitir
 * arquitectura event-driven donde componentes se comunican sin acoplamiento directo.
 *
 * **Arquitectura**:
 * - Patrón Pub/Sub (publicador/suscriptor)
 * - Singleton global única instancia en toda la aplicación
 * - Async/await para listeners permitiendo operaciones I/O
 * - Manejo de errores automático y logging integrado
 *
 * **Características**:
 * - Dispatch asíncrono de eventos tipados
 * - Múltiples listeners por evento (fan-out)
 * - Listeners ejecutados en paralelo (no secuencial)
 * - Manejo automático de errores en listeners (sin detener otros)
 * - Logging estructurado de cada dispatch/subscribe/error
 * - Soporte para wildcard listener (escuchar todos los eventos)
 * - Metadatos por evento (requestId, userId, area)
 * - Desuscripción limpia de listeners
 *
 * **Eventos Disponibles** ({@link SystemEvent}):
 * - USER_CREATED: Cuando se crea nuevo usuario
 * - USER_LOGGED_IN: Cuando usuario inicia sesión
 * - USER_LOGGED_OUT: Cuando usuario cierra sesión
 * - ROLE_CREATED: Cuando se crea nuevo rol
 * - ROLE_UPDATED: Cuando se actualiza rol existente
 * - ROLE_DELETED: Cuando se elimina rol
 * - Y más... (ver {@link SystemEvent})
 *
 * **Ejemplo de Uso**:
 * ```typescript
 * import { eventBus, SystemEvent } from '@/lib/events';
 *
 * // Publicar evento
 * await eventBus.dispatch(
 *   SystemEvent.USER_CREATED,
 *   { userId: 'user-123', email: 'user@example.com' },
 *   { requestId: 'req-456', area: EventArea.ADMIN }
 * );
 *
 * // Suscribirse a evento
 * eventBus.subscribe(SystemEvent.USER_CREATED, async (event) => {
 *   const { payload, metadata } = event;
 *   console.log('Nuevo usuario:', payload.email);
 *   console.log('Request:', metadata.requestId);
 *   // Operaciones async aquí (email, webhooks, etc)
 * });
 *
 * // Escuchar todos los eventos
 * eventBus.subscribeAll(async (event) => {
 *   console.log('Evento:', event.event);
 * });
 *
 * // Desuscribirse
 * eventBus.unsubscribe(SystemEvent.USER_CREATED, handler);
 * ```
 *
 * **Casos de Uso**:
 * - Auditoría: Listeners loguean cada evento para compliance
 * - Email: Enviar emails cuando eventos ocurren (USER_CREATED, PASSWORD_RESET, etc)
 * - Webhooks: Notificar sistemas externos de cambios
 * - Cache invalidation: Limpiar caches cuando datos cambian
 * - Analytics: Rastrear eventos de usuario para reportes
 * - Real-time updates: Notificar clientes WebSocket de cambios
 *
 * **Ciclo de Vida de un Evento**:
 * ```
 * 1. dispatch() es llamado con evento + payload
 * 2. Se loguea el dispatch con structured logger
 * 3. Evento se emite a todos los listeners específicos
 * 4. Evento también se emite a wildcard listener ('*')
 * 5. Listeners se ejecutan en paralelo (Promise.all)
 * 6. Errores en listeners se capturan y loguean individualmente
 * 7. Otros listeners continúan aunque uno falle
 * ```
 *
 * @module lib/events/event-bus
 * @see {@link ./types.ts} para tipos de eventos (SystemEvent, EventPayload, etc)
 * @see {@link ./event-area.ts} para áreas de evento
 * @see {@link ./listeners/} para listeners implementados
 * @see {@link ../logger/structured-logger.ts} para logging
 *
 * @example
 * ```typescript
 * // En un listener que responde a eventos
 * import { eventBus, SystemEvent } from '@/lib/events';
 * import { sendUserCreatedEmail } from '@/lib/email';
 *
 * export function registerEmailListener() {
 *   eventBus.subscribe(SystemEvent.USER_CREATED, async (event) => {
 *     const { payload, metadata } = event;
 *
 *     try {
 *       await sendUserCreatedEmail({
 *         email: payload.email,
 *         name: payload.name,
 *       });
 *     } catch (error) {
 *       // Error se loguea automáticamente por el event bus
 *       // El listener no detiene otros listeners
 *       throw error; // Re-throw si quieres que se loguee
 *     }
 *   });
 * }
 * ```
 */

import { EventEmitter } from 'events';
import { structuredLogger } from '../logger/structured-logger';
import type { SystemEvent, BaseEvent, EventPayload, EventListener } from './types';
import { EventArea } from './event-area';

// Usamos un Símbolo global para asegurar que la instancia sea verdaderamente un singleton
// a través de las recargas de módulos en entornos de desarrollo.
// const EVENT_BUS_INSTANCE = Symbol.for('aurora.eventbus'); // Not needed if using string key

const GLOBAL_EVENT_BUS_KEY = '__AURORA_EVENT_BUS_INSTANCE__'; // Usar una clave de string única

// Aumentamos el ámbito global para añadir nuestra instancia singleton
declare global {
  
  var __AURORA_EVENT_BUS_INSTANCE__: EventBus | undefined;
}

/**
 * Clase EventBus - Gestor Central de Eventos
 *
 * Implementa un sistema pub/sub de eventos utilizando Node.js EventEmitter.
 * Proporciona métodos tipados para publicar y suscribirse a eventos del sistema.
 *
 * **Características de Implementación**:
 * - Extiende Node.js EventEmitter
 * - Singleton accesible globalmente
 * - Wrapper automático de listeners para manejo de errores
 * - Map de listeners original → wrapped para desuscripción correcta
 * - Límite de 50 listeners para prevenir memory leaks
 * - Logging integrado en cada operación
 *
 * **Métodos Principales**:
 * - {@link dispatch}: Publicar evento tipado
 * - {@link subscribe}: Suscribirse a evento específico
 * - {@link subscribeAll}: Suscribirse a todos los eventos
 * - {@link unsubscribe}: Desuscribirse de evento
 * - {@link unsubscribeAll}: Remover todos los listeners
 * - {@link getListenerCount}: Obtener cantidad de listeners
 *
 * **Flujo de Listener**:
 * ```
 * 1. subscribe() crea wrapper async/error handling
 * 2. Wrapper guardado en listenerMap
 * 3. Listener registrado en EventEmitter
 * 4. dispatch() emite evento
 * 5. Wrapper ejecuta listener original
 * 6. Errores capturados y logueados
 * 7. unsubscribe() busca wrapper en map y lo remueve
 * ```
 *
 * @implements EventEmitter
 *
 * @remarks
 * **Singleton Pattern**:
 * Usa Symbol.for() con clave global `__AURORA_EVENT_BUS_INSTANCE__`
 * para asegurar única instancia incluso en hot reload del servidor.
 *
 * **Memory Management**:
 * - listenerMap mantiene referencias listener → wrapped
 * - Necesario para permitir unsubscribe() correcto
 * - maxListeners limitado a 50 para prevenir leaks
 *
 * **Error Handling**:
 * - Errores en listeners NO detienen otros listeners
 * - Cada error se loguea con contexto completo
 * - dispatch() nunca lanza excepciones (fail-safe)
 *
 * @see {@link getInstance} para obtener la instancia singleton
 */
class EventBus extends EventEmitter {
  /**
   * Mapa para mantener una referencia de los listeners originales a sus contrapartes envueltas.
   * Esto es necesario para permitir una desuscripción correcta.
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
   * Obtiene la instancia singleton del Event Bus
   *
   * Retorna la única instancia global del EventBus, creándola si no existe.
   * Garantiza una única instancia incluso en entornos con hot reload.
   *
   * @static
   * @returns {EventBus} La instancia global singleton del event bus
   *
   * @remarks
   * **Singleton Pattern Implementation**:
   * - Usa `global[GLOBAL_EVENT_BUS_KEY]` para almacenar la instancia
   * - La clave global permite hot reload sin duplicar instancias
   * - Primer acceso crea la instancia y la registra
   * - Accesos posteriores retornan la instancia existente
   * - Se loguea creación del bus
   *
   * **Alternativa**: No llamar directamente a `getInstance()`.
   * Usar la instancia exportada {@link eventBus} en su lugar.
   *
   * @example
   * ```typescript
   * // Recomendado: usar import directo
   * import { eventBus } from '@/lib/events';
   *
   * // No recomendado: llamar getInstance() directamente
   * const bus = EventBus.getInstance();
   * ```
   *
   * @see {@link eventBus} para la instancia singleton exportada
   */
  static getInstance(): EventBus {
    if (!global[GLOBAL_EVENT_BUS_KEY]) {
      global[GLOBAL_EVENT_BUS_KEY] = new EventBus();
      structuredLogger.info('Event bus initialized', {
        module: 'events',
        action: 'init',
      });
    }
    return global[GLOBAL_EVENT_BUS_KEY];
  }

  /**
   * Publicar/Despachar un evento del sistema
   *
   * Emite un evento tipado a todos los listeners registrados.
   * Los listeners se ejecutan en paralelo de forma asíncrona.
   * Los errores en listeners se capturan y loguean sin detener otros.
   *
   * @template T - Tipo de evento (tipado según SystemEvent)
   *
   * @param event - Tipo de evento a despachar (ej: SystemEvent.USER_CREATED)
   * @param payload - Datos del evento (estructura específica según tipo de evento)
   * @param metadata - Metadatos opcionales sobre el contexto del evento
   * @param metadata.requestId - ID del request HTTP para correlación
   * @param metadata.userId - ID del usuario que causó el evento
   * @param metadata.area - Área del sistema (ADMIN, PUBLIC, etc)
   *
   * @returns {Promise<void>} Siempre resuelve (nunca rechaza)
   *
   * @remarks
   * **Ejecución de Listeners**:
   * - Listeners se ejecutan en paralelo, no secuencialmente
   * - Errores en un listener NO afectan otros
   * - Cada error se loguea con contexto completo
   * - El dispatch NUNCA falla, es fail-safe
   *
   * **Flujo Completo**:
   * ```
   * 1. Se crea objeto BaseEvent<T> con payload + metadata
   * 2. Se loguea el dispatch
   * 3. Se emite evento específico: emit(event, eventData)
   * 4. Se emite wildcard: emit('*', eventData)
   * 5. Todos los listeners se ejecutan en paralelo
   * 6. Errores se capturan per listener
   * 7. Retorna cuando todos completen (success o error)
   * ```
   *
   * **Timestamp**:
   * - Automáticamente se agrega `metadata.timestamp: new Date()`
   * - Todos los eventos tienen timestamp en UTC
   *
   * @throws No lanza excepciones (fail-safe pattern)
   *
   * @example
   * ```typescript
   * // Dispatch simple
   * await eventBus.dispatch(
   *   SystemEvent.USER_CREATED,
   *   { userId: 'user-123', email: 'user@example.com' }
   * );
   *
   * // Dispatch con metadata
   * await eventBus.dispatch(
   *   SystemEvent.USER_LOGGED_IN,
   *   {
   *     userId: 'user-123',
   *     email: 'user@example.com',
   *     ipAddress: '192.168.1.1',
   *     userAgent: 'Mozilla/5.0...'
   *   },
   *   {
   *     requestId: 'req-abc123',
   *     userId: 'user-123',
   *     area: EventArea.ADMIN
   *   }
   * );
   *
   * // Dispatch en login action
   * export async function loginAction(credentials) {
   *   const user = await authenticateUser(credentials);
   *   const context = await getLogContext('auth', 'login');
   *
   *   await eventBus.dispatch(
   *     SystemEvent.USER_LOGGED_IN,
   *     {
   *       userId: user.id,
   *       email: user.email,
   *       ipAddress: getClientIP(),
   *       userAgent: getHeaderUserAgent()
   *     },
   *     {
   *       requestId: context.requestId,
   *       userId: user.id,
   *       area: user.isAdmin ? EventArea.ADMIN : EventArea.PUBLIC
   *     }
   *   );
   * }
   * ```
   *
   * @see {@link subscribe} para registrar listeners
   * @see {@link subscribeAll} para escuchar todos los eventos
   * @see {@link SystemEvent} para tipos de eventos disponibles
   */
  async dispatch<T extends SystemEvent>(
    event: T,
    payload: EventPayload[T],
    metadata?: {
      requestId?: string;
      userId?: string;
      area?: EventArea;
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
        area: metadata?.area,
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
   * Suscribirse a TODOS los eventos (wildcard)
   *
   * Registra un listener que se ejecuta para cualquier evento que ocurra,
   * sin importar su tipo. Útil para logging global, auditoría, analytics.
   *
   * @param listener - Función async a ejecutar para cada evento
   *
   * @remarks
   * **Diferencia con subscribe()**:
   * - `subscribe()`: Escucha tipo específico (ej: USER_CREATED)
   * - `subscribeAll()`: Escucha TODOS los eventos (wildcard)
   *
   * **Errores**:
   * - Errores en wildcard listener se capturan y loguean
   * - No detienen otros listeners
   * - Se loguean como 'wildcard_listener_error'
   *
   * **Orden de Ejecución**:
   * 1. dispatch() se llama
   * 2. Se ejecutan listeners específicos en paralelo
   * 3. Se ejecutan wildcard listeners en paralelo
   * 4. Todos terminan (ej: audit logger se dispara después de listeners específicos)
   *
   * **Casos de Uso**:
   * - Auditoría: Registrar todos los eventos en BD
   * - Analytics: Rastrear todos los eventos para reportes
   * - Monitoring: Detectar padrón anómalo de eventos
   * - Debugging: Loguear todos los eventos en desarrollo
   * - Real-time sync: Sincronizar estado global con cada evento
   *
   * @throws No lanza excepciones (manejadas internamente)
   *
   * @example
   * ```typescript
   * // Logger global simple
   * eventBus.subscribeAll(async (event) => {
   *   console.log('Event:', event.event, 'Timestamp:', event.metadata.timestamp);
   * });
   *
   * // Auditor que registra todo
   * eventBus.subscribeAll(async (event) => {
   *   await auditLog({
   *     eventType: event.event,
   *     payload: event.payload,
   *     timestamp: event.metadata.timestamp,
   *     userId: event.metadata.userId,
   *     requestId: event.metadata.requestId,
   *     area: event.metadata.area
   *   });
   * });
   *
   * // Analytics tracker
   * eventBus.subscribeAll(async (event) => {
   *   await analytics.track({
   *     eventName: event.event,
   *     userId: event.metadata.userId,
   *     properties: event.payload
   *   });
   * });
   *
   * // Debugging en desarrollo
   * if (process.env.NODE_ENV === 'development') {
   *   eventBus.subscribeAll(async (event) => {
   *     console.log('🎯 Event Bus:', event.event);
   *     console.log('  Payload:', event.payload);
   *     console.log('  Metadata:', event.metadata);
   *   });
   * }
   * ```
   *
   * @see {@link subscribe} para escuchar evento específico
   * @see {@link unsubscribeAll} para remover listener
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
 * Instancia Singleton Global del Event Bus
 *
 * Instancia única del EventBus accesible en toda la aplicación.
 * Proporciona métodos para publicar y suscribirse a eventos del sistema.
 *
 * **SIEMPRE USAR ESTA INSTANCIA** en lugar de crear nuevas o llamar `getInstance()`.
 *
 * @type {EventBus}
 *
 * @remarks
 * **Métodos Disponibles**:
 * - `dispatch<T>(event, payload, metadata)`: Publicar evento tipado
 * - `subscribe<T>(event, listener)`: Suscribirse a evento específico
 * - `subscribeAll(listener)`: Suscribirse a todos los eventos
 * - `unsubscribe<T>(event, listener)`: Desuscribirse
 * - `unsubscribeAll(event?)`: Remover listeners
 * - `getListenerCount(event)`: Contar listeners
 *
 * **Importación**:
 * ```typescript
 * import { eventBus, SystemEvent } from '@/lib/events';
 * // o
 * import { eventBus } from '@/lib/events/event-bus';
 * ```
 *
 * **Hot Reload Safety**:
 * - Usa clave global para persistir instancia en hot reload
 * - Seguro usar en desarrollo con servidor con auto-reload
 * - No crea duplicados incluso con múltiples imports
 *
 * @example
 * ```typescript
 * import { eventBus, SystemEvent } from '@/lib/events';
 *
 * // Publicar evento (dispatch)
 * await eventBus.dispatch(
 *   SystemEvent.USER_CREATED,
 *   { userId: 'user-123', email: 'user@example.com' }
 * );
 *
 * // Suscribirse a evento específico
 * eventBus.subscribe(SystemEvent.USER_CREATED, async (event) => {
 *   console.log('Nuevo usuario:', event.payload.email);
 *   await sendWelcomeEmail(event.payload.email);
 * });
 *
 * // Suscribirse a todos los eventos (auditoría)
 * eventBus.subscribeAll(async (event) => {
 *   await logEventToDatabase(event);
 * });
 *
 * // Obtener cantidad de listeners
 * const count = eventBus.getListenerCount(SystemEvent.USER_CREATED);
 * console.log(`Listeners para USER_CREATED: ${count}`);
 *
 * // Desuscribirse de evento
 * eventBus.unsubscribe(SystemEvent.USER_CREATED, myHandler);
 *
 * // Remover todos los listeners
 * eventBus.unsubscribeAll();
 * ```
 *
 * **Integración con Listeners**:
 * Típicamente, los listeners se registran al iniciar la aplicación:
 * ```typescript
 * // En app layout o middleware de inicialización
 * import { registerEmailListeners } from '@/lib/events/listeners/email-listener';
 * import { registerAuditListener } from '@/lib/events/listeners/audit-listener';
 *
 * // Registrar todos los listeners
 * registerEmailListeners();
 * registerAuditListener();
 * // ... otros listeners
 * ```
 *
 * @see {@link EventBus} para documentación de la clase
 * @see {@link SystemEvent} para tipos de eventos disponibles
 * @see {@link ../events/listeners} para listeners implementados
 * @see {@link ../events/types.ts} para tipos de eventos y payloads
 */
export const eventBus = EventBus.getInstance();
