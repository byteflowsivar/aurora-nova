# Requerimientos para el Flujo de Recuperación de Contraseña

Este documento detalla los requerimientos funcionales y no funcionales para la implementación de la funcionalidad de reinicio de contraseña.

## Requerimientos Funcionales (FR)

| ID | Requerimiento | Descripción |
| :--- | :--- | :--- |
| **FR-01** | Solicitar Reinicio | El usuario debe poder iniciar el flujo de reinicio de contraseña desde la página de inicio de sesión. |
| **FR-02** | Proporcionar Email | El usuario debe proporcionar la dirección de correo electrónico asociada a su cuenta. |
| **FR-03** | Envío de Enlace | El sistema debe enviar un correo electrónico al usuario con un enlace único para reiniciar su contraseña. |
| **FR-04** | Página de Reinicio | El enlace debe dirigir al usuario a una página donde pueda establecer una nueva contraseña. |
| **FR-05** | Establecer Nueva Contraseña | El usuario debe poder introducir y confirmar su nueva contraseña. |
| **FR-06** | Validación de Contraseña | La nueva contraseña debe ser validada contra las reglas de seguridad del sistema (longitud, complejidad, etc.). |
| **FR-07** | Notificación de Éxito | Tras un reinicio exitoso, el sistema debe notificar al usuario y redirigirlo a la página de inicio de sesión. |

## Requerimientos No Funcionales (NFR)

| ID | Requerimiento | Descripción |
| :--- | :--- | :--- |
| **NFR-01** | **Seguridad (Expiración de Token)** | Los tokens de reinicio de contraseña deben expirar automáticamente después de un período de tiempo corto (ej. 30 minutos). |
| **NFR-02** | **Seguridad (Token de un Solo Uso)** | Un token de reinicio solo puede ser utilizado una vez. Después de su uso, debe ser invalidado inmediatamente. |
| **NFR-03** | **Seguridad (Anti-Enumeración)** | El sistema no debe confirmar si una dirección de correo electrónico está registrada o no al solicitar un reinicio. |
| **NFR-04** | **Seguridad (Rate Limiting)** | El sistema debe limitar el número de solicitudes de reinicio de contraseña que se pueden hacer desde una misma IP en un período de tiempo para prevenir spam. |
| **NFR-05** | **Seguridad (Invalidación de Sesiones)** | Todas las sesiones activas de un usuario deben ser cerradas automáticamente después de un cambio de contraseña exitoso. |
| **NFR-06** | **Usabilidad** | El usuario debe recibir instrucciones claras y concisas en cada paso del proceso. |
| **NFR-07** | **Rendimiento** | El proceso de validación del token y actualización de la contraseña debe completarse en menos de 500ms. |
