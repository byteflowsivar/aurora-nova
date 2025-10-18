# RF-004: Gestión de Usuarios

**ID:** RF-004
**Título:** Gestión de Usuarios
**Prioridad:** Alta

## Descripción

El sistema debe permitir a los administradores con los permisos adecuados gestionar el ciclo de vida completo de las cuentas de usuario dentro de la aplicación, desde su creación hasta su desactivación.

## Criterios de Aceptación

- **Listado y Búsqueda:**
  - Un administrador debe poder visualizar una lista paginada de todos los usuarios registrados en el sistema.
  - La lista debe incluir, como mínimo, el nombre, correo electrónico, rol y estado (ej. Activo, Inactivo) de cada usuario.
  - La interfaz debe proveer una funcionalidad de búsqueda para filtrar usuarios por nombre o correo electrónico.

- **Creación de Usuarios:**
  - Un administrador debe poder iniciar la creación de una nueva cuenta de usuario proporcionando un nombre, un correo electrónico (que debe ser único) y asignando un rol de una lista de roles existentes.
  - El sistema debe facilitar un mecanismo de activación de cuenta seguro, preferiblemente enviando un enlace de invitación por correo electrónico para que el nuevo usuario establezca su propia contraseña.

- **Modificación de Usuarios:**
  - Un administrador debe poder modificar los datos de un usuario existente, como su nombre y el rol asignado.
  - La modificación de datos sensibles como el correo electrónico o la contraseña debe ser manejada a través de flujos de verificación específicos (ej. re-confirmación por email, reseteo de contraseña) en lugar de una edición directa.

- **Desactivación y Reactivación (Borrado Lógico):**
  - Un administrador debe poder desactivar una cuenta de usuario. Una cuenta desactivada no podrá iniciar sesión ni acceder a los recursos del sistema.
  - La desactivación debe ser un borrado lógico (marcar el usuario como inactivo) en lugar de un borrado físico para preservar la integridad de los datos y el historial.
  - Un administrador debe poder reactivar una cuenta que fue previamente desactivada.
