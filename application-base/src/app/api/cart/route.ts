import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/connection';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }

        const cart = await prisma.cart.findUnique({
            where: { userId: session.user.id },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: true,
                                images: true,
                            }
                        }
                    }
                }
            }
        });

        if (!cart) {
            // If user has no cart yet, create one
            const newCart = await prisma.cart.create({
                data: {
                    userId: session.user.id
                },
                include: {
                    items: true
                }
            });
            return NextResponse.json(newCart);
        }

        return NextResponse.json(cart);

    } catch (error) {
            console.error('Error fetching cart:', error);
            return NextResponse.json({ error: 'Could not fetch cart' }, { status: 500 });
          }
        }
        
        export async function POST() {
            try {
                const session = await auth();
                if (!session?.user?.id) {
                    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
                }
        
                const { variantId, quantity } = await request.json();
                if (!variantId || !quantity) {
                    return NextResponse.json({ error: 'variantId and quantity are required' }, { status: 400 });
                }
        
                const userCart = await prisma.cart.upsert({
                    where: { userId: session.user.id },
                    update: {},
                    create: { userId: session.user.id },
                });
        
                const existingItem = await prisma.cartItem.findFirst({
                    where: {
                        cartId: userCart.id,
                        variantId: variantId,
                    }
                });
        
                if (existingItem) {
                    await prisma.cartItem.update({
                        where: { id: existingItem.id },
                        data: { quantity: existingItem.quantity + quantity },
                    });
                } else {
                    await prisma.cartItem.create({
                        data: {
                            cartId: userCart.id,
                            variantId: variantId,
                            quantity: quantity,
                        }
                    });
                }
                
                const updatedCart = await prisma.cart.findUnique({
                    where: { id: userCart.id },
                    include: { items: { include: { variant: true } } }
                });
        
                return NextResponse.json(updatedCart);
        
            } catch (error) {
                console.error('Error adding item to cart:', error);
                return NextResponse.json({ error: 'Could not add item to cart' }, { status: 500 });
            }
        }
        
