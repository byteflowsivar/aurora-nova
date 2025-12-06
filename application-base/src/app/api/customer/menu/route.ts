/**
 * GET /api/customer/menu - Obtener menú personalizado del usuario
 *
 * Obtiene el menú de navegación filtrado según permisos del usuario actual.
 * Solo muestra items para los cuales el usuario tiene permisos.
 * Estructura jerárquica con parent-child relationships. Resultado cacheado para performance.
 *
 * **Autenticación**: Requerida (usuario autenticado con JWT válido)
 *
 * **Parámetros**: Ninguno (datos del usuario se extraen de sesión)
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
 *     "permissionId": "user:read",
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
 *         "parentId": "uuid-parent"
 *       }
 *     ]
 *   }
 * ]
 * ```
 *
 * **Errores**:
 * - 401: No autenticado
 * - 500: Error del servidor
 *
 * **Efectos Secundarios**:
 * - Sin efectos secundarios (lectura pura)
 * - Utiliza cache de menú (invalidado cuando se modifica menú en admin)
 * - No modifica datos
 *
 * **Filtrado por Permisos**:
 * - Solo muestra items cuyo `permissionId` el usuario posee
 * - Si usuario no tiene permiso, item no aparece en menú
 * - Jerquía respetada: si padre oculto, hijos también se ocultan
 * - Items sin `permissionId` siempre visibles (acceso público dentro de admin)
 *
 * **Estructura Jerárquica**:
 * - `parentId`: null = item raíz (nivel superior)
 * - `children`: array de subitems si los hay
 * - Ordenado por campo `order` (ASC)
 * - Permite navegación anidada (ej: Usuarios > Crear Usuario)
 *
 * **Casos de Uso**:
 * - Cargar menú de navegación en sidebar/navbar en aplicación
 * - Mostrar solo opciones que usuario puede acceder
 * - Determinar rutas disponibles según permisos
 * - Pre-cargar en layout principal
 *
 * **Performance**:
 * - Rápida (usa cache de menú)
 * - Filtrado en memoria
 * - Típicamente < 50ms
 * - Cache invalidado automáticamente cuando menú cambia
 *
 * @method GET
 * @route /api/customer/menu
 * @auth Requerida (JWT válido)
 *
 * @returns {Promise<NextResponse>} Menú personalizado según permisos (200) o error
 *
 * @example
 * ```typescript
 * // Obtener menú del usuario actual
 * const response = await fetch('/api/customer/menu', {
 *   headers: {
 *     'Authorization': `Bearer ${token}`
 *   }
 * })
 *
 * if (response.ok) {
 *   const menu = await response.json()
 *   // menu es array de items raíz con children si aplica
 *   menu.forEach(item => {
 *     console.log(`${item.icon} ${item.title}`)
 *     item.children?.forEach(child => {
 *       console.log(`  - ${child.title}`)
 *     })
 *   })
 * } else if (response.status === 401) {
 *   console.log('Usuario no autenticado')
 * }
 * ```
 *
 * @see {@link ../profile/route.ts} para obtener perfil del usuario
 * @see {@link /api/admin/menu/route.ts} para ver todos los items (admin only)
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMenuForUser } from '@/modules/admin/services';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const menu = await getMenuForUser(session.user.id);
    return NextResponse.json(menu);
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
