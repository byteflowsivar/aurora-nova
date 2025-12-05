/**
 * API Route: Menu Item Management (Individual)
 *
 * Endpoints para gestionar un item específico del menú de administración.
 * Permite actualizar y eliminar items del menú.
 *
 * **Endpoints**:
 * - PATCH /api/admin/menu/:id - Actualizar item del menú
 * - DELETE /api/admin/menu/:id - Eliminar item del menú
 *
 * @module api/admin/menu/item
 */

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/server/require-permission';
import { updateMenuItem, deleteMenuItem } from '@/modules/admin/services';
import { z } from 'zod';
import { invalidateMenuCache } from '@/lib/menu/menu-cache';

// Zod schema for validating the request body for updating a menu item
const updateMenuItemSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  href: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
  permissionId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>
}

/**
 * Actualiza un item específico del menú de administración.
 *
 * Permite modificar las propiedades de un item del menú como título, href, icono,
 * orden, estado, permisos y relaciones parent-child. Invalida el cache del menú
 * después de la actualización.
 *
 * **Endpoint Details**:
 * - Method: PATCH
 * - Route: /api/admin/menu/:id
 * - Auth: Requiere permiso "menu:manage"
 * - Content-Type: application/json
 *
 * **Parámetros**:
 * - `:id` (path parameter): ID del item del menú a actualizar
 * - `title` (body, opcional): Nuevo título del item
 * - `href` (body, opcional): Nueva URL/ruta del item
 * - `icon` (body, opcional): Nuevo ícono del item
 * - `order` (body, opcional): Nueva posición del item
 * - `isActive` (body, opcional): Si el item está activo o no
 * - `permissionId` (body, opcional): Permiso requerido para ver el item
 * - `parentId` (body, opcional): ID del item padre (para menús anidados)
 *
 * **Respuestas**:
 * - 200: Item actualizado exitosamente
 * - 400: Datos inválidos (validación Zod fallida)
 * - 403: Usuario no tiene permiso "menu:manage"
 * - 500: Error interno del servidor
 *
 * **Flujo**:
 * 1. Valida que el usuario tiene permiso "menu:manage"
 * 2. Extrae el ID del item desde parámetros
 * 3. Obtiene el body JSON de la solicitud
 * 4. Valida los datos con `updateMenuItemSchema`
 * 5. Actualiza el item en la base de datos
 * 6. Invalida el cache del menú
 * 7. Retorna el item actualizado
 *
 * **Efectos Secundarios**:
 * - Invalida el cache del menú (reconstruido en próxima lectura)
 * - Puede afectar la visibilidad de items para usuarios
 *
 * @async
 * @param {Request} request - La solicitud HTTP con body JSON
 * @param {RouteParams} context - Contexto de la ruta con parámetros
 * @returns {Promise<NextResponse>} Item del menú actualizado
 *
 * @example
 * ```typescript
 * // Update menu item
 * const response = await fetch('/api/admin/menu/menu-123', {
 *   method: 'PATCH',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ title: 'New Title', order: 5 }),
 * });
 * const updated = await response.json();
 * ```
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requirePermission('menu:manage');
    const json = await request.json();
    const data = updateMenuItemSchema.parse(json);

    const updatedMenuItem = await updateMenuItem(id, data);

    invalidateMenuCache();

    return NextResponse.json(updatedMenuItem);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.name === 'UnauthenticatedError' || error.name === 'PermissionDeniedError')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error(`Error updating menu item ${id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Elimina un item específico del menú de administración.
 *
 * Remueve un item del menú del sistema, invalidando el cache para reflejar
 * los cambios en la próxima lectura. Esta operación es destructiva y no se
 * puede deshacer sin una copia de seguridad.
 *
 * **Endpoint Details**:
 * - Method: DELETE
 * - Route: /api/admin/menu/:id
 * - Auth: Requiere permiso "menu:manage"
 * - Content-Type: application/json
 *
 * **Parámetros**:
 * - `:id` (path parameter): ID del item del menú a eliminar
 *
 * **Respuestas**:
 * - 204: Item eliminado exitosamente (sin contenido en respuesta)
 * - 403: Usuario no tiene permiso "menu:manage"
 * - 500: Error interno del servidor
 *
 * **Flujo**:
 * 1. Valida que el usuario tiene permiso "menu:manage"
 * 2. Extrae el ID del item desde parámetros
 * 3. Elimina el item de la base de datos
 * 4. Invalida el cache del menú
 * 5. Retorna 204 No Content
 *
 * **Efectos Secundarios**:
 * - Elimina el item del menú permanentemente
 * - Invalida el cache del menú (reconstruido en próxima lectura)
 * - Los usuarios no verán más este item en el menú
 * - Si el item tenía subitems (children), pueden quedar huérfanos
 *
 * **Seguridad**:
 * - Operación destructiva, requiere permiso específico
 * - No hay confirmación o soft-delete
 * - Considerar implementar soft-delete o confirmación en futuro
 *
 * @async
 * @param {Request} request - La solicitud HTTP
 * @param {RouteParams} context - Contexto de la ruta con parámetros
 * @returns {Promise<NextResponse>} Respuesta 204 No Content
 *
 * @example
 * ```typescript
 * // Delete menu item
 * const response = await fetch('/api/admin/menu/menu-123', {
 *   method: 'DELETE',
 * });
 * if (response.status === 204) {
 *   console.log('Menu item deleted successfully');
 * }
 * ```
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requirePermission('menu:manage');
    await deleteMenuItem(id);

    invalidateMenuCache();

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    if (error instanceof Error && (error.name === 'UnauthenticatedError' || error.name === 'PermissionDeniedError')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error(`Error deleting menu item ${id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
