'use client';

import React, { useEffect, useState } from 'react';
import { ProductForm } from '@/modules/admin/components/products/product-form';
import { useRouter, useParams } from 'next/navigation';

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams(); // Use useParams to get the ID
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProduct() {
      if (!id) return; // Ensure id is available
      try {
        const res = await fetch(`/api/admin/products/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]); // Use id in the dependency array

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
