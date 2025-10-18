# Flujo 3: Gestión de Usuarios

Este documento describe el flujo para que un administrador gestione el ciclo de vida de los usuarios en el sistema.

## Resumen

Esta funcionalidad permite a los usuarios con los permisos adecuados crear, ver, actualizar y desactivar otras cuentas de usuario.

**Actor:** Un administrador con permisos como `VIEW_USERS`, `CREATE_USERS`, `EDIT_USERS`, `DELETE_USERS`.
**Ubicación:** Una sección en el panel de administración, por ejemplo: `/dashboard/users`.

--- 

## Flujos Específicos

### 1. Listar Usuarios

- **Acción:** El administrador navega a la página de gestión de usuarios.
- **Vista:** Se muestra una tabla paginada con los usuarios del sistema.
- **Columnas Típicas:**
  - `Nombre`
  - `Email`
  - `Rol`
  - `Fecha de Registro`
  - `Estado` (Activo, Inactivo, Pendiente)
  - `Acciones` (Editar, Desactivar, etc.)
- **Funcionalidad Adicional:** Un campo de búsqueda para filtrar usuarios por nombre o correo electrónico.

### 2. Crear Usuario

- **Acción:** El administrador hace clic en un botón de "Nuevo Usuario".
- **Vista:** Se muestra un formulario o un modal con los siguientes campos:
  - `Nombre completo` (requerido)
  - `Email` (requerido, debe ser único)
  - `Rol` (requerido, lista desplegable con los roles disponibles en el sistema).
- **Gestión de Contraseña (Alternativas):**
  1.  **Contraseña Temporal:** El administrador define una contraseña temporal. El sistema puede forzar al usuario a cambiarla en su primer inicio de sesión.
  2.  **Enlace de Activación (Recomendado):** No se pide contraseña. El sistema envía un correo electrónico al nuevo usuario con un enlace único y de corta duración para que establezca su propia contraseña y active su cuenta. Este es el método más seguro.
- **Resultado:** Se crea el usuario en la base de datos con el estado "Activo" o "Pendiente" (dependiendo del método de contraseña) y se le asocia el rol seleccionado.

### 3. Editar Usuario

- **Acción:** El administrador hace clic en "Editar" en la fila de un usuario.
- **Vista:** Se muestra un formulario pre-cargado con la información del usuario.
- **Campos Editables:**
  - `Nombre completo`
  - `Rol`
  - `Estado` (ej: cambiar de "Activo" a "Inactivo").
- **Campos No Editables (Generalmente):**
  - `Email` (cambiarlo puede tener implicaciones de seguridad, a menudo se deshabilita).
  - `Contraseña` (la edición de contraseña de otro usuario debe ser una acción separada y deliberada, como "Enviar enlace para resetear contraseña").

### 4. Desactivar/Eliminar Usuario (Borrado Lógico)

- **Acción:** El administrador hace clic en "Desactivar" o "Eliminar" en la fila de un usuario.
- **Proceso (Recomendado: Borrado Lógico):**
  - En lugar de ejecutar un `DELETE` en la base de datos, se actualiza un campo `status` o `is_active` a `false`.
  - Se muestra un diálogo de confirmación antes de realizar la acción.
- **Ventajas del Borrado Lógico:**
  - **Integridad Referencial:** No se rompen las relaciones con otros datos (ej: facturas, posts, o logs creados por ese usuario).
  - **Auditabilidad:** Se mantiene un registro histórico del usuario.
  - **Reversibilidad:** La cuenta puede ser reactivada fácilmente si es necesario.
