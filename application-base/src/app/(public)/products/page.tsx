import React from 'react';
import { ProductCard } from '@/modules/public/components/product-card';

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

async function getProducts() {
  // In a real app, the base URL would come from an environment variable
  const res = await fetch('http://localhost:3000/api/products', { cache: 'no-store' });
  
  if (!res.ok) {
    throw new Error('Failed to fetch products');
  }
  
  const data = await res.json();
  return data.data as Product[];
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Nuestro Catálogo</h1>
      
      {products.length === 0 ? (
        <p>No hay productos disponibles en este momento.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
