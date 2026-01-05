import { sendOrderConfirmationEmail } from '@/lib/email';

// ... (imports and schemas) ...

export async function POST() {
    const session = await auth();
    
    if (!session?.user?.id || !session.user.email) {
        return NextResponse.json({ error: 'Not authorized for this action yet.' }, { status: 401 });
    }

    try {
        const userCart = await prisma.cart.findUnique({
            where: { userId: session.user.id },
            include: { items: { include: { variant: { include: { product: true } } } } },
        });

        if (!userCart || userCart.items.length === 0) {
            return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
        }
        
        const createdOrder = await prisma.$transaction(async (tx) => {
            let total = 0;
            const orderItemsData = [];

            for (const item of userCart.items) {
                const variant = await tx.productVariant.findUnique({
                    where: { id: item.variantId },
                });

                if (!variant || variant.stock < item.quantity) {
                    throw new Error(`Not enough stock for variant ${item.variantId}`);
                }

                total += variant.price * item.quantity;
                orderItemsData.push({
                    variantId: item.variantId,
                    quantity: item.quantity,
                    price: variant.price,
                });
            }
            
            // Create the order
            const newOrder = await tx.order.create({
                data: {
                    userId: session.user.id,
                    total: total,
                    orderNumber: `ORD-${Date.now()}`, // Simplified order number
                    items: {
                        create: orderItemsData,
                    },
                },
            });

            // Update stock and create inventory movements
            for (const item of orderItemsData) {
                await tx.productVariant.update({
                    where: { id: item.variantId },
                    data: { stock: { decrement: item.quantity } },
                });
                await tx.inventoryMovement.create({
                    data: {
                        variantId: item.variantId,
                        quantityChange: -item.quantity,
                        type: 'SALE',
                        reason: `Order ${newOrder.orderNumber}`,
                    }
                });
            }
            
            // Clear the user's cart
            await tx.cartItem.deleteMany({ where: { cartId: userCart.id } });

            return newOrder;
        });

        // Fetch the full order details for the email
        const fullOrder = await prisma.order.findUnique({
            where: { id: createdOrder.id },
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
                user: true
            }
        });

        if (fullOrder && fullOrder.user) {
            // Send confirmation email (fire and forget)
            sendOrderConfirmationEmail(fullOrder.user.email!, {
                customerName: fullOrder.user.name || 'Cliente',
                orderNumber: fullOrder.orderNumber,
                total: fullOrder.total,
                items: fullOrder.items.map(item => ({
                    quantity: item.quantity,
                    name: `${item.variant.product.name} (${Object.values(item.variant.attributes as object).join(', ')})`,
                    price: item.price,
                }))
            });
        }

        return NextResponse.json(fullOrder, { status: 201 });

    } catch (error) {
        console.error('Error creating order:', error);
        return NextResponse.json({ error: 'Could not create order', details: (error as Error).message }, { status: 500 });
    }
}
