# Plan de Implementación: Módulo de Notificaciones

| ID | Tarea | Descripción | Dependencias | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **Fase 1: Infraestructura de Base de Datos** |
| T01 | Diseñar y Crear Tabla de Plantillas | Añadir el modelo `NotificationTemplate` a `prisma/schema.prisma` con campos para `id`, `name`, `subject`, `body` (formato Mustache) y `type` (ej. 'EMAIL'). | - | 🟡 Pendiente |
| T02 | Diseñar y Crear Tabla de Eventos | Añadir el modelo `NotificationEvent` a `prisma/schema.prisma`. Debe incluir `id`, `type` (ej. 'user.password_reset'), `payload` (JSON con datos), `status` ('PENDING', 'PROCESSED', 'FAILED'), `attempts`. | - | 🟡 Pendiente |
| T03 | Crear Migración de BD | Generar y aplicar la migración para crear las nuevas tablas. | T01, T02 | 🟡 Pendiente |
| **Fase 2: Lógica de Publicación de Eventos** |
| T04 | Crear Acción para Publicar Eventos | Crear una Server Action `publishNotificationEvent(type, payload)` que inserte un nuevo registro en la tabla `NotificationEvent` con estado 'PENDING'. | T02 | 🟡 Pendiente |
| T05 | Refactorizar Flujo de Contraseña | Modificar la Server Action `requestPasswordReset` para que, en lugar de enviar el correo directamente, llame a `publishNotificationEvent` con los datos necesarios. | T04 | 🟡 Pendiente |
| **Fase 3: Implementación del Worker** |
| T06 | Crear Script del Worker | Crear un nuevo archivo `scripts/notification-worker.ts` que contendrá la lógica del proceso en segundo plano. | - | 🟡 Pendiente |
| T07 | Implementar Lógica de Sondeo (Polling) | El worker debe consultar la tabla `NotificationEvent` cada X segundos en busca de eventos con estado 'PENDING'. | T06 | 🟡 Pendiente |
| T08 | Implementar Procesamiento de Eventos | Para cada evento, el worker debe: 1. Buscar la plantilla. 2. Renderizarla con Mustache y los datos del `payload`. 3. Usar el `emailService` para enviarla. 4. Actualizar el estado del evento a 'PROCESSED'. | T01, T07 | 🟡 Pendiente |
| T09 | Implementar Manejo de Errores y Reintentos | Si el envío falla, el worker debe incrementar el contador `attempts` y actualizar el estado a 'FAILED' si se supera un umbral de reintentos. | T08 | 🟡 Pendiente |
| T10 | Implementar Bloqueo de Eventos (Locking) | Para evitar que múltiples workers procesen el mismo evento, se debe actualizar el estado del evento a 'PROCESSING' antes de empezar a trabajar en él. | T07 | 🟡 Pendiente |
| **Fase 4: Gestión de Plantillas (Admin UI)** |
| T11 | Crear API para CRUD de Plantillas | Implementar endpoints en `/api/admin/notification-templates` para crear, leer, actualizar y eliminar plantillas. | T01 | 🟡 Pendiente |
| T12 | Crear UI de Gestión de Plantillas | Desarrollar una nueva sección en el área de administración con una tabla para listar las plantillas y formularios para crearlas/editarlas. | T11 | 🟡 Pendiente |
| **Fase 5: Despliegue y Operaciones** |
| T13 | Documentar Ejecución del Worker | Actualizar la documentación de despliegue para explicar cómo ejecutar el worker como un servicio persistente (ej. con `pm2` o `systemd`). | T06 | 🟡 Pendiente |
