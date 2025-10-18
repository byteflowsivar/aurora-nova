# RF-003: Gestión de Roles

**ID:** RF-003
**Título:** Gestión de Roles
**Prioridad:** Alta

## Descripción

El sistema debe permitir a los usuarios con privilegios de administrador la capacidad de gestionar "Roles". Un rol es una entidad que agrupa un conjunto de permisos específicos, y que puede ser asignada a los usuarios para controlar su acceso a las funcionalidades del sistema (RBAC).

## Criterios de Aceptación

- **Creación de Roles:** Un administrador debe poder crear un nuevo rol proporcionando un nombre único y descriptivo.
- **Asignación de Permisos:** Durante la creación o edición de un rol, el administrador debe poder seleccionar y asignar múltiples permisos de una lista predefinida en el sistema. El conjunto de permisos disponibles es fijo y definido por la arquitectura de la aplicación.
- **Listado de Roles:** El sistema debe mostrar una vista que liste todos los roles existentes, permitiendo una fácil visualización.
- **Modificación de Roles:** Un administrador debe poder cambiar el nombre y la lista de permisos asociados a un rol existente.
- **Impacto Inmediato:** Cualquier modificación en los permisos de un rol debe reflejarse de manera inmediata en las capacidades de todos los usuarios que tengan dicho rol asignado.
- **Eliminación de Roles:** Un administrador debe tener la capacidad de eliminar un rol.
- **Regla de Integridad:** El sistema debe impedir la eliminación de un rol si este se encuentra actualmente asignado a uno o más usuarios. Se debe notificar al administrador sobre esta condición.
