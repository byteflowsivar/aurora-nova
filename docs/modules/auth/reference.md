# Referencia Técnica del Módulo de Autenticación

Este documento proporciona detalles técnicos sobre la implementación de funcionalidades específicas dentro del módulo de autenticación y autorización.

## 1. Menú Dinámico Basado en Base de Datos

Para permitir una gestión flexible y resolver problemas de hidratación, el menú de navegación de la aplicación se gestiona desde la base de datos en lugar de estar hardcodeado.

### Modelo de Datos (`MenuItem`)

La estructura del menú se define en el `schema.prisma` con el modelo `MenuItem`.

```prisma
model MenuItem {
  id           String      @id @default(dbgenerated("uuidv7()"))
  title        String      // Título a mostrar en la UI
  href         String?     // Ruta de navegación (null para grupos)
  icon         String?     // Nombre del ícono de lucide-react
  order        Int         // Orden de visualización
  isActive     Boolean     @default(true)

  // Relación opcional con un permiso
  permissionId String?
  permission   Permission? @relation(...)

  // Jerarquía (auto-referencia)
  parentId     String?
  parent       MenuItem?   @relation("MenuHierarchy", ...)
  children     MenuItem[]  @relation("MenuHierarchy")

  // ... campos de auditoría
}
```

### Lógica de Negocio

- **Jerarquía:** El menú soporta hasta dos niveles. Un ítem de nivel 1 sin `href` actúa como un grupo para ítems de nivel 2.
- **Control de Acceso:** Si un `MenuItem` tiene un `permissionId` asociado, solo será visible para los usuarios que posean dicho permiso. Los ítems sin `permissionId` son públicos para todos los usuarios autenticados.
- **Renderizado:** Un Server Component (`AppSidebar`) obtiene el menú del usuario desde el servidor (`getMenuServer`) y lo renderiza. Esto evita delays y problemas de hidratación en el cliente.
- **Caché:** Las consultas del menú se cachean en memoria (por usuario) con un TTL de 5 minutos para optimizar el rendimiento. La caché se invalida automáticamente tras cualquier modificación en la estructura del menú.

### API de Gestión (Admin)

El sistema expone una API RESTful bajo `/api/admin/menu` para la gestión completa del menú. Todas estas rutas requieren el permiso `menu:manage`.

- `GET /api/admin/menu`: Lista todos los ítems del menú.
- `POST /api/admin/menu`: Crea un nuevo ítem.
- `PATCH /api/admin/menu/[id]`: Actualiza un ítem existente.
- `DELETE /api/admin/menu/[id]`: Elimina un ítem.
- `POST /api/admin/menu/reorder`: Permite reordenar múltiples ítems en una transacción atómica.

### Problema Crítico Solucionado

Durante la revisión de la implementación, se detectó que el permiso `menu:manage` era requerido por todas las APIs de administración del menú, pero no estaba definido en el script de `seed`.

- **Impacto:** Nadie, ni siquiera el Super Administrador, podía gestionar el menú.
- **Solución:** Se agregó el permiso `menu:manage` al array de permisos en `scripts/seed.ts`. Como el rol de Super Administrador recibe todos los permisos definidos, el problema quedó resuelto tras volver a ejecutar el seeder.
