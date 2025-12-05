/**
 * API Route: Menu Items Reordering
 *
 * Endpoint especializado para reordenar múltiples items del menú de administración.
 * Permite cambiar el orden de visualización de los items del menú de forma masiva.
 *
 * **Endpoints**:
 * - POST /api/admin/menu/reorder - Reordenar items del menú
 *
 * @module api/admin/menu/reorder
 */

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/server/require-permission';
import { reorderMenuItems } from '@/modules/admin/services';
import { z } from 'zod';
import { invalidateMenuCache } from '@/lib/menu/menu-cache';

// Zod schema for validating the request body for reordering menu items
const reorderMenuItemsSchema = z.array(
  z.object({
    id: z.string(),
    order: z.number().int(),
  })
);

/**
 * Reordena múltiples items del menú en una sola operación.
 *
 * Permite cambiar el orden de visualización de los items del menú de forma masiva.
 * Útil para operaciones de drag-and-drop o cambios de layout. Acepta un array
 * de items con su nuevo orden y actualiza todos en una operación.
 *
 * **Endpoint Details**:
 * - Method: POST
 * - Route: /api/admin/menu/reorder
 * - Auth: Requiere permiso "menu:manage"
 * - Content-Type: application/json
 *
 * **Parámetros** (en el body):
 * - Array de objetos con:
 *   - `id` (string): ID del item del menú
 *   - `order` (number): Nueva posición/orden del item
 *
 * **Respuestas**:
 * - 200: Items reordenados exitosamente
 * - 400: Datos inválidos (validación Zod fallida)
 * - 403: Usuario no tiene permiso "menu:manage"
 * - 500: Error interno del servidor
 *
 * **Flujo**:
 * 1. Valida que el usuario tiene permiso "menu:manage"
 * 2. Obtiene el body JSON de la solicitud
 * 3. Valida que es un array de objetos { id, order } con `reorderMenuItemsSchema`
 * 4. Actualiza el orden de todos los items en la base de datos
 * 5. Invalida el cache del menú
 * 6. Retorna 200 OK
 *
 * **Casos de Uso**:
 * - Interfaz de drag-and-drop para reordenar menú
 * - Cambios de layout y reorganización de navegación
 * - Actualización masiva de orden de items
 *
 * **Efectos Secundarios**:
 * - Actualiza el orden de todos los items especificados
 * - Invalida el cache del menú (reconstruido en próxima lectura)
 * - Los usuarios verán el menú reordenado inmediatamente
 *
 * **Performance**:
 * - Operación atómica: todos los items se actualizan o ninguno
 * - Cache invalidado automáticamente
 * - Recomendado para cambios de orden de múltiples items
 *
 * @async
 * @param {Request} request - La solicitud HTTP con body JSON
 * @returns {Promise<NextResponse>} Respuesta 200 OK
 *
 * @example
 * ```typescript
 * // Reorder menu items
 * const response = await fetch('/api/admin/menu/reorder', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify([
 *     { id: 'menu-1', order: 1 },
 *     { id: 'menu-2', order: 2 },
 *     { id: 'menu-3', order: 3 },
 *   ]),
 * });
 * if (response.ok) {
 *   console.log('Menu items reordered successfully');
 * }
 * ```
 *
 * @see {@link PATCH} para actualizar items individuales
 */
export async function POST(request: Request) {
  try {
    await requirePermission('menu:manage');
    const json = await request.json();
    const items = reorderMenuItemsSchema.parse(json);
    
    await reorderMenuItems(items);

    invalidateMenuCache();

    return new NextResponse(null, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.name === 'UnauthenticatedError' || error.name === 'PermissionDeniedError')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error reordering menu items:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
