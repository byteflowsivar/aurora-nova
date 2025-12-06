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
 * POST /api/admin/menu/reorder - Reordenar múltiples items de menú
 *
 * Actualiza el orden de visualización de varios items del menú en una sola operación.
 * Ideal para interfaces de drag-and-drop o reorganización masiva de navegación.
 * Operación atómica: todos los items se actualizan o ninguno. Cache se invalida automáticamente.
 *
 * **Autenticación**: Requerida (permiso: `menu:manage`)
 *
 * **Body Esperado**:
 * ```json
 * [
 *   { "id": "uuid-1", "order": 1 },
 *   { "id": "uuid-2", "order": 2 },
 *   { "id": "uuid-3", "order": 3 }
 * ]
 * ```
 *
 * **Respuesta** (200):
 * ```json
 * {}
 * ```
 * (Respuesta vacía, solo indica éxito 200 OK)
 *
 * **Errores**:
 * - 400: Datos inválidos (no es array, faltan campos id/order, order no es número)
 * - 403: No autenticado o sin permiso `menu:manage`
 * - 500: Error del servidor
 *
 * **Validaciones** (Zod schema):
 * - Debe ser array de objetos
 * - Cada objeto requiere:
 *   - `id`: string (UUID del item)
 *   - `order`: number entero (nueva posición)
 * - Array vacío permitido (sin cambios)
 *
 * **Efectos Secundarios**:
 * - Actualiza campo `order` de todos los items especificados
 * - Operación atómica: si una falla, ninguna se aplica (transacción BD)
 * - Invalida caché de menú (se reconstruye en próxima lectura)
 * - Cambios visibles inmediatamente en UI para todos los usuarios
 * - Menú se reordena según nuevo campo `order` ASC
 *
 * **Casos de Uso**:
 * - UI de drag-and-drop para reordenar navegación
 * - Cambios de layout y reorganización de secciones
 * - Actualización masiva de prioridades/orden de items
 * - Sincronizar orden después de importar menú
 *
 * **Performance**:
 * - Operación muy rápida (actualiza múltiples en una transacción)
 * - Cache invalidado una sola vez (no por cada item)
 * - Más eficiente que múltiples requests PATCH individuales
 * - Recomendado para cambios de orden de 3+ items
 *
 * @method POST
 * @route /api/admin/menu/reorder
 * @auth Requerida (JWT válido)
 * @permission menu:manage
 *
 * @param {Request} request - Request con body JSON (array de {id, order})
 * @returns {Promise<NextResponse>} 200 OK (sin contenido) o error
 *
 * @example
 * ```typescript
 * // Reordenar items después de drag-and-drop
 * const reorderItems = [
 *   { id: 'usuarios-id', order: 1 },
 *   { id: 'roles-id', order: 2 },
 *   { id: 'permisos-id', order: 3 },
 * ]
 *
 * const response = await fetch('/api/admin/menu/reorder', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': `Bearer ${token}`
 *   },
 *   body: JSON.stringify(reorderItems)
 * })
 *
 * if (response.status === 200) {
 *   console.log('Menú reordenado exitosamente')
 *   refreshMenuDisplay()
 * } else {
 *   const error = await response.json()
 *   console.error('Error reordenando:', error.details)
 * }
 * ```
 *
 * @see {@link ./route.ts#GET} para listar todos los items
 * @see {@link ./route.ts#POST} para crear nuevo item
 * @see {@link ./[id]/route.ts#PATCH} para actualizar item individual
 * @see {@link ./[id]/route.ts#DELETE} para eliminar item
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
