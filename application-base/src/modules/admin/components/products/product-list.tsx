'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ProductForm } from './product-form';
import { toast } from 'sonner';

// ... (interface definitions remain the same) ...

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setProductToEdit(null);
    fetchProducts();
  };

  const openCreateForm = () => {
    setProductToEdit(null);
    setIsFormOpen(true);
  };

  const openEditForm = (product: Product) => {
    setProductToEdit(product);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      const response = await fetch(`/api/admin/products/${productToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete product');
      toast.success(`Producto "${productToDelete.name}" eliminado.`);
      setProductToDelete(null);
      fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unknown error occurred.');
    }
  };

  if (loading) return <div>Cargando productos...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Productos</h2>
          <Button onClick={openCreateForm}>Añadir Producto</Button>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Variantes</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant={product.isActive ? 'default' : 'destructive'}>
                      {product.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>{product.variants.length}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEditForm(product)}>Editar</Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setProductToDelete(product)}>Eliminar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{productToEdit ? 'Editar Producto' : 'Añadir Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <ProductForm onSuccess={handleFormSuccess} initialData={productToEdit} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el producto "{productToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
