import type { MenuItem } from '@/lib/types/menu';
import { getMenuForUser } from '@/lib/prisma/menu-queries';

const menuCache = new Map<string, { menu: MenuItem[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export async function getCachedMenu(userId: string): Promise<MenuItem[]> {
  const cached = menuCache.get(userId);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.menu;
  }

  const menu = await getMenuForUser(userId);
  menuCache.set(userId, { menu, timestamp: Date.now() });

  return menu;
}

export function invalidateMenuCache() {
  menuCache.clear();
}
