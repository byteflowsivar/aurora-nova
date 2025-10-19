# Flujo 2: Gestión de Roles y Permisos

Este documento describe el flujo para la creación y administración de roles y permisos en el sistema.

## Resumen

Esta funcionalidad permite al Super Administrador (y a otros roles con los permisos adecuados) definir grupos de permisos llamados "Roles" y asignarlos a los usuarios. Esto centraliza el control de acceso.

## Componentes Clave

### 1. Permisos (Permissions)

- **Definición:** Son acciones atómicas y específicas dentro de la aplicación (ej: `user:create`, `role:edit`).

- **Implementación (Enfoque Híbrido):**
  - **Fuente de Verdad (Lógica):** La *lógica* de un permiso (lo que el usuario puede hacer) se define y se implementa en el código fuente del backend. El código es la autoridad final sobre el comportamiento de un permiso.
  - **Fuente de Verdad (Catálogo):** Para facilitar la gestión, la documentación y la construcción de interfaces de usuario dinámicas (ej: un panel para asignar permisos a un rol), existirá una tabla `permission` en la base de datos. Esta tabla (`id`, `module`, `description`) actúa como un catálogo de todos los permisos disponibles en el sistema.
  - El `id` del permiso (ej: `'user:create'`) es el identificador único que conecta el registro en la base de datos con la lógica en el código.

- **Flujo de Creación de un Nuevo Permiso:**
  1.  El desarrollador implementa la nueva funcionalidad y la lógica de autorización en el código, usando un nuevo identificador de permiso (ej: `'billing:view_invoices'`).
  2.  Posteriormente, inserta una nueva fila en la tabla `permission` para registrar este nuevo permiso, describirlo y asignarlo a un módulo. Esto lo hace "visible" para el resto de la aplicación, como la interfaz de gestión de roles.

- **Ejemplos de Registros en la tabla `permission`:**
  - `id: 'user:create'`, `module: 'Users'`, `description: 'Permite crear nuevos usuarios'`
  - `id: 'role:delete'`, `module: 'Roles'`, `description: 'Permite eliminar roles existentes'`
  - `id: 'dashboard:view_analytics'`, `module: 'Dashboard'`, `description: 'Permite ver las analíticas principales'`

### 2. Roles

- **Definición:** Un rol es una etiqueta asignable a un usuario que agrupa un conjunto de permisos.
- **Implementación:** Los roles se almacenan en la base de datos, típicamente en una tabla `roles` (`id`, `name`). Se necesita una tabla intermedia (`role_permissions`) para manejar la relación muchos-a-muchos entre roles y permisos.

## Flujo de Gestión de Roles

**Actor:** Un administrador con el permiso `MANAGE_ROLES`.
**Ubicación:** Una sección en el panel de administración, por ejemplo: `/dashboard/roles`.

1.  **Crear Rol:**
    - El admin accede a un formulario para crear un nuevo rol.
    - Ingresa un nombre para el rol (ej: "Editor de Contenido", "Analista Financiero").
    - El sistema muestra una lista completa de todos los permisos disponibles en la aplicación.
    - El admin selecciona los permisos que desea asociar a este nuevo rol.
    - Al guardar, se crea el registro en la tabla `roles` y sus asociaciones en `role_permissions`.

2.  **Listar y Ver Roles:**
    - La página principal muestra una tabla con todos los roles creados, su nombre y quizás la cantidad de usuarios que lo tienen asignado.

3.  **Editar Rol:**
    - El admin selecciona un rol para editar.
    - Puede modificar el nombre y la lista de permisos asociados.
    - **Importante:** Cualquier cambio en los permisos de un rol afecta de manera inmediata a todos los usuarios que lo tengan asignado.

4.  **Eliminar Rol:**
    - El admin intenta eliminar un rol.
    - **Regla de Negocio:** El sistema debe impedir la eliminación de un rol si existen usuarios asignados a él. Se debe mostrar un error y solicitar al admin que primero reasigne esos usuarios a otro rol.
