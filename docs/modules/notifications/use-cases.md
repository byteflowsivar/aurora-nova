# Casos de Uso y Requerimientos del Módulo de Notificaciones

## Casos de Uso Principales

| ID | Como un... | Quiero... | Para... |
| :--- | :--- | :--- | :--- |
| **UC-01** | Administrador | Crear y editar plantillas de correo desde una interfaz | Poder cambiar el texto de los correos de bienvenida o de reinicio de contraseña sin pedir cambios en el código. |
| **UC-02** | Usuario | Solicitar un reinicio de contraseña | Recibir un correo electrónico con un enlace para establecer una nueva contraseña. |
| **UC-03** | Sistema | Enviar una notificación de forma asíncrona | No bloquear la acción del usuario y poder reintentar el envío si falla. |
| **UC-04** | Desarrollador | Disparar una notificación con una sola línea de código (ej. `publishNotificationEvent(...)`) | Integrar fácilmente el sistema de notificaciones en nuevos flujos de la aplicación. |
| **UC-05** | DevOps/Admin | Escalar el worker de notificaciones independientemente de la aplicación web | Ajustar la capacidad de procesamiento según el volumen de notificaciones sin afectar los recursos de la web. |
| **UC-06** | DevOps/Admin | Monitorear la salud y performance del worker de notificaciones | Detectar y responder a fallos del worker antes de que impacten a los usuarios. |

## Requerimientos

### Funcionales (FR)
*   **FR-01:** El sistema debe permitir almacenar plantillas de notificación en la base de datos.
*   **FR-02:** Las plantillas (`NotificationTemplate`) deben tener un `name` (identificador de negocio, ej. `password-reset-v1`), un `type` (canal, ej. `EMAIL`), un `subject` y un `body`.
*   **FR-03:** El cuerpo de las plantillas debe soportar variables usando la sintaxis de Mustache (ej. `{{userName}}`).
*   **FR-04:** El sistema debe proveer una tabla `notification_events` que funcione como registro de auditoría de eventos de notificación.
*   **FR-05:** Un evento en `notification_events` debe contener, como mínimo, `event_name` (el suceso de negocio), `channel` (el canal de entrega como `EMAIL` o `SMS`), `payload` (los datos para la plantilla) y `status` (estado del procesamiento).
*   **FR-06:** Debe existir un proceso "worker" independiente que consuma jobs de pg-boss para procesar notificaciones.
*   **FR-07:** El worker debe poder actualizar el estado de eventos en `notification_events` como `SENT`, `FAILED` o `PENDING`.
*   **FR-08:** El sistema debe usar pg-boss como motor de cola para gestionar el procesamiento asíncrono de notificaciones.
*   **FR-09:** La aplicación web debe poder publicar eventos de notificación mediante pg-boss sin conocer detalles de implementación del envío.

### No Funcionales (NFR)
*   **NFR-01 (Rendimiento):** La publicación de un evento en la cola no debe añadir más de 50ms de latencia a la solicitud original del usuario.
*   **NFR-02 (Resiliencia):** El sistema debe soportar un mecanismo de reintentos automáticos para eventos que fallen debido a errores transitorios (ej. API de correo no disponible). pg-boss debe configurarse con exponential backoff y dead letter queue.
*   **NFR-03 (Seguridad):** El worker debe ser el único proceso con acceso a las credenciales del servicio de correo.
*   **NFR-04 (Extensibilidad):** El diseño debe permitir añadir nuevos canales de notificación (ej. SMS, PUSH) en el futuro sin requerir una refactorización masiva.
*   **NFR-05 (Disponibilidad):** El worker debe ejecutarse como un servicio independiente que pueda reiniciarse sin afectar la disponibilidad de la aplicación web.
*   **NFR-06 (Escalabilidad):** El sistema debe soportar múltiples instancias del worker procesando jobs en paralelo sin conflictos (locking distribuido).
*   **NFR-07 (Observabilidad):** El worker debe exponer métricas de salud (health checks) y logging estructurado para facilitar debugging y monitoreo.
*   **NFR-08 (Mantenibilidad):** Los deployments del worker y de la aplicación web deben poder realizarse de forma independiente.
*   **NFR-09 (Infraestructura):** El sistema no debe requerir infraestructura adicional más allá de PostgreSQL (sin Redis, sin servicios externos de cola).
