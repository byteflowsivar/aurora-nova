import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/modules/admin/utils/permission-utils';
import { SYSTEM_PERMISSIONS } from '@/modules/admin/types';
import { prisma } from '@/lib/prisma/connection';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const canListInventory = await hasPermission(session.user.id, SYSTEM_PERMISSIONS.INVENTORY_LIST);
    if (!canListInventory) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [variants, total] = await prisma.$transaction([
      prisma.productVariant.findMany({
        take: limit,
        skip: offset,
        orderBy: {
          product: {
            name: 'asc',
          },
        },
        include: {
          product: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.productVariant.count(),
    ]);

    return NextResponse.json({
      data: variants,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ error: 'Could not fetch inventory' }, { status: 500 });
  }
}
