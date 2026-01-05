import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price?: number;
    imageUrl?: string;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.slug}`}>
      <Card className="overflow-hidden transition-all hover:shadow-lg">
        <CardHeader className="p-0">
          <div className="aspect-square relative">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
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
          {product.price && (
            <Badge variant="outline" className="text-base font-bold">
              ${product.price.toFixed(2)}
            </Badge>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
