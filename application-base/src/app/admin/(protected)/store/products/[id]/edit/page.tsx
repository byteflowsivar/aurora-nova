'use client';

import React, { useEffect, useState } from 'react';
import { ProductForm } from '@/modules/admin/components/products/product-form';
import { useRouter } from 'next/navigation';

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const productId = params.id; // Destructure here

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/admin/products/${productId}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [productId]); // Use productId here

  const handleSuccess = () => {
    // Optional: could navigate back to the list or just show a toast
    router.refresh();
  };

  if (loading) {
    return <div>Cargando producto...</div>;
  }
  
  if (!product) {
    return <div>Producto no encontrado.</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Editar Producto</h1>
      <ProductForm mode="edit" initialData={product} onSuccess={handleSuccess} />
    </div>
  );
}
