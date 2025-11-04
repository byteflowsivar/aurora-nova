import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/server/require-permission';
import { getAllMenuItems, createMenuItem } from '@/lib/prisma/menu-queries';
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
