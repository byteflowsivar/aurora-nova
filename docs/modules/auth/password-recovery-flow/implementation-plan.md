# Plan de Implementación: Flujo de Recuperación de Contraseña

Este documento detalla las tareas necesarias para implementar la funcionalidad de reinicio de contraseña, de acuerdo con los requerimientos y decisiones de arquitectura definidos.

| ID | Tarea | Descripción | Dependencias | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **Fase 1: Backend** |
| T01 | Actualizar Esquema de BD | Añadir el modelo `PasswordResetToken` al archivo `prisma/schema.prisma`. | - | ✅ Completado |
| T02 | Crear Migración de BD | Generar y aplicar la nueva migración de base de datos para crear la tabla `password_reset_token`. | T01 | ✅ Completado |
| T03 | Implementar Servicio de Email | Crear una capa de abstracción para el envío de correos transaccionales (ej. `lib/email/send.ts`). | - | ✅ Completado |
| T04 | Crear API: Solicitar Reinicio | Implementar el endpoint `POST /api/auth/request-password-reset` que genera y envía el token. | T01, T03 | ✅ Completado |
| T05 | Crear API: Realizar Reinicio | Implementar el endpoint `POST /api/auth/reset-password` que valida el token y actualiza la contraseña. | T01 | ✅ Completado |
| T06 | Implementar Invalidación de Sesiones | Añadir la lógica al endpoint de reinicio para que cierre todas las demás sesiones activas del usuario. | T05 | ✅ Completado |
| **Fase 2: Frontend** |
| T07 | Crear Página: "Olvidé mi Contraseña" | Desarrollar la página y el formulario en `/auth/forgot-password` para que el usuario ingrese su email. | - | ✅ Completado |
| T08 | Crear Página: "Reiniciar Contraseña" | Desarrollar la página y el formulario en `/auth/reset-password` que lee el token de la URL. | - | ✅ Completado |
| T09 | Integrar UI con API | Conectar los formularios del frontend con los nuevos endpoints de la API, manejando estados de carga, éxito y error. | T04, T05, T07, T08 | ✅ Completado |
| **Fase 3: Testing y Seguridad** |
| T10 | Escribir Tests de Backend | Crear tests unitarios y de integración para los nuevos servicios y endpoints de la API. | T04, T05 | 🟡 Pendiente |
| T11 | Implementar Rate Limiting | Añadir un middleware o lógica para limitar la tasa de solicitudes al endpoint de solicitud de reinicio. | T04 | ✅ Completado |
| T12 | Realizar Pruebas E2E | Probar manualmente el flujo completo, desde la solicitud hasta el inicio de sesión con la nueva contraseña. | T09, T10 | 🟡 Pendiente |
| **Fase 4: Documentación** |
| T13 | Actualizar Documentación de Usuario | Si existe, actualizar la documentación de usuario final para reflejar la nueva funcionalidad. | T12 | 🟡 Pendiente |
