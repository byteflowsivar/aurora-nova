import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/connection';

type RouteContext = {
  params: Promise<{
    orderNumber: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const session = await auth();
        const { orderNumber } = await params;
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }

        const order = await prisma.order.findFirst({
            where: { 
                orderNumber: orderNumber,
                userId: session.user.id,
            },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: true
                            }
                        }
                    }
                },
                user: true,
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        return NextResponse.json(order);

    } catch (error) {
        const { orderNumber } = await params;
        console.error(`Error fetching order ${orderNumber}:`, error);
        return NextResponse.json({ error: 'Could not fetch order' }, { status: 500 });
    }
}
