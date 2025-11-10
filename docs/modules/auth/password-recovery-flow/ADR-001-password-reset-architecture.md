# ADR-001: Arquitectura para el Flujo de Recuperación de Contraseña

- **Estado:** Propuesto
- **Fecha:** 2025-11-07

## 1. Contexto

La aplicación requiere un mecanismo seguro para que los usuarios puedan reiniciar su contraseña si la olvidan. Este proceso debe ser resistente a ataques comunes y proteger la privacidad del usuario.

## 2. Decisiones de Arquitectura

### Decisión 1: Uso de Tokens Atómicos en una Tabla Dedicada

Se utilizará una tabla separada en la base de datos (`PasswordResetToken`) para almacenar los tokens de reinicio.

-   **Justificación:** Desacopla la lógica de reinicio del modelo de `User`, permite que los tokens tengan su propio ciclo de vida (creación, expiración, uso) y facilita la limpieza de tokens expirados sin afectar la tabla de usuarios.
-   **Consecuencias:** Requiere una migración de base de datos para añadir la nueva tabla y consultas adicionales durante el flujo de reinicio.

### Decisión 2: Tokens Seguros, de un Solo Uso y de Corta Duración

Los tokens generados seguirán tres principios de seguridad:

1.  **Hasheados en la Base de Datos:** El token enviado al usuario se hasheará antes de guardarlo, de la misma manera que las contraseñas. Esto previene que una filtración de la base de datos exponga tokens válidos.
2.  **De un Solo Uso:** Una vez que un token se utiliza con éxito, se eliminará inmediatamente de la base de datos para prevenir su reutilización.
3.  **De Corta Duración:** Cada token tendrá una fecha de expiración corta (ej. 15-30 minutos) para limitar la ventana de oportunidad para un atacante.

-   **Justificación:** Estas medidas son estándar en la industria para mitigar los riesgos asociados con el robo de tokens.
-   **Consecuencias:** Añade complejidad a la lógica de validación, que ahora debe comprobar la expiración y eliminar el token tras su uso.

### Decisión 3: No Confirmación de Existencia de Email (Anti-Enumeración)

La API que solicita el reinicio de contraseña (`/api/auth/request-password-reset`) siempre devolverá una respuesta genérica y exitosa, independientemente de si el email proporcionado existe o no en la base de datos.

-   **Justificación:** Previene que actores maliciosos usen esta funcionalidad para "enumerar" o descubrir qué direcciones de correo electrónico están registradas en el sistema.
-   **Consecuencias:** La experiencia de usuario es ligeramente menos directa (no se le dice "email no encontrado"), pero la ganancia en seguridad es significativa.

### Decisión 4: Abstracción del Servicio de Correo Electrónico

El envío de correos electrónicos se manejará a través de una capa de abstracción (un "servicio de email") en lugar de llamar directamente a una API de un proveedor.

-   **Justificación:** Permite cambiar de proveedor de correo electrónico (ej. de Resend a SendGrid) en el futuro con un impacto mínimo en el código de la aplicación. Facilita las pruebas al poder "mockear" o simular el servicio de email.
-   **Consecuencias:** Introduce una nueva dependencia externa y la necesidad de gestionar claves de API de forma segura.

### Decisión 5: Invalidación de Sesiones Activas Post-Reinicio

Tras un reinicio de contraseña exitoso, todas las demás sesiones activas del usuario serán invalidadas.

-   **Justificación:** Es una medida de seguridad crítica. Si la cuenta de un usuario fue comprometida y un atacante tiene una sesión activa, el reinicio de contraseña por parte del usuario legítimo cerrará inmediatamente la sesión del atacante.
-   **Consecuencias:** Requiere lógica adicional para eliminar todas las entradas de la tabla `session` para el `userId` correspondiente, excepto la sesión actual si se decide iniciar sesión automáticamente.
