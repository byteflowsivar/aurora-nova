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
- **Generación de Sesión:** Tras una autenticación exitosa, el sistema debe generar un token de sesión (ej. JWT) que encapsule la identidad del usuario (`userId`), su rol y el conjunto de sus permisos.
- **Expiración de Sesión:** El token de sesión debe tener una fecha y hora de expiración definidas para limitar la duración de la sesión y mitigar riesgos de seguridad.
- **Autorización Basada en Token:** Todas las solicitudes posteriores a recursos protegidos de la API deben incluir este token para que el sistema pueda verificar la autenticación y autorización del usuario.
