import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/connection';

type RouteContext = {
  params: {
    orderNumber: string;
  };
};

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }

        const order = await prisma.order.findFirst({
            where: { 
                orderNumber: params.orderNumber,
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
        console.error(`Error fetching order ${params.orderNumber}:`, error);
        return NextResponse.json({ error: 'Could not fetch order' }, { status: 500 });
    }
}
