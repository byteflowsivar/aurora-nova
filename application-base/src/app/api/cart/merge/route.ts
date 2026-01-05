import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/connection';

interface CartItemPayload {
  variantId: string;
  quantity: number;
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }

        const { items }: { items: CartItemPayload[] } = await request.json();
        if (!items || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Invalid items payload' }, { status: 400 });
        }

        const userCart = await prisma.cart.upsert({
            where: { userId: session.user.id },
            update: {},
            create: { userId: session.user.id },
        });

        for (const item of items) {
            const existingItem = await prisma.cartItem.findFirst({
                where: {
                    cartId: userCart.id,
                    variantId: item.variantId,
                }
            });

            if (existingItem) {
                await prisma.cartItem.update({
                    where: { id: existingItem.id },
                    data: { quantity: existingItem.quantity + item.quantity },
                });
            } else {
                await prisma.cartItem.create({
                    data: {
                        cartId: userCart.id,
                        variantId: item.variantId,
                        quantity: item.quantity,
                    }
                });
            }
        }

        return NextResponse.json({ success: true, message: 'Cart merged successfully.' });

    } catch (error) {
        console.error('Error merging cart:', error);
        return NextResponse.json({ error: 'Could not merge cart' }, { status: 500 });
    }
}
