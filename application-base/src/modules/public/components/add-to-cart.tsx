'use client';

import React, { useState, useMemo } from 'react';
import { useCart } from '@/modules/public/contexts/cart-context';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Copied types, should be shared
interface ProductVariant {
  id: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  images: { url: string; altText?: string | null }[];
}

interface Product {
  id: string;
  name: string;
  variants: ProductVariant[];
}

interface AddToCartProps {
  product: Product;
}

export function AddToCart({ product }: AddToCartProps) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(product.variants[0]?.id || null);

  const options = useMemo(() => {
    const opts: Record<string, Set<string>> = {};
    product.variants.forEach(variant => {
      Object.entries(variant.attributes).forEach(([key, value]) => {
        if (!opts[key]) {
          opts[key] = new Set();
        }
        opts[key].add(value);
      });
    });
    return opts;
  }, [product.variants]);

  const selectedVariant = product.variants.find(v => v.id === selectedVariantId);

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      toast.error('Por favor, selecciona una variante.');
      return;
    }
    
    setIsAdding(true);
    try {
      await addItem({
        variantId: selectedVariant.id,
        productId: product.id,
        name: product.name,
        price: selectedVariant.price,
        quantity: 1,
        image: selectedVariant.images[0]?.url,
      });
      toast.success(`${product.name} añadido al carrito!`);
    } catch (error) {
      toast.error('No se pudo añadir el producto al carrito.');
    } finally {
      setIsAdding(false);
    }
  };
  
  // This is a simplified variant selector. A real app would have more complex logic
  // to handle combinations and availability.
  return (
    <div className="space-y-6">
      {Object.entries(options).map(([key, values]) => (
        <div key={key} className="space-y-2">
          <h3 className="text-sm font-semibold">{key}</h3>
          <div className="flex gap-2">
            {Array.from(values).map(value => (
              <Button key={value} variant="outline" size="sm">{value}</Button>
            ))}
          </div>
        </div>
      ))}
      
      <div className="flex gap-4 items-center">
          <p className="text-2xl font-semibold">${selectedVariant?.price.toFixed(2) || 'N/A'}</p>
          <Button size="lg" className="flex-grow" onClick={handleAddToCart} disabled={!selectedVariant || selectedVariant.stock === 0 || isAdding}>
            {isAdding ? 'Añadiendo...' : (selectedVariant?.stock === 0 ? 'Agotado' : 'Añadir al Carrito')}
          </Button>
      </div>
    </div>
  );
}
