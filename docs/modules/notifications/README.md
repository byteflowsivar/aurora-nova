# Módulo: Notificaciones

- **Estado:** 📝 En Planificación

## Visión General

El Módulo de Notificaciones proporciona una infraestructura centralizada, reutilizable y resiliente para enviar comunicaciones a los usuarios, comenzando con correos electrónicos.

Está diseñado con una **arquitectura asíncrona y orientada a eventos** para desacoplar el envío de notificaciones de la lógica de negocio principal. Esto asegura que las acciones del usuario (como registrarse o solicitar un reinicio de contraseña) sean rápidas y no se vean bloqueadas o fallidas por problemas en el sistema de envío de correos.

### Características Principales

*   **Asincronía:** Las notificaciones se procesan en segundo plano, mejorando la experiencia de usuario.
*   **Gestión de Plantillas:** El contenido de las notificaciones se gestiona desde la base de datos, permitiendo cambios sin necesidad de un nuevo despliegue.
*   **Extensibilidad Multi-Canal:** La arquitectura está diseñada para soportar múltiples canales de notificación (ej. `EMAIL`, `SMS`, `PUSH`). Un worker central actúa como despachador (dispatcher), facilitando la adición de nuevos canales en el futuro.
*   **Resiliencia:** Los fallos en el envío de un correo no afectan la operación que lo originó y pueden ser reintentados.
