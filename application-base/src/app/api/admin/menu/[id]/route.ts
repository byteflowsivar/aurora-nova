import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/server/require-permission';
import { updateMenuItem, deleteMenuItem } from '@/modules/admin/services';
import { z } from 'zod';
import { invalidateMenuCache } from '@/lib/menu/menu-cache';

// Zod schema for validating the request body for updating a menu item
const updateMenuItemSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  href: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
  permissionId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requirePermission('menu:manage');
    const json = await request.json();
    const data = updateMenuItemSchema.parse(json);

    const updatedMenuItem = await updateMenuItem(id, data);

    invalidateMenuCache();

    return NextResponse.json(updatedMenuItem);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.name === 'UnauthenticatedError' || error.name === 'PermissionDeniedError')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error(`Error updating menu item ${id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requirePermission('menu:manage');
    await deleteMenuItem(id);

    invalidateMenuCache();

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    if (error instanceof Error && (error.name === 'UnauthenticatedError' || error.name === 'PermissionDeniedError')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error(`Error deleting menu item ${id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
