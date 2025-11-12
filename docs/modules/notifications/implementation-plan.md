# Plan de Implementación: Módulo de Notificaciones

## Visión General

Este plan de implementación describe las fases para desarrollar el Módulo de Notificaciones usando:
- **pg-boss** como motor de cola asíncrono
- **Worker independiente** como aplicación separada en Docker
- **Arquitectura híbrida** con `notification_events` para auditoría y tablas de pg-boss para procesamiento

## Fases de Implementación

| ID | Tarea | Descripción | Dependencias | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **Fase 0: Setup de Infraestructura** |
| T00.1 | Crear estructura del proyecto worker | Crear directorio `notification-worker/` con su propio `package.json`, `tsconfig.json` y estructura de carpetas (`src/`, `handlers/`, `config/`). | - | 🟡 Pendiente |
| T00.2 | Instalar dependencias de pg-boss | Instalar `pg-boss` en ambos proyectos (application-base y notification-worker). Versión recomendada: ^9.0.0. | T00.1 | 🟡 Pendiente |
| T00.3 | Configurar Docker para worker | Crear `Dockerfile` para el worker y actualizar `docker-compose.yml` para incluir servicios separados (web, worker, db). | T00.1 | 🟡 Pendiente |
| **Fase 1: Infraestructura de Base de Datos** |
| T01 | Diseñar y Crear Tabla de Plantillas | Añadir el modelo `NotificationTemplate` a `prisma/schema.prisma` con campos para `id`, `name` (ej. `password-reset-v1`), `type` (ej. `EMAIL`), `subject`, y `body`. | - | 🟡 Pendiente |
| T02 | Diseñar y Crear Tabla de Eventos | Añadir el modelo `NotificationEvent` a `prisma/schema.prisma`. Debe incluir `id`, `event_name` (ej. `user.password_reset.requested`), `channel` (ej. `EMAIL`), `payload` (JSON), `status`, `attempts`. | - | 🟡 Pendiente |
| T03 | Crear Migración de BD | Generar y aplicar la migración para crear las nuevas tablas. | T01, T02 | 🟡 Pendiente |
| **Fase 2: Lógica de Publicación de Eventos** |
| T04.1 | Configurar pg-boss en application-base | Crear servicio/módulo `NotificationPublisher` que inicialice pg-boss y exponga métodos para publicar eventos. Configurar schema `public` con prefijo `pgboss_`. | T00.2, T03 | 🟡 Pendiente |
| T04.2 | Crear Servicio de Publicación | Implementar método `publishNotificationEvent(eventName, channel, payload)` que: 1) Inserta en `notification_events` (auditoría), 2) Publica job en pg-boss. | T04.1 | 🟡 Pendiente |
| T04.3 | Crear tipos TypeScript compartidos | Definir interfaces de eventos (`NotificationEventPayload`, `EmailPayload`, etc.) en un módulo compartido entre web y worker. | T04.2 | 🟡 Pendiente |
| T05 | Refactorizar Flujo de Contraseña | Modificar la Server Action `requestPasswordReset` para que llame a `publishNotificationEvent('user.password_reset.requested', 'EMAIL', payload)`. | T04.2 | 🟡 Pendiente |
| **Fase 3: Implementación del Worker Independiente** |
| T06 | Crear Entry Point del Worker | Crear archivo `notification-worker/src/index.ts` que inicialice pg-boss y registre los handlers. | T00.1, T00.2 | 🟡 Pendiente |
| T07 | Configurar pg-boss en Worker | Inicializar pg-boss con opciones: schema público, configuración de reintentos (exponential backoff, max 5 intentos), dead letter queue. | T06 | 🟡 Pendiente |
| T08.1 | Implementar Handler de Email | Crear `notification-worker/src/handlers/emailHandler.ts` que: 1) Busque plantilla en BD, 2) Renderice con Mustache, 3) Envíe vía nodemailer, 4) Actualice `notification_events`. | T01, T07 | 🟡 Pendiente |
| T08.2 | Registrar Handlers en pg-boss | Registrar workers con `boss.work('notification.EMAIL', emailHandler)`. Preparar estructura para futuros canales (SMS, PUSH). | T08.1 | 🟡 Pendiente |
| T09 | Implementar Manejo de Errores | Manejar errores en handlers: Log estructurado con pino, actualizar estado 'FAILED' en `notification_events`, dejar que pg-boss maneje reintentos. | T08.2 | 🟡 Pendiente |
| T10 | Configurar Lifecycle del Worker | Implementar graceful shutdown: Escuchar SIGTERM/SIGINT, llamar a `boss.stop()`, cerrar conexión a BD. | T07 | 🟡 Pendiente |
| **Fase 4: Gestión de Plantillas (Admin UI)** |
| T11 | Crear API para CRUD de Plantillas | Implementar endpoints en `/api/admin/notification-templates` para crear, leer, actualizar y eliminar plantillas. | T01 | 🟡 Pendiente |
| T12 | Crear UI de Gestión de Plantillas | Desarrollar una nueva sección en el área de administración con una tabla para listar las plantillas y formularios para crearlas/editarlas. | T11 | 🟡 Pendiente |
| **Fase 5: Containerización y Despliegue** |
| T13.1 | Crear Dockerfile para Worker | Crear `notification-worker/Dockerfile` con multi-stage build: 1) Build TypeScript, 2) Imagen runtime optimizada con solo dependencias de producción. | T10 | 🟡 Pendiente |
| T13.2 | Configurar docker-compose.yml | Añadir servicio `worker` en docker-compose con dependencias en `db`, variables de entorno, health checks, y restart policy. | T13.1 | 🟡 Pendiente |
| T13.3 | Configurar Variables de Entorno | Documentar y configurar variables requeridas: `DATABASE_URL`, `SMTP_*`, `WORKER_CONCURRENCY`, `NODE_ENV`. Crear archivo `.env.example`. | T13.2 | 🟡 Pendiente |
| T13.4 | Testing de Deployment Local | Ejecutar `docker-compose up` y verificar: 1) Worker inicia correctamente, 2) Procesa eventos publicados desde web, 3) Actualiza BD correctamente. | T13.2, T13.3 | 🟡 Pendiente |
| T13.5 | Documentar Deployment en VPS | Crear guía de deployment: 1) Setup de docker-compose en VPS, 2) Configuración de Nginx reverse proxy, 3) SSL con Let's Encrypt, 4) Monitoreo de logs. | T13.4 | 🟡 Pendiente |
| **Fase 6: Monitoreo y Observabilidad** |
| T14.1 | Implementar Health Check del Worker | Crear script o endpoint de health check que verifique: 1) pg-boss está activo, 2) Conexión a BD funcional, 3) Último job procesado hace <5min. | T10 | 🟡 Pendiente |
| T14.2 | Configurar Logging Estructurado | Implementar logging con pino en formato JSON: Logs de inicio/shutdown, jobs procesados/fallidos, errores con contexto completo. | T09 | 🟡 Pendiente |
| T14.3 | Exponer Métricas de pg-boss | Crear endpoint o dashboard para métricas: Jobs en cola, jobs procesados/fallidos (últimas 24h), workers activos, latencia promedio. | T14.1 | 🟡 Pendiente |
| T14.4 | Configurar Alertas | Documentar configuración de alertas (vía log monitoring o servicio externo): Worker down >5min, tasa de fallos >10%, cola con >1000 jobs pendientes. | T14.3 | 🟡 Pendiente |
| **Fase 7: Testing y Validación** |
| T15.1 | Testing de Integración | Crear tests que: 1) Publiquen evento desde web, 2) Verifiquen procesamiento por worker, 3) Validen actualización de `notification_events`, 4) Confirmen envío de email. | T13.4 | 🟡 Pendiente |
| T15.2 | Testing de Reintentos | Simular fallos transitorios (ej. API de correo caída) y verificar que pg-boss reintenta con exponential backoff hasta éxito o dead letter queue. | T09 | 🟡 Pendiente |
| T15.3 | Testing de Múltiples Workers | Levantar 3 instancias del worker y publicar 100 eventos. Verificar: 1) Sin procesamiento duplicado, 2) Distribución equitativa, 3) Sin race conditions. | T13.2 | 🟡 Pendiente |
| T15.4 | Testing de Graceful Shutdown | Enviar SIGTERM al worker mientras procesa jobs. Verificar: 1) Completa jobs en progreso, 2) No acepta nuevos jobs, 3) Cierra conexiones limpiamente. | T10 | 🟡 Pendiente |
