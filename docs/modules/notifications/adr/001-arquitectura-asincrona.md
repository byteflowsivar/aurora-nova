# ADR-001: Arquitectura Asíncrona Basada en Eventos para Notificaciones

- **Estado:** Propuesto
- **Fecha:** 2025-11-08

## 1. Contexto

La aplicación necesita enviar notificaciones (ej. correos de bienvenida, reinicio de contraseña) como resultado de acciones del usuario. Realizar estas operaciones de forma síncrona (directamente en el flujo de la solicitud del usuario) presenta varios problemas:
*   **Bloqueo de UI:** El usuario debe esperar a que el correo se envíe para recibir una respuesta, lo que degrada la experiencia.
*   **Baja Resiliencia:** Un fallo temporal en el servicio de correo (ej. la API de Gmail está caída) causaría que la acción principal del usuario (ej. registrarse) falle.
*   **Acoplamiento Fuerte:** La lógica de negocio estaría fuertemente acoplada a los detalles de implementación del envío de notificaciones.

## 2. Decisión

Se ha decidido implementar una **arquitectura asíncrona orientada a eventos** para gestionar todas las notificaciones.

1.  **Cola de Eventos en Base de Datos:** Se creará una tabla `notification_events` que actuará como una cola de mensajes persistente.
2.  **Publicación de Eventos:** En lugar de enviar una notificación directamente, los servicios de la aplicación "publicarán" un evento en la tabla `notification_events`. Este evento contendrá una estructura clara para definir el trabajo a realizar:
    *   `event_name`: El nombre del suceso de negocio (ej. `user.password_reset.requested`).
    *   `channel`: El canal de entrega (`EMAIL`, `SMS`, etc.).
    *   `payload`: Un objeto JSON con los datos necesarios para la notificación (ej. `{ "userId": "...", "data": { "token": "..." } }`).
3.  **Proceso "Worker" Despachador (Dispatcher):** Se creará un proceso de larga duración separado (un "worker") que actuará como un despachador:
    a. Sondeará la tabla `notification_events` en busca de eventos pendientes.
    b. Leerá el campo `channel` de cada evento.
    c. Invocará al manejador (handler) correspondiente a ese canal (ej. `emailNotificationHandler`).
    d. El manejador específico se encargará de buscar la plantilla, renderizarla y enviarla.
    e. Finalmente, el worker actualizará el estado del evento (procesado, fallido, etc.).

## 3. Consecuencias

### Positivas
*   **Mejora Radical de la Experiencia de Usuario (UX):** Las respuestas a las acciones del usuario son instantáneas, ya que la notificación se procesa en segundo plano.
*   **Alta Resiliencia:** Si el servicio de correo falla, el evento permanece en la cola y puede ser reintentado automáticamente por el worker, sin que la acción original del usuario se vea afectada.
*   **Desacoplamiento:** La lógica de negocio solo necesita saber cómo publicar un evento, no cómo se envía un correo, qué plantilla se usa o qué servicio se emplea.
*   **Escalabilidad:** Si el volumen de notificaciones crece, se pueden añadir más instancias del worker para procesar la cola en paralelo.

### Negativas
*   **Mayor Complejidad de Infraestructura:** Requiere la gestión de un proceso "worker" adicional, que debe ser monitorizado para asegurar que siempre esté en ejecución.
*   **Consistencia Eventual:** La notificación no es instantánea. Habrá un pequeño retraso (de segundos a minutos, dependiendo de la carga) entre la acción del usuario y la recepción del correo. Esto es aceptable para la mayoría de los casos de uso de notificaciones.
*   **Complejidad de Implementación:** Requiere lógica adicional para el sondeo de la cola, manejo de estados (pendiente, procesando, fallido) y prevención de que dos workers procesen el mismo evento simultáneamente (locking).
