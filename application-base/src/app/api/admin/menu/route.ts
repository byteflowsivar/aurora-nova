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
 * @api {get} /api/admin/menu
 * @name Listar Items del Menú
 * @description Obtiene una lista de todos los items del menú de administración.
 * @version 1.0.0
 *
 * @requires "menu:manage" - El usuario debe tener el permiso para gestionar el menú.
 *
 * @response {200} Success - Retorna un array de objetos de item de menú.
 * @response {403} Forbidden - El usuario no está autenticado o no tiene los permisos necesarios.
 * @response {500} InternalServerError - Error inesperado en el servidor.
 *
 * @returns {Promise<NextResponse>} Una promesa que resuelve a la respuesta HTTP.
 *
 * @example
 * // Fetch menu items from a client component
 * async function fetchMenuItems() {
 *   const response = await fetch('/api/admin/menu');
 *   const menuItems = await response.json();
 *   console.log(menuItems);
 * }
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
 * @api {post} /api/admin/menu
 * @name Crear Item de Menú
 * @description Crea un nuevo item en el menú de administración.
 * @version 1.0.0
 *
 * @requires "menu:manage" - El usuario debe tener el permiso para gestionar el menú.
 *
 * @param {Request} request - La petición HTTP de entrada.
 * @param {object} request.body - El cuerpo de la petición.
 * @param {string} request.body.title - Título del item.
 * @param {string} [request.body.href] - URL a la que enlaza.
 * @param {string} [request.body.icon] - Icono para el item.
 * @param {number} request.body.order - Orden de aparición.
 * @param {boolean} [request.body.isActive] - Si el item está activo.
 * @param {string} [request.body.permissionId] - Permiso requerido para ver el item.
 * @param {string} [request.body.parentId] - ID del item padre para anidación.
 *
 * @response {201} Created - Retorna el objeto del item de menú recién creado.
 * @response {400} BadRequest - Los datos proporcionados son inválidos.
 * @response {403} Forbidden - El usuario no está autenticado o no tiene los permisos necesarios.
 * @response {500} InternalServerError - Error inesperado en el servidor.
 *
 * @returns {Promise<NextResponse>} Una promesa que resuelve a la respuesta HTTP.
 *
 * @example
 * // Create a new menu item
 * async function createMenuItem(itemData) {
 *   const response = await fetch('/api/admin/menu', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(itemData),
 *   });
 *   const newMenuItem = await response.json();
 *   if (response.ok) {
 *     console.log('Item creado:', newMenuItem);
 *   } else {
 *     console.error('Error:', newMenuItem.error);
 *   }
 * }
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
