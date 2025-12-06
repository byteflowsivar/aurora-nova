import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/server/require-permission';
import { getAllMenuItems, createMenuItem } from '@/modules/admin/services';
import { z } from 'zod';
import { invalidateMenuCache } from '@/lib/menu/menu-cache';

// Zod schema for validating the request body for creating a menu item
const createMenuItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  href: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  order: z.number().int(),
  isActive: z.boolean().optional(),
  permissionId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

/**
 * GET /api/admin/menu - Listar todos los items del menú admin
 *
 * Obtiene lista completa de items del menú de administración.
 * Incluye estructura jerárquica (padres e hijos), permisos requeridos e íconos.
 * Resultado cacheado para mejor performance.
 *
 * **Autenticación**: Requerida (permiso: `menu:manage`)
 *
 * **Respuesta** (200):
 * ```json
 * [
 *   {
 *     "id": "uuid",
 *     "title": "Usuarios",
 *     "href": "/admin/users",
 *     "icon": "Users",
 *     "order": 1,
 *     "isActive": true,
 *     "permissionId": "user:read" | null,
 *     "parentId": null,
 *     "children": [
 *       {
 *         "id": "uuid",
 *         "title": "Crear Usuario",
 *         "href": "/admin/users/create",
 *         "icon": "Plus",
 *         "order": 1,
 *         "isActive": true,
 *         "permissionId": "user:create",
 *         "parentId": "parent-uuid"
 *       }
 *     ]
 *   }
 * ]
 * ```
 *
 * **Errores**:
 * - 403: No autenticado o sin permiso `menu:manage`
 * - 500: Error del servidor
 *
 * **Características**:
 * - Estructura jerárquica (parentId permite anidación)
 * - Filtrado por permiso (si user no tiene permiso, item no se muestra en UI)
 * - Caching automático (invalidado al crear/actualizar/eliminar items)
 * - Ordenado por campo `order`
 *
 * @method GET
 * @route /api/admin/menu
 * @auth Requerida (JWT válido)
 * @permission menu:manage
 *
 * @returns {Promise<NextResponse>} Array de items de menú con estructura jerárquica
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/admin/menu', {
 *   headers: { 'Authorization': `Bearer ${token}` }
 * })
 * const menuItems = await response.json()
 * ```
 *
 * @see {@link ./route.ts#POST} para crear item
 * @see {@link ./[id]/route.ts} para actualizar/eliminar item
 * @see {@link ./reorder/route.ts} para reordenar items
 */
export async function GET() {
  try {
    await requirePermission('menu:manage');
    const menuItems = await getAllMenuItems();
    return NextResponse.json(menuItems);
  } catch (error) {
    if (error instanceof Error && (error.name === 'UnauthenticatedError' || error.name === 'PermissionDeniedError')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error fetching all menu items:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/menu - Crear nuevo item de menú
 *
 * Crea un nuevo item en el menú de administración.
 * Permite anidación mediante parentId. Cache se invalida automáticamente.
 *
 * **Autenticación**: Requerida (permiso: `menu:manage`)
 *
 * **Body Esperado**:
 * ```json
 * {
 *   "title": "string (requerido)",
 *   "href": "string (opcional, ruta del item)",
 *   "icon": "string (opcional, nombre del ícono)",
 *   "order": "number (requerido, entero para ordenamiento)",
 *   "isActive": "boolean (opcional, default true)",
 *   "permissionId": "string (opcional, para filtrado en UI)",
 *   "parentId": "string (opcional, para anidación)"
 * }
 * ```
 *
 * **Respuesta** (201):
 * ```json
 * {
 *   "id": "uuid",
 *   "title": "Nuevos Usuarios",
 *   "href": "/admin/users/new",
 *   "icon": "UserPlus",
 *   "order": 2,
 *   "isActive": true,
 *   "permissionId": "user:create",
 *   "parentId": "parent-uuid",
 *   "createdAt": "2024-12-05T12:00:00Z"
 * }
 * ```
 *
 * **Errores**:
 * - 400: Datos inválidos (title faltante, order no es número, etc)
 * - 403: No autenticado o sin permiso `menu:manage`
 * - 500: Error del servidor
 *
 * **Validaciones** (Zod schema):
 * - title: requerido, min 1 char
 * - href: opcional, puede ser null
 * - icon: opcional, puede ser null
 * - order: requerido, entero
 * - isActive: opcional, default true
 * - permissionId: opcional, puede ser null
 * - parentId: opcional, puede ser null (si null = item raíz)
 *
 * **Efectos Secundarios**:
 * - Crea registro en tabla `MenuItem`
 * - Invalida caché de menú (llamada a invalidateMenuCache)
 * - NO emite evento de auditoría (considerar para futuro)
 *
 * @method POST
 * @route /api/admin/menu
 * @auth Requerida (JWT válido)
 * @permission menu:manage
 *
 * @param {Request} request - Request con body JSON
 * @returns {Promise<NextResponse>} Item creado (201) o error
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/admin/menu', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': `Bearer ${token}`
 *   },
 *   body: JSON.stringify({
 *     title: 'Crear Usuario',
 *     href: '/admin/users/create',
 *     icon: 'UserPlus',
 *     order: 2,
 *     permissionId: 'user:create',
 *     parentId: 'users-menu-id'
 *   })
 * })
 * ```
 *
 * @see {@link ./route.ts#GET} para listar items
 * @see {@link ./[id]/route.ts} para actualizar/eliminar item
 * @see {@link ./reorder/route.ts} para reordenar items
 */
export async function POST(request: Request) {
  try {
    await requirePermission('menu:manage');
    const json = await request.json();
    const data = createMenuItemSchema.parse(json);
    
    const newMenuItem = await createMenuItem(data);

    invalidateMenuCache();

    return NextResponse.json(newMenuItem, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.name === 'UnauthenticatedError' || error.name === 'PermissionDeniedError')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error creating menu item:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
