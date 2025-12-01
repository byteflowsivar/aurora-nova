# Guía Técnica: Sistema de Auditoría

**Proyecto:** Aurora Nova - Application Base
**Fecha**: 2025-11-30
**Versión**: 1.0

---

## 1. Visión General

El sistema de auditoría de Aurora Nova está diseñado para registrar un rastro completo de las acciones significativas que ocurren en la aplicación. Su propósito es cumplir con requisitos de trazabilidad, seguridad y compliance.

La arquitectura se basa en dos enfoques principales, priorizando siempre la automatización y la consistencia.

### Componentes Principales
1.  **Modelo `AuditLog`**: Una tabla en la base de datos (`prisma/schema.prisma`) que almacena cada registro de auditoría con detalles sobre *quién, qué, cuándo* y *dónde*.
2.  **Auditoría Automática (Event-Driven)**: El `AuditEventListener` escucha eventos del sistema (definidos en `SystemEvent`) y crea registros de auditoría automáticamente. **Este es el método preferido y cubre aproximadamente el 90% de los casos de uso.**
3.  **Auditoría Manual (Helpers)**: Para casos no cubiertos por eventos, se proporcionan funciones `helper` en `src/lib/audit/helpers.ts` para crear registros de auditoría manualmente.

---

## 2. ¿Qué Método de Auditoría Utilizar?

La elección del método correcto es crucial para mantener un sistema de auditoría limpio y consistente.

-   ✅ **Usa el Enfoque Automático (Event-Driven) si:**
    -   La acción que estás implementando ya tiene un `SystemEvent` definido (ej. `USER_UPDATED`, `ROLE_CREATED`).
    -   Tu acción es una operación CRUD estándar sobre una de las entidades principales (Usuario, Rol, Permiso).
    -   La acción es un evento de negocio significativo que merece tener su propio `SystemEvent`.

-   ⚠️ **Usa el Enfoque Manual (Helpers) si:**
    -   La acción es muy específica y no justifica la creación de un nuevo evento global (ej. una operación de exportación de un solo uso).
    -   Estás realizando una operación en lote compleja que no se traduce bien en un único evento (ej. "archivar usuarios inactivos").
    -   Necesitas registrar metadatos muy específicos en la auditoría que no caben en el payload de un evento existente.

**Regla de oro:** Siempre prefiere usar el sistema de eventos. Solo recurre a los helpers manuales cuando sea estrictamente necesario.

---

## 3. Guía de Uso para Desarrolladores

### Método 1: Auditoría Automática con Eventos (Recomendado)

Este método no requiere que escribas código de auditoría. Simplemente, despacha el evento correcto desde tu Server Action y el `AuditEventListener` se encargará del resto.

**Ejemplo**: Auditar la eliminación de un rol.

1.  **Identifica el Evento**: Revisa `src/lib/events/types.ts` y encuentra `SystemEvent.ROLE_DELETED`.

2.  **Despacha el Evento**: En tu Server Action, después de eliminar el rol, despacha el evento con su payload correspondiente.

    ```typescript
    // src/actions/roles.ts
    
    import { eventBus, SystemEvent } from '@/lib/events';
    import { getLogContext } from '@/lib/logger/helpers';
    
    export async function deleteRole(roleId: string) {
      const performingUserId = await requireAdmin(); // Asegura que es un admin
      const context = await getLogContext('roles', 'delete');
    
      try {
        const roleToDelete = await prisma.role.findUnique({ where: { id: roleId } });
        if (!roleToDelete) return errorResponse('Rol no encontrado');
    
        // 1. Lógica de negocio principal
        await prisma.role.delete({ where: { id: roleId } });
    
        // 2. Despachar evento (¡La auditoría ocurre aquí automáticamente!)
        await eventBus.dispatch(
          SystemEvent.ROLE_DELETED,
          {
            roleId: roleToDelete.id,
            name: roleToDelete.name,
            deletedBy: performingUserId,
          },
          {
            requestId: context.requestId,
            userId: performingUserId,
          }
        );
    
        return successResponse(null, 'Rol eliminado exitosamente');
      } catch (error) {
        // ... manejo de errores
      }
    }
    ```

El `AuditEventListener` ya está suscrito a `SystemEvent.ROLE_DELETED` y creará el siguiente registro de auditoría sin que tengas que hacer nada más:
- `action`: 'delete'
- `module`: 'roles'
- `entityType`: 'Role'
- `entityId`: (el ID del rol eliminado)
- `userId`: (el ID del admin que realizó la acción)
- `oldValues`: `{ "name": "NombreDelRol" }`

> 📚 **Para más detalles sobre el sistema de eventos**, consulta la **[Guía de Arquitectura Dirigida por Eventos](./EVENT_DRIVEN_ARCHITECTURE.md)**.

### Método 2: Auditoría Manual con Helpers

Usa estos helpers solo cuando el enfoque de eventos no sea adecuado.

#### `auditEntityChange`

Ideal para registrar una actualización simple donde tienes el estado "antes" y "después" de una entidad.

**Ejemplo**: Auditar un cambio de nombre de un proyecto (un modelo que no tiene eventos definidos).

```typescript
// src/actions/projects.ts

import { auditEntityChange, getAuditContext } from '@/lib/audit';

export async function updateProjectName(projectId: string, newName: string) {
  const userId = await requireAuth();

  // 1. Obtener el estado anterior de la entidad
  const oldProject = await prisma.project.findUnique({ where: { id: projectId } });
  if (!oldProject) return errorResponse('Proyecto no encontrado');

  // 2. Ejecutar la actualización
  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: { name: newName },
  });

  // 3. Registrar la auditoría manualmente
  await auditEntityChange(
    {
      userId,
      action: 'update_name',
      module: 'projects',
      entityType: 'Project',
      entityId: projectId,
    },
    { name: oldProject.name }, // oldValues
    { name: updatedProject.name }  // newValues
  );

  return successResponse(updatedProject);
}
```

#### `auditOperation`

Un wrapper potente para auditar una operación completa, incluyendo su duración y si fue exitosa o no. Es perfecto para acciones en lote o procesos complejos.

**Ejemplo**: Auditar una operación de archivado de usuarios inactivos.

```typescript
// src/actions/maintenance.ts

import { auditOperation } from '@/lib/audit';

export async function archiveInactiveUsers() {
  const adminId = await requireAdmin();

  // Envuelve toda la lógica en auditOperation
  return await auditOperation(
    {
      userId: adminId,
      action: 'archive_inactive',
      module: 'maintenance',
      metadata: {
        cutoffDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 año
      },
    },
    async () => {
      // 1. Lógica de la operación
      const result = await prisma.user.updateMany({
        where: { lastLogin: { lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } },
        data: { isActive: false },
      });

      // El resultado de esta función se devuelve al caller
      return successResponse({ archivedCount: result.count });
    }
  );
}
```
**Ventajas de `auditOperation`**:
- Registra la auditoría automáticamente tanto si la operación tiene éxito como si falla.
- En el `metadata` del log, añade `{ success: true, duration: 123 }` en caso de éxito, o `{ success: false, error: 'Mensaje de error', duration: 45 }` en caso de fallo.
- Obtiene el contexto de la request (IP, User-Agent, RequestID) por ti.

---

## 4. Convenciones de Nomenclatura

Para mantener la consistencia en los logs de auditoría, sigue estas convenciones:

-   **`module` (Módulo)**: Un string en minúsculas que representa el dominio de negocio.
    -   **Ejemplos**: `users`, `roles`, `auth`, `reports`, `billing`.

-   **`action` (Acción)**: Un verbo corto y descriptivo en formato `snake_case` que define la operación.
    -   **CRUD Estándar**: `create`, `update`, `delete`, `list`.
    -   **Acciones Específicas**: `login`, `logout`, `password_change`, `role_assign`, `export_report`, `batch_archive`.

-   **`entityType` (Tipo de Entidad)**: El nombre del modelo de Prisma en `PascalCase`.
    -   **Ejemplos**: `User`, `Role`, `Project`, `Invoice`.

-   **`entityId` (ID de Entidad)**: El ID del registro específico que fue afectado.

Un registro de auditoría completo y bien definido se vería así:
```json
{
  "module": "users",
  "action": "update",
  "entityType": "User",
  "entityId": "uuid-del-usuario-actualizado",
  "userId": "uuid-del-admin-que-hizo-el-cambio",
  "oldValues": { "email": "old@test.com" },
  "newValues": { "email": "new@test.com" }
}
```
