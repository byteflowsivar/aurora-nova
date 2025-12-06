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
 * PATCH /api/admin/menu/:id - Actualizar item de menú
 *
 * Actualiza propiedades de un item específico del menú de administración.
 * Permite cambios parciales: solo envía los campos que necesitas actualizar.
 * Cache de menú se invalida automáticamente.
 *
 * **Autenticación**: Requerida (permiso: `menu:manage`)
 *
 * **Parámetros**:
 * - `:id` (path, requerido): UUID del item de menú a actualizar
 *
 * **Body Esperado** (todos los campos opcionales):
 * ```json
 * {
 *   "title": "string (opcional, min 1 char)",
 *   "href": "string (opcional, puede ser null)",
 *   "icon": "string (opcional, puede ser null)",
 *   "order": "number (opcional, entero para ordenamiento)",
 *   "isActive": "boolean (opcional)",
 *   "permissionId": "string (opcional, puede ser null)",
 *   "parentId": "string (opcional, puede ser null, para anidación)"
 * }
 * ```
 *
 * **Respuesta** (200):
 * ```json
 * {
 *   "id": "uuid",
 *   "title": "Usuarios Actualizado",
 *   "href": "/admin/users",
 *   "icon": "Users",
 *   "order": 1,
 *   "isActive": true,
 *   "permissionId": "user:read",
 *   "parentId": null,
 *   "updatedAt": "2024-12-05T12:00:00Z"
 * }
 * ```
 *
 * **Errores**:
 * - 400: Datos inválidos (title < 1 char, order no es número, etc)
 * - 403: No autenticado o sin permiso `menu:manage`
 * - 404: Item de menú no existe
 * - 500: Error del servidor
 *
 * **Validaciones** (Zod schema):
 * - title: opcional, min 1 char (si se proporciona)
 * - href: opcional, puede ser null
 * - icon: opcional, puede ser null
 * - order: opcional, entero (si se proporciona)
 * - isActive: opcional, boolean
 * - permissionId: opcional, puede ser null
 * - parentId: opcional, puede ser null (anidación jerarquía)
 *
 * **Efectos Secundarios**:
 * - Actualiza registro en tabla `MenuItem`
 * - Invalida caché de menú (se reconstruye en próxima lectura)
 * - Cambios visibles inmediatamente en UI para usuarios autenticados
 * - Si cambia parentId, puede afectar estructura jerárquica
 *
 * @method PATCH
 * @route /api/admin/menu/:id
 * @auth Requerida (JWT válido)
 * @permission menu:manage
 *
 * @param {Request} request - Request con body JSON (actualización parcial)
 * @param {RouteParams} context - Parámetros de ruta con `id`
 * @returns {Promise<NextResponse>} Item actualizado (200) o error
 *
 * @example
 * ```typescript
 * // Actualizar solo el título de un item
 * const response = await fetch('/api/admin/menu/users-menu-id', {
 *   method: 'PATCH',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': `Bearer ${token}`
 *   },
 *   body: JSON.stringify({
 *     title: 'Gestión de Usuarios',
 *     order: 2
 *   })
 * })
 * const updated = await response.json()
 * console.log(`Actualizado: ${updated.title}`)
 * ```
 *
 * @see {@link ./route.ts#GET} para listar todos los items
 * @see {@link ./route.ts#POST} para crear nuevo item
 * @see {@link ./route.ts#DELETE} para eliminar item
 * @see {@link ../reorder/route.ts} para reordenar múltiples items
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
 * DELETE /api/admin/menu/:id - Eliminar item de menú
 *
 * Elimina permanentemente un item del menú de administración.
 * Operación destructiva sin confirmación. Cache de menú se invalida automáticamente.
 * Items hijo pueden quedar huérfanos si tenían relación parent-child.
 *
 * **Autenticación**: Requerida (permiso: `menu:manage`)
 *
 * **Parámetros**:
 * - `:id` (path, requerido): UUID del item de menú a eliminar
 *
 * **Body**: Vacío (no requiere body)
 *
 * **Respuesta** (204):
 * ```
 * Sin contenido (204 No Content)
 * ```
 *
 * **Errores**:
 * - 403: No autenticado o sin permiso `menu:manage`
 * - 404: Item de menú no existe
 * - 500: Error del servidor
 *
 * **Efectos Secundarios**:
 * - Elimina registro en tabla `MenuItem` permanentemente (sin soft-delete)
 * - Invalida caché de menú (se reconstruye en próxima lectura)
 * - Item desaparece del menú inmediatamente para todos los usuarios
 * - Items hijo (con este item como parentId) pueden quedar huérfanos
 * - **Advertencia**: No hay deshacer, solo disponible a través de backup de BD
 *
 * **Consideraciones**:
 * - Operación irreversible sin backup
 * - No hay soft-delete implementado
 * - Afecta jerarquía si el item tenía subitems
 * - Requiere permiso especial: `menu:manage`
 *
 * **Casos de Uso**:
 * - Remover opciones de menú obsoletas
 * - Limpiar estructura de navegación
 * - Eliminar accesos específicos del admin
 *
 * @method DELETE
 * @route /api/admin/menu/:id
 * @auth Requerida (JWT válido)
 * @permission menu:manage
 *
 * @param {Request} request - Request HTTP (sin body)
 * @param {RouteParams} context - Parámetros de ruta con `id`
 * @returns {Promise<NextResponse>} 204 No Content o error
 *
 * @example
 * ```typescript
 * // Eliminar un item de menú
 * const response = await fetch('/api/admin/menu/users-menu-id', {
 *   method: 'DELETE',
 *   headers: {
 *     'Authorization': `Bearer ${token}`
 *   }
 * })
 *
 * if (response.status === 204) {
 *   console.log('Item eliminado del menú')
 *   // Refrescar UI para mostrar cambios
 *   refreshMenuItems()
 * } else if (response.status === 404) {
 *   console.error('Item no encontrado')
 * }
 * ```
 *
 * @see {@link ./route.ts#GET} para listar todos los items
 * @see {@link ./route.ts#POST} para crear nuevo item
 * @see {@link ./route.ts#PATCH} para actualizar item
 * @see {@link ../reorder/route.ts} para reordenar múltiples items
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
