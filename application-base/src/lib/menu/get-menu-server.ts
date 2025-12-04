import { auth } from '@/lib/auth';
import { getCachedMenu } from './menu-cache';
import type { MenuItem } from '@/modules/admin/types';

export async function getMenuServer(): Promise<MenuItem[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }
  return await getCachedMenu(session.user.id);
}
