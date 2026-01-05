import React from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

// Define the types based on the API response
interface ProductImage {
  id: string;
  url: string;
  altText?: string | null;
}

interface ProductVariant {
  id: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  images: ProductImage[];
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  variants: ProductVariant[];
}

async function getProduct(slug: string) {
  const res = await fetch(`http://localhost:3000/api/products/${slug}`, { cache: 'no-store' });
  
  if (!res.ok) {
    // This will activate the closest `error.js` Error Boundary
    throw new Error('Failed to fetch product');
  }
  
  return res.json() as Promise<Product>;
}

import { AddToCart } from '@/modules/public/components/add-to-cart';
import { Button } from '@/components/ui/button';

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  const mainImage = product.variants.flatMap(v => v.images)[0] || null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <div>
          <div className="aspect-square relative bg-secondary rounded-lg">
            {mainImage && (
              <Image
                src={mainImage.url}
                alt={mainImage.altText || product.name}
                fill
                className="object-cover rounded-lg"
              />
            )}
          </div>
          {/* TODO: Image gallery */}
        </div>
        
        <div className="space-y-6">
          <h1 className="text-3xl lg:text-4xl font-bold">{product.name}</h1>
          
          {product.description && (
            <div className="text-muted-foreground">
              <p>{product.description}</p>
            </div>
          )}

          <AddToCart product={product} />
        </div>
      </div>
    </div>
  );
}
