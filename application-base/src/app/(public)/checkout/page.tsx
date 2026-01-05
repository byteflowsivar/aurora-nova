'use client';

import React from 'react';
import { useCart } from '@/modules/public/contexts/cart-context';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function CheckoutPage() {
  const { state } = useCart();
  
  const subtotal = state.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      
      <div className="grid md:grid-cols-2 gap-12">
        {/* Order Summary */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Resumen de tu Pedido</h2>
          <div className="space-y-4 rounded-lg border p-4">
            {state.items.map(item => (
              <div key={item.variantId} className="flex items-center gap-4">
                <div className="relative h-16 w-16 rounded-md overflow-hidden">
                  {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                </div>
                <div className="flex-grow">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Cantidad: {item.quantity}</p>
                </div>
                <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-semibold text-lg">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Shipping Info & Action */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Información de Envío</h2>
          {/* TODO: Add shipping form for guest users */}
          <div className="space-y-4">
             <p className="text-muted-foreground">Aquí irá un formulario para la dirección de envío.</p>
          </div>
          
          <Button size="lg" className="w-full mt-8">
            Realizar Pedido
          </Button>
        </div>
      </div>
    </div>
  );
}
