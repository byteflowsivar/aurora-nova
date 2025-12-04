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
