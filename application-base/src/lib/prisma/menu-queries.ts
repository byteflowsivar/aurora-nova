import { PrismaClient, Prisma } from '@/lib/prisma/generated';
import type { MenuItem } from '@/lib/types/menu';
import { getUserPermissions } from '@/lib/prisma/permission-queries';

const prisma = new PrismaClient();

/**
 * Obtiene el menú completo filtrado por permisos del usuario.
 * Retorna una estructura jerárquica lista para renderizar.
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
 * Obtiene todos los items del menú (para admin), incluyendo inactivos.
 * Retorna estructura jerárquica.
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
 */
export async function createMenuItem(data: Prisma.MenuItemCreateInput): Promise<MenuItem> {
  return await prisma.menuItem.create({ data });
}

/**
 * Actualiza un item de menú
 */
export async function updateMenuItem(id: string, data: Prisma.MenuItemUpdateInput): Promise<MenuItem> {
  return await prisma.menuItem.update({
    where: { id },
    data,
  });
}

/**
 * Elimina un item de menú
 */
export async function deleteMenuItem(id: string): Promise<void> {
  await prisma.menuItem.delete({ where: { id } });
}

/**
 * Reordena items del menú
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
