'use client';

import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateBaseProductSchema, UpdateProductSchema, CreateProductSchema } from '@/lib/validations/product';
import { Trash2, X } from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import Image from 'next/image';
import { toast } from 'sonner';

// Shared types
interface Product {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  variants: {
    id: string;
    price: number;
    stock: number;
    attributes: Record<string, string>;
    images: { finalUrl: string; altText?: string }[];
  }[];
}

type ProductFormValues = z.infer<typeof CreateBaseProductSchema> | z.infer<typeof UpdateProductSchema>;

interface ProductFormProps {
  onSuccess?: (productId: string) => void;
  initialData?: Product | null;
  mode: 'create' | 'edit';
}

export function ProductForm({ onSuccess, initialData, mode }: ProductFormProps) {
  const isEditMode = mode === 'edit';

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(z.object({ name: z.string() })), // Temporarily use a simple schema
    defaultValues: initialData || {
const defaultValues: Partial<ProductFormValues> = {
  name: '',
  description: undefined,
  isActive: undefined,
  variants: [{ price: 0, stock: 0, attributes: {}, images: [] }],
};
    },
  });
  
  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'variants',
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(data: ProductFormValues) {
    console.log("Form Data submitted:", data);
    /*
    try {
      const url = isEditMode ? `/api/admin/products/${initialData?.id}` : '/api/admin/products';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${mode} product`);
      }
      
      const result = await response.json();

      toast.success(`Producto ${isEditMode ? 'actualizado' : 'creado'} exitosamente!`);
      if (onSuccess) {
        onSuccess(result.id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    */
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Producto</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Camiseta de Algodón" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe el producto..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value as boolean}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Producto Activo</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {isEditMode && (
          <div>
            <h3 className="text-lg font-medium mb-4">Variantes</h3>
            <div className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-md relative">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`variants.${index}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.stock`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name={`variants.${index}.attributes`}
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Atributos</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej: Color:Azul,Talla:M"
                            onChange={(e) => {
                              const attrs = e.target.value.split(',').reduce((acc, pair) => {
                                const [key, value] = pair.split(':');
                                if (key && value) {
                                  acc[key.trim()] = value.trim();
                                }
                                return acc;
                              }, {} as Record<string, string>);
                              field.onChange(attrs);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="mt-4">
                    <FormLabel>Imágenes</FormLabel>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {(field as any).images?.filter((img: any) => img && img.finalUrl).map((image: any, imgIndex: number) => (
                        <div key={imgIndex} className="relative">
                          <Image src={image.finalUrl} alt="preview" width={80} height={80} className="rounded-md object-cover" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={() => {
                              const newImages = (field as any).images?.filter((_: any, i: number) => i !== imgIndex) || [];
                              update(index, { ...field, images: newImages });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2">
                      <ImageUploader 
                        onUpload={(url) => {
                          const newImages = [...((field as any).images || []), { finalUrl: url, altText: '' }];
                          update(index, { ...field, images: newImages });
                        }}
                      />
                    </div>
                  </div>

                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => append({ price: 0, stock: 0, attributes: {}, images: [] })}
            >
              Añadir Variante
            </Button>
          </div>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Crear Producto y Continuar')}
        </Button>
      </form>
    </Form>
  );
}
