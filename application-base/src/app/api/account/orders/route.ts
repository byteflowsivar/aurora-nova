import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/connection';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }

        const orders = await prisma.order.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: true
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json(orders);

    } catch (error) {
        console.error('Error fetching order history:', error);
        return NextResponse.json({ error: 'Could not fetch order history' }, { status: 500 });
    }
}
