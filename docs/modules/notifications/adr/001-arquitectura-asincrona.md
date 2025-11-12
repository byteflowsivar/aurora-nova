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

## 3. Implementación: pg-boss como Motor de Cola

### 3.1. Elección de Tecnología

Después de evaluar diferentes alternativas (polling manual, BullMQ + Redis, Vercel Cron), se ha decidido utilizar **pg-boss** como motor de procesamiento de la cola por las siguientes razones:

*   **Sin Infraestructura Adicional:** pg-boss utiliza PostgreSQL como backend, aprovechando la base de datos existente sin necesidad de Redis u otros servicios.
*   **Resiliencia Integrada:** Incluye locking distribuido, reintentos con exponential backoff, y dead letter queue de forma nativa.
*   **Escalabilidad Horizontal:** Múltiples workers pueden procesar jobs en paralelo sin configuración adicional.
*   **Volumen Inicial:** Para el volumen esperado inicial (~100 notificaciones/día), pg-boss está sobre-dimensionado, permitiendo crecimiento sin refactorización.
*   **Schema Organizado:** Permite configurar un prefijo o schema dedicado para sus tablas (`pgboss_*`), manteniendo el esquema de base de datos limpio.

### 3.2. Arquitectura Híbrida

La implementación combina dos elementos complementarios:

1.  **Tabla `notification_events` (Auditoría):** Registro histórico y de negocio de todas las notificaciones. Sirve como "source of truth" para queries, compliance y debugging.

2.  **Tablas de pg-boss (Motor Transaccional):** Sistema de cola que gestiona el procesamiento, reintentos, y estados transitorios de los jobs.

**Flujo de Procesamiento:**

```
[Server Action]
    → INSERT en notification_events (status: PENDING)
    → pg-boss.send('notification.EMAIL', payload)
    → Worker consume job desde pg-boss
    → Procesa y envía notificación
    → UPDATE notification_events (status: SENT/FAILED)
    → pg-boss marca job como completado/fallido
```

Esta arquitectura separa las responsabilidades:
*   **notification_events:** Historial inmutable del negocio
*   **pg-boss:** Motor efímero de procesamiento

### 3.3. Configuración de pg-boss

```javascript
// Configuración en schema público con prefijo
const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  schema: 'public',  // Usa el schema público
  // Las tablas se crearán con prefijo: pgboss_job, pgboss_archive, etc.
});
```

## 4. Consecuencias

### Positivas
*   **Mejora Radical de la Experiencia de Usuario (UX):** Las respuestas a las acciones del usuario son instantáneas, ya que la notificación se procesa en segundo plano.
*   **Alta Resiliencia:** Si el servicio de correo falla, el evento permanece en la cola y puede ser reintentado automáticamente por el worker, sin que la acción original del usuario se vea afectada.
*   **Desacoplamiento:** La lógica de negocio solo necesita saber cómo publicar un evento, no cómo se envía un correo, qué plantilla se usa o qué servicio se emplea.
*   **Escalabilidad:** Si el volumen de notificaciones crece, se pueden añadir más instancias del worker para procesar la cola en paralelo.
*   **Reintentos Robustos:** pg-boss maneja reintentos con exponential backoff y dead letter queue automáticamente.
*   **Sin Infraestructura Adicional:** No requiere Redis, colas externas, ni servicios de terceros.
*   **Producción-Ready:** pg-boss es una librería madura, battle-tested y usada en producción por múltiples empresas.

### Negativas
*   **Mayor Complejidad de Infraestructura:** Requiere la gestión de un proceso "worker" adicional, que debe ser monitorizado para asegurar que siempre esté en ejecución.
*   **Consistencia Eventual:** La notificación no es instantánea. Habrá un pequeño retraso (de segundos a minutos, dependiendo de la carga) entre la acción del usuario y la recepción del correo. Esto es aceptable para la mayoría de los casos de uso de notificaciones.
*   **Tablas Adicionales:** pg-boss crea aproximadamente 5 tablas en la base de datos (`pgboss_*`), aunque están claramente namespaceadas.
*   **Abstracción Extra:** Hay una capa adicional entre el código de negocio y la base de datos, lo que puede dificultar el debugging inicial.
*   **Dependencia Externa:** Se añade pg-boss como dependencia crítica del sistema.
