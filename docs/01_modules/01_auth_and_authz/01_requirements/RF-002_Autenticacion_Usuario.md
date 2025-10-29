# RF-002: Autenticación de Usuarios

**ID:** RF-002
**Título:** Autenticación de Usuarios
**Prioridad:** Crítica

## Descripción

El sistema debe proporcionar un mecanismo seguro para que los usuarios registrados puedan verificar su identidad e iniciar sesión en la aplicación. El acceso exitoso debe generar una sesión que persista durante la interacción del usuario con el sistema.

## Criterios de Aceptación

- **Interfaz de Acceso:** El sistema debe presentar una interfaz donde el usuario pueda introducir sus credenciales (correo electrónico y contraseña).
- **Validación de Credenciales:** El backend debe validar que el correo electrónico exista, que la cuenta de usuario esté activa y que la contraseña proporcionada coincida con la almacenada de forma segura.
- **Manejo de Acceso Denegado:** Si la autenticación falla por cualquier motivo (usuario inexistente, contraseña incorrecta, cuenta inactiva), el sistema debe devolver un mensaje de error genérico sin revelar la causa específica del fallo.
- **Gestión de Sesión con Lucia Auth:** Tras una autenticación exitosa, el sistema debe generar una sesión usando Lucia Auth. La sesión se almacenará en la base de datos (tabla `session`) con un ID único (UUID) y fecha de expiración.
- **Token de Sesión:** Lucia Auth proporcionará un token de sesión seguro que identifica al usuario autenticado. Este token NO es un JWT sino un identificador opaco que se usa para consultar la sesión en la base de datos.
- **Expiración de Sesión:** Las sesiones deben tener una fecha y hora de expiración definidas (campo `expires_at` en la tabla `session`) para limitar la duración de la sesión y mitigar riesgos de seguridad.
- **Autorización Basada en Sesión:** Todas las solicitudes posteriores a recursos protegidos de la API deben incluir el token de sesión. El sistema validará el token consultando la tabla `session` y obtendrá los roles y permisos del usuario para la autorización.
