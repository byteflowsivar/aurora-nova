# Casos de Uso y Requerimientos del Módulo de Notificaciones

## Casos de Uso Principales

| ID | Como un... | Quiero... | Para... |
| :--- | :--- | :--- | :--- |
| **UC-01** | Administrador | Crear y editar plantillas de correo desde una interfaz | Poder cambiar el texto de los correos de bienvenida o de reinicio de contraseña sin pedir cambios en el código. |
| **UC-02** | Usuario | Solicitar un reinicio de contraseña | Recibir un correo electrónico con un enlace para establecer una nueva contraseña. |
| **UC-03** | Sistema | Enviar una notificación de forma asíncrona | No bloquear la acción del usuario y poder reintentar el envío si falla. |
| **UC-04** | Desarrollador | Disparar una notificación con una sola línea de código (ej. `publishNotificationEvent(...)`) | Integrar fácilmente el sistema de notificaciones en nuevos flujos de la aplicación. |

## Requerimientos

### Funcionales (FR)
*   **FR-01:** El sistema debe permitir almacenar plantillas de notificación en la base de datos.
*   **FR-02:** Las plantillas (`NotificationTemplate`) deben tener un `name` (identificador de negocio, ej. `password-reset-v1`), un `type` (canal, ej. `EMAIL`), un `subject` y un `body`.
*   **FR-03:** El cuerpo de las plantillas debe soportar variables usando la sintaxis de Mustache (ej. `{{userName}}`).
*   **FR-04:** El sistema debe proveer una tabla `notification_events` que funcione como cola de eventos.
*   **FR-05:** Un evento en la cola (`NotificationEvent`) debe contener, como mínimo, `event_name` (el suceso de negocio), `channel` (el canal de entrega como `EMAIL` o `SMS`) y `payload` (los datos para la plantilla).
*   **FR-06:** Debe existir un proceso "worker" que lea eventos pendientes de la cola.
*   **FR-07:** El worker debe poder marcar eventos como `procesados`, `fallidos` o `pendientes`.

### No Funcionales (NFR)
*   **NFR-01 (Rendimiento):** La publicación de un evento en la cola no debe añadir más de 50ms de latencia a la solicitud original del usuario.
*   **NFR-02 (Resiliencia):** El sistema debe soportar un mecanismo de reintentos para eventos que fallen debido a errores transitorios (ej. API de correo no disponible).
*   **NFR-03 (Seguridad):** El worker debe ser el único proceso con acceso a las credenciales del servicio de correo.
*   **NFR-04 (Extensibilidad):** El diseño debe permitir añadir nuevos canales de notificación (ej. SMS) en el futuro sin requerir una refactorización masiva.
