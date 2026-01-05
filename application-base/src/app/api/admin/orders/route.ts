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

    const canListOrders = await hasPermission(session.user.id, SYSTEM_PERMISSIONS.ORDER_LIST);
    if (!canListOrders) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        take: limit,
        skip: offset,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      }),
      prisma.order.count(),
    ]);

    return NextResponse.json({
      data: orders,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Could not fetch orders' }, { status: 500 });
  }
}
