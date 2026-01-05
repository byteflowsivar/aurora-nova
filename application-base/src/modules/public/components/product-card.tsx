import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Define the types based on the API response
interface ProductImage {
  id: string;
  url: string;
  altText?: string | null;
}

interface ProductVariant {
  id: string;
  price: number;
  images: ProductImage[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  variants: ProductVariant[];
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  // Find the first image available from any variant
  const firstImage = product.variants.flatMap(v => v.images).find(img => img.url);
  
  // Find the lowest price among variants
  const lowestPrice = Math.min(...product.variants.map(v => v.price));

  return (
    <Link href={`/products/${product.slug}`}>
      <Card className="overflow-hidden transition-all hover:shadow-lg">
        <CardHeader className="p-0">
          <div className="aspect-square relative">
            {firstImage ? (
              <Image
                src={firstImage.url}
                alt={firstImage.altText || product.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="bg-secondary flex items-center justify-center h-full">
                <span className="text-muted-foreground">No Image</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <CardTitle className="text-lg font-semibold leading-tight truncate">
            {product.name}
          </CardTitle>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Badge variant="outline" className="text-base font-bold">
            ${lowestPrice.toFixed(2)}
          </Badge>
        </CardFooter>
      </Card>
    </Link>
  );
}
