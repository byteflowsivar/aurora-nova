# Hoja de Ruta (Roadmap) - Aurora Nova

**Proyecto:** Aurora Nova - Application Base
**Fecha**: 2025-11-30
**Estado**: Documento vivo

---

## 1. Introducción

Este documento describe las posibles mejoras y funcionalidades futuras para la aplicación base de Aurora Nova. Su propósito es guiar la evolución del proyecto, asegurando que continúe siendo una fundación robusta, escalable y moderna para el desarrollo de aplicaciones empresariales.

Este no es un plan de trabajo estricto, sino una colección de ideas que se priorizarán y refinarán con el tiempo.

---

## 2. Mejoras a Corto Plazo (Próximos Pasos)

Estas son funcionalidades que complementan directamente las implementaciones actuales y aportan un alto valor inmediato.

### Arquitectura de App Pública y Panel de Administración
- **Objetivo**: Refactorizar la estructura de rutas para separar formalmente la aplicación en una zona **pública** y un **panel de administración** (`/admin`).
- **Detalles**:
  - Implementar una separación a nivel de rutas y middleware.
  - Adaptar el sistema de menú dinámico para soportar múltiples menús (`PANEL_ADMIN`, `PUBLIC_SITE`) mediante la adición de un campo de `contexto` y `tipo` en la base de datos, permitiendo una gestión centralizada pero con una presentación diferenciada.
- **Beneficios**: Mejora radical en la separación de incumbencias, seguridad, experiencia de usuario y escalabilidad.

### Interfaz del Sistema de Auditoría
- **Dashboards de Auditoría**: Crear visualizaciones y métricas clave sobre la actividad del sistema (ej. logins por día, acciones más comunes, etc.).
- **Exportación de Logs**: Implementar la funcionalidad para que los administradores puedan exportar los registros de auditoría en formatos como CSV o JSON para análisis externo o cumplimiento.

### Mejoras de Notificaciones
- **Alertas por Email**: Configurar un sistema de alertas que notifique a los administradores sobre eventos críticos, como múltiples intentos de login fallidos, cambios en roles de administrador o errores graves del sistema.

---

## 3. Mejoras a Mediano Plazo (Escalabilidad y DX)

Estas mejoras se centran en la robustez del sistema a medida que crece y en mejorar la experiencia del desarrollador.

### Evolución del Sistema de Eventos
- **Integración con Message Broker**: Migrar el actual `EventEmitter` (que funciona en memoria) a una solución más robusta como **Redis Pub/Sub** o **RabbitMQ**.
  - **Beneficios**: Mayor resiliencia (los eventos no se pierden si la aplicación se reinicia), mejor escalabilidad y la posibilidad de que servicios externos se suscriban a los eventos.

### Observabilidad y Monitoreo
- **Integración con APM**: Integrar la aplicación con una herramienta de Monitoreo de Rendimiento de Aplicaciones (APM) como **Datadog** o **New Relic**.
- **Distributed Tracing (OpenTelemetry)**: Implementar tracing distribuido para seguir una petición a través de todos los sistemas (Server Actions, API Routes, base de datos, sistema de eventos), lo cual es invaluable para el debugging en producción.

### Gestión de Base de Datos
- **Particionamiento de la Tabla de Auditoría**: A medida que la tabla `audit_log` crezca, su rendimiento puede degradarse. Implementar particionamiento por fecha (ej. una tabla por mes o por trimestre) para mantener las consultas rápidas.
- **Archivado Automático de Logs**: Crear un proceso automatizado para archivar logs de auditoría antiguos (ej. más de un año) a un almacenamiento más económico como Amazon S3.

---

## 4. Mejoras a Largo Plazo (Capacidades Avanzadas)

Estas son ideas a futuro que posicionarían a Aurora Nova como una base de aplicaciones de vanguardia.

### Webhooks Salientes
- **Sistema de Webhooks**: Permitir que aplicaciones de terceros se suscriban a los eventos de Aurora Nova a través de webhooks. Por ejemplo, notificar a un sistema de facturación externo cuando se crea un nuevo usuario.

### Inteligencia y Seguridad Proactiva
- **Detección de Anomalías en Auditoría**: Utilizar técnicas de Machine Learning sobre los registros de auditoría para detectar patrones de comportamiento anómalos o sospechosos que puedan indicar una amenaza de seguridad.

### Mejoras en la Gestión de Configuración
- **Gestión de Feature Flags**: Integrar un sistema de "Feature Flags" para habilitar o deshabilitar funcionalidades en producción sin necesidad de un nuevo despliegue.

---

Este documento se actualizará periódicamente. Las contribuciones e ideas para el roadmap son siempre bienvenidas.
