# Guía Técnica: Arquitectura Dirigida por Evendos (EDA)

**Proyecto:** Aurora Nova - Application Base
**Fecha**: 2025-11-30
**Versión**: 1.0

---

## 1. Visión General

La aplicación base de Aurora Nova implementa una **Arquitectura Dirigida por Eventos (EDA)** para desacoplar los componentes del sistema y mejorar la extensibilidad. En lugar de que un servicio llame directamente a otro, emite un evento. Otros servicios, llamados "listeners", se suscriben a estos eventos y reaccionan a ellos de forma asíncrona.

### Beneficios de este Diseño
- **Desacoplamiento**: El servicio que crea un usuario no necesita saber cómo se envía un email de bienvenida o cómo se registra una auditoría. Simplemente emite el evento `USER_CREATED`.
- **Extensibilidad**: Añadir una nueva funcionalidad (ej. enviar una notificación a Slack) solo requiere crear un nuevo listener, sin modificar el código existente.
- **Resiliencia**: Los listeners se ejecutan de forma independiente. Un fallo en el envío de un email no interrumpe el flujo principal de la aplicación.
- **Escalabilidad**: En el futuro, este sistema puede migrar fácilmente a un message broker más robusto (como RabbitMQ o Redis Pub/Sub) si la carga de trabajo lo requiere.

### Componentes Principales
1.  **Event Bus (`event-bus.ts`)**: Un singleton basado en el `EventEmitter` de Node.js que gestiona la emisión y suscripción de eventos.
2.  **Catálogo de Eventos (`types.ts`)**: Un enum `SystemEvent` que define todos los eventos posibles en la aplicación, actuando como un registro centralizado.
3.  **Payloads Tipados (`types.ts`)**: La interfaz `EventPayload` proporciona tipado estricto para los datos asociados a cada evento, garantizando la seguridad de tipos en todo el flujo.
4.  **Listeners (`listeners/`)**: Clases que contienen la lógica para reaccionar a los eventos. Se suscriben a uno o más eventos en el Event Bus.

---

## 2. Guía de Uso para Desarrolladores

A continuación se detalla el paso a paso para reutilizar y extender el sistema de eventos.

### Paso 1: Despachar un Evento Existente

Esta es la tarea más común. La realizas cuando quieres que una acción en tu código dispare procesos secundarios.

**Ejemplo**: Quieres emitir un evento `USER_DELETED` desde un Server Action.

1.  **Importa el `eventBus` y `SystemEvent`**:
    ```typescript
    // En tu server action, ej: src/actions/users.ts
    import { eventBus, SystemEvent } from '@/lib/events';
    import { getLogContext } from '@/lib/logger/helpers'; // Para metadata
    ```

2.  **Despacha el evento** después de que la acción principal se complete exitosamente:
    ```typescript
    export async function deleteUser(userId: string) {
      const performingUserId = await requireAuth(); // Quien realiza la acción
      const context = await getLogContext('users', 'delete');
    
      try {
        const userToDelete = await prisma.user.findUnique({ where: { id: userId } });
    
        if (!userToDelete) {
          return errorResponse('Usuario no encontrado');
        }
    
        await prisma.user.delete({ where: { id: userId } });
    
        // ----------------------------------------------------
        // DESPACHAR EL EVENTO
        // ----------------------------------------------------
        await eventBus.dispatch(
          SystemEvent.USER_DELETED,
          {
            userId: userToDelete.id,
            email: userToDelete.email,
            deletedBy: performingUserId, // El admin que lo eliminó
          },
          {
            requestId: context.requestId,
            userId: performingUserId,
          }
        );
        // ----------------------------------------------------
    
        return successResponse(null, 'Usuario eliminado');
    
      } catch (error) {
        // ... manejo de errores
      }
    }
    ```

**Anatomía de `eventBus.dispatch`**:
- **Primer argumento**: El tipo de evento (`SystemEvent.USER_DELETED`). TypeScript te ayudará a elegir uno del catálogo.
- **Segundo argumento**: El `payload`. Debe coincidir con la estructura definida en `EventPayload` para ese evento. Esto te da autocompletado y seguridad de tipos.
- **Tercer argumento (opcional)**: `metadata` para trazabilidad, como `requestId` y `userId` (el actor que origina el evento).

### Paso 2: Crear un Nuevo Listener

Si necesitas que la aplicación reaccione a un evento de una manera nueva (ej. enviar una notificación push), debes crear un "listener".

**Ejemplo**: Crear un `NotificationListener` que simplemente loguea un mensaje cuando un rol es creado.

1.  **Crea el archivo del listener**:
    Crea un nuevo archivo en `src/lib/events/listeners/notification-listener.ts`.

2.  **Implementa la clase del listener**:
    ```typescript
    // src/lib/events/listeners/notification-listener.ts
    
    import { eventBus, SystemEvent, type BaseEvent } from '@/lib/events';
    import { structuredLogger } from '@/lib/logger';
    
    /**
     * Listener de ejemplo para enviar notificaciones internas.
     */
    export class NotificationListener {
      /**
       * Registra los eventos a los que este listener se suscribirá.
       */
      register() {
        eventBus.subscribe(SystemEvent.ROLE_CREATED, this.onRoleCreated);
    
        structuredLogger.info('Notification event listeners registered', {
          module: 'events',
          action: 'register_notification_listeners',
        });
      }
    
      /**
       * Handler para el evento ROLE_CREATED.
       * Es una función de flecha para mantener el contexto de `this`.
       */
      private onRoleCreated = async (
        event: BaseEvent<SystemEvent.ROLE_CREATED>
      ): Promise<void> => {
        
        const { roleId, name, createdBy } = event.payload;
        const { requestId } = event.metadata;
    
        // Aquí iría la lógica para enviar una notificación (ej. a un sistema interno, Slack, etc.)
        structuredLogger.info('📢 Nueva Notificación: Rol Creado', {
          module: 'notifications',
          action: 'process_event',
          requestId,
          metadata: {
            message: `El rol "${name}" (ID: ${roleId}) fue creado por el usuario ${createdBy}.`,
          },
        });
    
        // Simula una operación asíncrona
        await new Promise(resolve => setTimeout(resolve, 50));
      };
    }
    ```
    **Puntos clave del código**:
    - El método `register` centraliza todas las suscripciones del listener.
    - El método `onRoleCreated` es el "handler". Recibe el objeto `event` completo, con `payload` y `metadata` tipados.
    - Se usa una función de flecha (`private onRoleCreated = async (...) => ...`) para asegurar que `this` funcione correctamente si se usaran propiedades de la clase.

### Paso 3: Registrar el Nuevo Listener

Para que tu listener se active, debes instanciarlo y registrarlo en el punto de entrada del sistema de eventos.

1.  **Abre el archivo de inicialización**:
    Navega a `src/lib/events/index.ts`.

2.  **Importa y registra tu nuevo listener**:
    ```typescript
    // src/lib/events/index.ts
    
    import { EmailEventListener } from './listeners/email-listener';
    import { AuditEventListener } from './listeners/audit-listener';
    import { NotificationListener } from './listeners/notification-listener'; // 👈 1. Importa tu listener
    import { structuredLogger } from '../logger/structured-logger';
    
    let listenersInitialized = false;
    
    export function initializeEventListeners() {
      if (listenersInitialized) {
        return;
      }
    
      // ...
    
      // Email listener
      const emailListener = new EmailEventListener();
      emailListener.register();
    
      // Audit listener
      const auditListener = new AuditEventListener();
      auditListener.register();
    
      // 👇 2. Instancia y registra tu nuevo listener
      const notificationListener = new NotificationListener();
      notificationListener.register();
    
      structuredLogger.info('All event listeners initialized successfully', {
        module: 'events',
        action: 'init_complete',
      });
    
      listenersInitialized = true;
    }
    
    // ...
    ```
¡Eso es todo! La próxima vez que se cree un rol, tu `NotificationListener` se activará automáticamente.

### (Opcional) Paso 4: Definir un Nuevo Evento

Si ninguna de las acciones en `SystemEvent` se ajusta a tu necesidad, puedes crear un nuevo evento.

**Ejemplo**: Añadir un evento para cuando un reporte es exportado.

1.  **Añade el evento al enum `SystemEvent`**:
    Abre `src/lib/events/types.ts` y agrega una nueva entrada al enum.
    ```typescript
    // src/lib/events/types.ts
    export enum SystemEvent {
      // ... otros eventos
      CONCURRENT_SESSION_DETECTED = 'session.concurrent_detected',
    
      // 👇 Nuevo evento
      REPORT_EXPORTED = 'report.exported',
    }
    ```
    **Convención**: Usa el formato `entidad.verbo_en_pasado` (ej. `user.created`).

2.  **Define el `payload` para tu nuevo evento**:
    En el mismo archivo, añade una entrada a la interfaz `EventPayload` con los datos que tu evento necesita transportar.
    ```typescript
    // src/lib/events/types.ts
    export interface EventPayload {
      // ... otros payloads
    
      [SystemEvent.CONCURRENT_SESSION_DETECTED]: {
        // ...
      };
    
      // 👇 Payload para el nuevo evento
      [SystemEvent.REPORT_EXPORTED]: {
        reportId: string;
        reportName: string;
        format: 'pdf' | 'csv' | 'xlsx';
        exportedBy: string; // userId
      };
    }
    ```

Con esto, `SystemEvent.REPORT_EXPORTED` ya está disponible para ser despachado y escuchado en toda la aplicación con seguridad de tipos.

---

## 3. Mejores Prácticas

- **Mantén los Listeners Simples y Enfocados**: Cada listener debe tener una única responsabilidad (enviar emails, auditar, notificar, etc.).
- **Manejo de Errores**: El Event Bus ya captura errores dentro de los listeners para no afectar a otros. Sin embargo, dentro de tu listener, asegúrate de loguear errores con suficiente contexto.
- **Idempotencia**: Si es posible, diseña tus listeners para que sean idempotentes (ejecutar el mismo evento dos veces no causa un resultado incorrecto). Esto es útil para sistemas más complejos con reintentos.
- **Nombres de Eventos**: Usa siempre el tiempo pasado (ej. `USER_CREATED`, no `CREATE_USER`). Un evento representa algo que *ya ocurrió*.
- **Payloads**: Incluye solo la información necesaria. En lugar de pasar objetos de Prisma completos, pasa solo los IDs o los campos relevantes.

---

## 4. Ejemplos Existentes en el Código

Para ver implementaciones reales, revisa:
- **`src/lib/events/listeners/email-listener.ts`**: Un excelente ejemplo de cómo un evento (`USER_REGISTERED`) dispara el envío de un email de bienvenida.
- **`src/lib/events/listeners/audit-listener.ts`**: Muestra cómo múltiples eventos del sistema se centralizan en un solo listener para crear un registro de auditoría completo.
