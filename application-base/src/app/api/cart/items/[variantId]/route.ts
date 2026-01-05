import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/connection';

type RouteContext = {
  params: Promise<{
    variantId: string;
  }>;
};

// PUT /api/cart/items/[variantId] - Update item quantity
export async function PUT(request: NextRequest, { params }: RouteContext) {
    try {
        const session = await auth();
        const { variantId } = await params;
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }

        const { quantity } = await request.json();
        if (typeof quantity !== 'number' || quantity < 0) {
            return NextResponse.json({ error: 'Valid quantity is required' }, { status: 400 });
        }

        const cart = await prisma.cart.findUnique({ where: { userId: session.user.id } });
        if (!cart) {
            return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
        }
        
        if (quantity === 0) {
            await prisma.cartItem.deleteMany({
                where: { cartId: cart.id, variantId: variantId },
            });
        } else {
            await prisma.cartItem.updateMany({
                where: { cartId: cart.id, variantId: variantId },
                data: { quantity },
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        const { variantId } = await params;
        console.error(`Error updating cart item ${variantId}:`, error);
        return NextResponse.json({ error: 'Could not update item' }, { status: 500 });
    }
}

// DELETE /api/cart/items/[variantId] - Remove item from cart
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const session = await auth();
        const { variantId } = await params;
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }

        const cart = await prisma.cart.findUnique({ where: { userId: session.user.id } });
        if (!cart) {
            return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
        }

        await prisma.cartItem.deleteMany({
            where: {
                cartId: cart.id,
                variantId: variantId,
            },
        });

        return new NextResponse(null, { status: 204 });

    } catch (error) {
        const { variantId } = await params;
        console.error(`Error deleting cart item ${variantId}:`, error);
        return NextResponse.json({ error: 'Could not delete item' }, { status: 500 });
    }
}
