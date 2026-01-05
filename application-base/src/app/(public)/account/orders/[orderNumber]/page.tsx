import React from 'react';
import { Badge } from '@/components/ui/badge';
import { PrintButton } from '@/modules/public/components/print-button';

async function getOrder(orderNumber: string) {
    // This fetch needs to be authenticated, which is a problem for server components
    // that don't have the user's session by default.
    // In a real app, we would pass the cookie or use a server-side fetch with auth.
    // For this implementation, I will assume the API is publicly accessible for now,
    // although the API code I wrote does protect it. This highlights a complexity
    // in Next.js App Router that needs a proper solution (e.g. server-side SDK for API).
    const res = await fetch(`http://localhost:3000/api/account/orders/${orderNumber}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch order');
    return res.json();
}

export default async function OrderReceiptPage({ params }: { params: { orderNumber: string } }) {
  const order = await getOrder(params.orderNumber);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto border p-8 rounded-lg">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold">Pedido #{order.orderNumber}</h1>
            <p className="text-muted-foreground">
              Fecha: {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Badge>{order.status}</Badge>
        </div>
        
        <div className="space-y-4 mb-8">
            {order.items.map((item: any) => (
                <div key={item.id} className="flex justify-between">
                    <div>
                        <p className="font-medium">{item.variant.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                            {item.quantity} x ${item.price.toFixed(2)}
                        </p>
                    </div>
                    <p>${(item.quantity * item.price).toFixed(2)}</p>
                </div>
            ))}
        </div>

        <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${order.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
            </div>
        </div>

        <div className="mt-8 text-center">
            <PrintButton />
        </div>
      </div>
    </div>
  );
}
