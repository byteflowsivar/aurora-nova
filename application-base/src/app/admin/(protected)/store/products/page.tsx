import React from 'react';
import { ProductList } from '@/modules/admin/components/products/product-list';

export default function StoreProductsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Gestión de Productos</h1>
      <ProductList />
    </div>
  );
}
