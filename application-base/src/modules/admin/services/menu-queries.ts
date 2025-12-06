/**
 * Módulo de Queries para Menú Jerárquico - Aurora Nova
 *
 * Proporciona funciones para gestionar y filtrar el menú de navegación de la app.
 * Soporta menús jerárquicos (anidados) con filtrado por permisos RBAC.
 *
 * **Estructura**:
 * - Menú jerárquico: items con `parentId` opcional
 * - Grupos (carpetas): items sin `href` que contienen subitems
 * - Ítems normales: items con `href` para navegar
 * - Activos/Inactivos: `isActive` flag para mostrar/ocultar
 *
 * **Autorización**:
 * - Integración con RBAC: filtrado por `permissionId`
 * - Cada item puede requerir 0 o 1 permiso
 * - Items sin `permissionId`: siempre visibles
 * - Pruning: grupos vacíos se eliminan automáticamente
 *
 * **Casos de Uso**:
 * - Sidebar/Navigation: `getMenuForUser()` filtra por permisos
 * - Admin Panel: `getAllMenuItems()` lista todos (incluso inactivos)
 * - CRUD: crear, actualizar, eliminar, reordenar items
 *
 * **Ejemplo de Estructura de Datos**:
 * ```
 * Dashboard (id: dashboard, permissionId: null, parentId: null)
 * ├── Usuarios (id: users, permissionId: "admin:view-users", parentId: dashboard)
 * ├── Roles (id: roles, permissionId: "admin:manage-roles", parentId: dashboard)
 * └── Auditoría (id: audit, permissionId: "admin:view-audit", parentId: dashboard)
 * Settings (id: settings, permissionId: null, parentId: null)
 * └── Perfil (id: profile, permissionId: null, parentId: settings)
 * ```
 *
 * **Flujo de Renderización**:
 * ```typescript
 * // 1. Usuario abre app
 * const menu = await getMenuForUser(userId)
 * // 2. Sistema obtiene permisos del usuario
 * // 3. Filtra items por permisos
 * // 4. Construye estructura jerárquica
 * // 5. Poda grupos sin hijos visibles
 * // 6. Retorna árbol listo para render
 * ```
 *
 * @module admin/services/menu-queries
 * @see {@link @/modules/admin/services/permission-queries.ts} para verificación de permisos
 * @see {@link @/modules/admin/types} para tipo MenuItem
 */

import { PrismaClient, Prisma } from '@/lib/prisma/generated';
import type { MenuItem } from '@/modules/admin/types';
import { getUserPermissions } from './permission-queries';

const prisma = new PrismaClient();

/**
 * Obtiene el menú completo filtrado por permisos del usuario
 *
 * **Función Principal de Renderización**: devuelve el menú que debe mostrar el usuario.
 * Filtra items por:
 * - **Activos**: solo items con `isActive: true`
 * - **Permisos**: verifica cada item contra permisos del usuario
 * - **Estructura**: mantiene jerarquía padre-hijo
 * - **Pruning**: elimina grupos vacíos automáticamente
 *
 * **Proceso**:
 * 1. Obtener permisos del usuario (string[] de permissionIds)
 * 2. Cargar todos los items activos ordenados
 * 3. Filtrar items: user tiene permiso O item no requiere permiso
 * 4. Construir mapa de items (performance para búsqueda)
 * 5. Enlazar padres con hijos
 * 6. Podar grupos sin hijos accesibles
 * 7. Retornar estructura lista para render
 *
 * **Filtrado de Permisos**:
 * ```
 * Item visible si:
 * - permissionId === null (público) OR
 * - user.permissions.includes(item.permissionId)
 * ```
 *
 * **Ejemplo - Usuario sin permisos admin**:
 * ```typescript
 * // Datos en BD:
 * Dashboard (no permission) ← siempre visible
 * ├── Users (admin:view-users) ← requiere permiso
 * ├── Roles (admin:manage-roles) ← requiere permiso
 * Settings (no permission) ← siempre visible
 * └── Profile (no permission) ← siempre visible
 *
 * // Usuario normal SIN admin:view-users, admin:manage-roles
 * const menu = await getMenuForUser(normalUserId)
 * // Retorna:
 * Dashboard ← grupo vacío, se poda
 * Settings
 * └── Profile
 * ```
 *
 * **Ejemplo - Admin con todos los permisos**:
 * ```typescript
 * // Usuario admin CON todos los permisos
 * const menu = await getMenuForUser(adminUserId)
 * // Retorna:
 * Dashboard
 * ├── Users
 * ├── Roles
 * └── Audit
 * Settings
 * └── Profile
 * ```
 *
 * **Estructura de MenuItem**:
 * ```typescript
 * {
 *   id: string
 *   label: string
 *   href?: string (undefined para grupos)
 *   icon?: string
 *   permissionId?: string (undefined = público)
 *   isActive: boolean
 *   order: number
 *   parentId?: string (undefined = root item)
 *   children: MenuItem[] (siempre array, nunca null)
 * }
 * ```
 *
 * **Performance**:
 * - O(n) queries (1 getUserPermissions + 1 findMany)
 * - O(n) construcción de árbol
 * - O(n) pruning recursivo
 * - Total: O(n) donde n = número total de items
 *
 * **Casos de Uso**:
 * - Renderizar sidebar/navigation al cargar app
 * - Validar acceso a ruta (verificar existencia en menú)
 * - Breadcrumbs dinámicos
 *
 * @async
 * @param {string} userId - ID del usuario
 * @returns {Promise<MenuItem[]>} Array de items raíz con hijos anidados
 *
 * @example
 * ```typescript
 * const userMenu = await getMenuForUser('user_123')
 * // [
 * //   {
 * //     id: 'dashboard',
 * //     label: 'Dashboard',
 * //     href: '/admin/dashboard',
 * //     children: [],
 * //     ...
 * //   },
 * //   {
 * //     id: 'settings',
 * //     label: 'Settings',
 * //     children: [
 * //       { id: 'profile', label: 'Profile', href: '/admin/settings/profile', ... }
 * //     ]
 * //   }
 * // ]
 * ```
 *
 * @see {@link getUserPermissions} para obtener permisos del usuario
 * @see {@link getAllMenuItems} para menú sin filtrado (admin)
 */
export async function getMenuForUser(userId: string): Promise<MenuItem[]> {
  const userPermissions = await getUserPermissions(userId);
  const allMenuItems = await prisma.menuItem.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  });

  const accessibleItems = allMenuItems.filter(item => {
    if (!item.permissionId) return true;
    return userPermissions.includes(item.permissionId);
  });

  const menuMap = new Map<string, MenuItem>();
  const rootItems: MenuItem[] = [];

  accessibleItems.forEach(item => {
    menuMap.set(item.id, { ...item, children: [] });
  });

  accessibleItems.forEach(item => {
    if (item.parentId && menuMap.has(item.parentId)) {
      const parent = menuMap.get(item.parentId);
      if (parent && parent.children) {
        parent.children.push(menuMap.get(item.id)!);
      }
    } else if (!item.parentId) {
      rootItems.push(menuMap.get(item.id)!);
    }
  });

  const filterEmptyGroups = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      if (!item.href) {
        if (item.children && item.children.length > 0) {
          item.children = filterEmptyGroups(item.children);
          return item.children.length > 0;
        }
        return false;
      }
      return true;
    });
  };

  return filterEmptyGroups(rootItems);
}

/**
 * Obtiene TODOS los items del menú sin filtrado de permisos (admin panel)
 *
 * **Admin Only**: devuelve todos los items incluyendo inactivos.
 * Usado en el panel de admin para gestionar la estructura del menú.
 *
 * **Diferencia con getMenuForUser**:
 * - `getMenuForUser()`: filtra por permisos + activos solamente
 * - `getAllMenuItems()`: todos los items sin filtrado
 *
 * **Contenido**:
 * - Items activos e inactivos (`isActive: true/false`)
 * - Todos los items sin importar `permissionId`
 * - Estructura jerárquica completa
 * - Ordenados por `order` ASC
 *
 * **Casos de Uso**:
 * - Admin dashboard: tabla/lista completa de items
 * - Gestión de menú: crear, editar, reordenar, eliminar
 * - Auditoría: ver TODAS las opciones de menú disponibles
 * - Búsqueda: encontrar item por id/label para editar
 *
 * **Ejemplo**:
 * ```typescript
 * // Panel de admin: mostrar todos los items
 * const allItems = await getAllMenuItems()
 * // Usado en tabla admin-menu:
 * // [
 * //   { id: 'dashboard', label: 'Dashboard', isActive: true, ... },
 * //   { id: 'users', label: 'Users', isActive: true, parentId: 'dashboard' },
 * //   { id: 'archived-item', label: 'Archived', isActive: false, ... }
 * // ]
 * ```
 *
 * **Nota de Seguridad**:
 * - Debe estar protegido por middleware (solo admin puede acceder)
 * - Verificar `admin:manage-menu` antes de llamar desde ruta
 *
 * @async
 * @returns {Promise<MenuItem[]>} Array de TODOS los items (activos e inactivos)
 *
 * @example
 * ```typescript
 * const fullMenu = await getAllMenuItems()
 * console.log(`Total items: ${flattenArray(fullMenu).length}`)
 * ```
 *
 * @see {@link getMenuForUser} para menú filtrado por permisos (usuarios normales)
 * @see {@link createMenuItem} para agregar nuevo item
 * @see {@link updateMenuItem} para editar item
 */
export async function getAllMenuItems(): Promise<MenuItem[]> {
  const allItems = await prisma.menuItem.findMany({
    orderBy: { order: 'asc' },
  });

  const menuMap = new Map<string, MenuItem>();
  const rootItems: MenuItem[] = [];

  allItems.forEach(item => {
    menuMap.set(item.id, { ...item, children: [] });
  });

  allItems.forEach(item => {
    if (item.parentId && menuMap.has(item.parentId)) {
      const parent = menuMap.get(item.parentId);
      if (parent && parent.children) {
        parent.children.push(menuMap.get(item.id)!);
      }
    } else if (!item.parentId) {
      rootItems.push(menuMap.get(item.id)!);
    }
  });

  return rootItems;
}

/**
 * Crea un nuevo item de menú
 *
 * **Operación**: INSERT en tabla menuItem.
 * **Requiere**: admin:manage-menu permission.
 *
 * **Parámetros de Entrada** (MenuItemCreateInput):
 * - `id`: Identificador único (string, requerido)
 * - `label`: Texto visible en menú (string, requerido)
 * - `href`: URL de destino (string, opcional - null para grupos)
 * - `icon`: Clase de icono (string, opcional - ej: 'lucide-users')
 * - `permissionId`: Permiso requerido (string, opcional)
 * - `isActive`: Mostrar/ocultar (boolean, default: true)
 * - `order`: Posición en listado (number, default: 0)
 * - `parentId`: ID del padre (string, opcional - null para root)
 *
 * **Validaciones Recomendadas**:
 * - ID único: verificar no existe antes de crear
 * - Label no vacío
 * - Si parentId: verificar que padre existe
 * - Si permissionId: verificar que permiso existe
 * - Evitar ciclos: padre ≠ hijo
 *
 * **Ejemplo - Crear Grupo**:
 * ```typescript
 * const adminGroup = await createMenuItem({
 *   id: 'admin',
 *   label: 'Administration',
 *   icon: 'lucide-settings',
 *   isActive: true,
 *   order: 10
 *   // sin href (es un grupo)
 *   // sin parentId (es root)
 * })
 * ```
 *
 * **Ejemplo - Crear Item dentro de Grupo**:
 * ```typescript
 * const usersItem = await createMenuItem({
 *   id: 'users',
 *   label: 'Users Management',
 *   href: '/admin/users',
 *   icon: 'lucide-users',
 *   permissionId: 'admin:view-users',
 *   parentId: 'admin', // dentro del grupo 'admin'
 *   order: 1
 * })
 * ```
 *
 * @async
 * @param {Prisma.MenuItemCreateInput} data - Datos del item a crear
 * @returns {Promise<MenuItem>} Item creado con id generado
 *
 * @example
 * ```typescript
 * const newItem = await createMenuItem({
 *   id: 'dashboard',
 *   label: 'Dashboard'
 * })
 * ```
 *
 * @see {@link updateMenuItem} para modificar item existente
 * @see {@link reorderMenuItems} para cambiar orden después de crear
 */
export async function createMenuItem(data: Prisma.MenuItemCreateInput): Promise<MenuItem> {
  return await prisma.menuItem.create({ data });
}

/**
 * Actualiza un item de menú existente
 *
 * **Operación**: UPDATE en tabla menuItem por id.
 * **Requiere**: admin:manage-menu permission.
 *
 * **Qué se puede actualizar**:
 * - `label`: Texto visible
 * - `href`: URL de destino
 * - `icon`: Clase de icono
 * - `permissionId`: Permiso requerido
 * - `isActive`: Visibilidad
 * - `order`: Posición (usar reorderMenuItems para batch)
 * - `parentId`: Mover a otro grupo
 *
 * **Casos de Uso**:
 * - Cambiar texto visible: label
 * - Cambiar icono: icon
 * - Desactivar temporalmente: isActive = false
 * - Cambiar permiso requerido: permissionId
 * - Mover a otro grupo: parentId
 *
 * **Ejemplo - Desactivar Item**:
 * ```typescript
 * await updateMenuItem('users', {
 *   isActive: false
 * })
 * // Item no aparecerá en menú de usuarios
 * ```
 *
 * **Ejemplo - Cambiar Permiso**:
 * ```typescript
 * await updateMenuItem('audit', {
 *   permissionId: 'admin:view-audit-detailed'
 * })
 * ```
 *
 * **Ejemplo - Cambiar Label e Icono**:
 * ```typescript
 * await updateMenuItem('dashboard', {
 *   label: 'Home Dashboard',
 *   icon: 'lucide-home'
 * })
 * ```
 *
 * @async
 * @param {string} id - ID del item a actualizar
 * @param {Prisma.MenuItemUpdateInput} data - Datos a actualizar (solo campos modificados)
 * @returns {Promise<MenuItem>} Item actualizado con todos sus campos
 *
 * @example
 * ```typescript
 * const updated = await updateMenuItem('dashboard', {
 *   label: 'Home'
 * })
 * ```
 *
 * @see {@link createMenuItem} para crear nuevo item
 * @see {@link deleteMenuItem} para eliminar item
 */
export async function updateMenuItem(id: string, data: Prisma.MenuItemUpdateInput): Promise<MenuItem> {
  return await prisma.menuItem.update({
    where: { id },
    data,
  });
}

/**
 * Elimina un item de menú
 *
 * **Operación**: DELETE en tabla menuItem por id.
 * **Requiere**: admin:manage-menu permission.
 *
 * **Comportamiento**:
 * - Elimina el item especificado
 * - Los hijos huérfanos (si los hay) quedan sin padre (parentId = null)
 * - Transacción manual recomendada si quiere eliminar hijos también
 *
 * **Advertencia**:
 * - Si item tiene hijos, quedarán sin padre (huérfanos)
 * - Si item es grupo importante, considere desactivar en lugar de eliminar
 *
 * **Mejora Futura**:
 * Considere validar:
 * - ¿Tiene hijos? → advertencia o cascade delete
 * - ¿Eliminación en cascada? → eliminar también hijos
 *
 * **Ejemplo - Eliminar Item Simple**:
 * ```typescript
 * await deleteMenuItem('old-feature')
 * // Item desaparece del menú
 * ```
 *
 * **Ejemplo - Mejor: Desactivar en Lugar de Eliminar**:
 * ```typescript
 * // Opción 1: Desactivar (reversible)
 * await updateMenuItem('draft-page', { isActive: false })
 *
 * // Opción 2: Eliminar (irreversible)
 * await deleteMenuItem('draft-page')
 * ```
 *
 * @async
 * @param {string} id - ID del item a eliminar
 * @returns {Promise<void>} (sin retorno)
 *
 * @example
 * ```typescript
 * await deleteMenuItem('old-item')
 * ```
 *
 * @see {@link updateMenuItem} para desactivar en lugar de eliminar
 * @see {@link createMenuItem} para agregar nuevo item
 */
export async function deleteMenuItem(id: string): Promise<void> {
  await prisma.menuItem.delete({ where: { id } });
}

/**
 * Reordena múltiples items del menú en una transacción
 *
 * **Operación**: Batch UPDATE usando transacción.
 * **Requiere**: admin:manage-menu permission.
 *
 * **Características**:
 * - Transacción atómica: todos los updates succeeden o ninguno
 * - Batch operation: actualiza múltiples items en 1 query
 * - Performance: mejor que actualizar 1 por 1
 * - Atomicidad: si 1 falla, todos se revierten
 *
 * **Cuándo Usar**:
 * - Drag & drop en tabla admin (reordenar items)
 * - Importar nuevo menú (bulk reorder)
 * - Reacomodación después de batch create/delete
 *
 * **Parámetro de Entrada**:
 * ```typescript
 * {
 *   id: string      // ID del item a actualizar
 *   order: number   // Nueva posición (menor = arriba)
 * }[]
 * ```
 *
 * **Flujo en UI**:
 * ```
 * Usuario arrastra item en tabla
 * → onDragEnd() calcula nuevos órdenes
 * → reorderMenuItems([...])
 * → BD actualiza todos de golpe
 * → UI refleja cambios
 * ```
 *
 * **Ejemplo - Reordenar 3 Items**:
 * ```typescript
 * // Usuario cambió el orden en tabla:
 * // Antes: dashboard=0, users=1, roles=2
 * // Después: users=0, dashboard=1, roles=2
 *
 * await reorderMenuItems([
 *   { id: 'users', order: 0 },
 *   { id: 'dashboard', order: 1 },
 *   { id: 'roles', order: 2 }
 * ])
 * ```
 *
 * **Ejemplo - Mover Item al Final**:
 * ```typescript
 * const allItems = await getAllMenuItems()
 * const maxOrder = Math.max(...allItems.map(i => i.order))
 *
 * await reorderMenuItems([
 *   { id: 'new-feature', order: maxOrder + 1 }
 * ])
 * ```
 *
 * **Transacción Garantiza**:
 * - Si 5 items se envían: 5 succeeden o 0 succeeden
 * - No hay estados parciales (5 de 5 o 0 de 5)
 * - Mejor que 5 updates individuales
 *
 * **Performance**:
 * - Transacción Prisma: genera 1 transacción SQL
 * - Múltiples UPDATE dentro de 1 transacción
 * - Mejor que N queries individuales
 *
 * @async
 * @param {Array<{id: string, order: number}>} items - Array de {id, order} a actualizar
 * @returns {Promise<void>} (sin retorno)
 *
 * @example
 * ```typescript
 * // Mover 'dashboard' a posición 2
 * await reorderMenuItems([
 *   { id: 'dashboard', order: 2 }
 * ])
 *
 * // Reordenar 3 items
 * await reorderMenuItems([
 *   { id: 'a', order: 0 },
 *   { id: 'b', order: 1 },
 *   { id: 'c', order: 2 }
 * ])
 * ```
 *
 * @see {@link updateMenuItem} para actualizar un item específico
 * @see {@link getAllMenuItems} para obtener orden actual antes de reordenar
 */
export async function reorderMenuItems(items: { id: string; order: number }[]): Promise<void> {
  // Use a transaction to ensure all updates are atomic
  await prisma.$transaction(
    items.map((item) =>
      prisma.menuItem.update({
        where: { id: item.id },
        data: { order: item.order },
      })
    )
  );
}
