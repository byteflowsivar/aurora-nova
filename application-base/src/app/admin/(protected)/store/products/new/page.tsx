'use client';

import React from 'react';
import { ProductForm } from '@/modules/admin/components/products/product-form';
import { useRouter } from 'next/navigation';

export default function NewProductPage() {
  const router = useRouter();

  const handleSuccess = (productId: string) => {
    router.push(`/admin/store/products/${productId}/edit`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Crear Nuevo Producto</h1>
      <p className="text-muted-foreground mb-6">
        Empieza creando los detalles básicos del producto. Podrás añadir variantes, imágenes y más en el siguiente paso.
      </p>
      <ProductForm mode="create" onSuccess={handleSuccess} />
    </div>
  );
}
