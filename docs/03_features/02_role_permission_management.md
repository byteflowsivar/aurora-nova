# Flujo 2: Gestión de Roles y Permisos

Este documento describe el flujo para la creación y administración de roles y permisos en el sistema.

## Resumen

Esta funcionalidad permite al Super Administrador (y a otros roles con los permisos adecuados) definir grupos de permisos llamados "Roles" y asignarlos a los usuarios. Esto centraliza el control de acceso.

## Componentes Clave

### 1. Permisos (Permissions)

- **Definición:** Son acciones atómicas y específicas dentro de la aplicación.
- **Implementación Recomendada:** Deben ser definidos como constantes inmutables en el código fuente del backend (ej: un `enum` o un objeto congelado). No se almacenan en la base de datos porque están directamente ligados a la lógica del código.
- **Ejemplos:**
  - `VIEW_USERS`
  - `CREATE_USERS`
  - `EDIT_USERS`
  - `DELETE_USERS`
  - `MANAGE_ROLES`
  - `VIEW_DASHBOARD_ANALYTICS`

### 2. Roles

- **Definición:** Un rol es una etiqueta asignable a un usuario que agrupa un conjunto de permisos.
- **Implementación:** Los roles se almacenan en la base de datos, típicamente en una tabla `roles` (`id`, `name`). Se necesita una tabla intermedia (`role_permissions`) para manejar la relación muchos-a-muchos entre roles y permisos (aunque los permisos vivan en el código, se usa su string como referencia).

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
