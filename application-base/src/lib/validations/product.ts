import { z } from 'zod';

export const ProductImageSchema = z.object({
  finalUrl: z.string().min(1, 'La URL de la imagen es requerida.'),
  altText: z.string().optional(),
});

export const ProductVariantSchema = z.object({
  price: z.number().positive('El precio debe ser un número positivo.'),
  stock: z.number().int().min(0, 'El stock no puede ser negativo.'),
  attributes: z.record(z.string(), { description: 'Atributos como color o talla' }),
  images: z.array(ProductImageSchema).optional(),
});

export const CreateProductSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  variants: z.array(ProductVariantSchema).min(1, 'Debe haber al menos una variante.'),
});

export type CreateProductPayload = z.infer<typeof CreateProductSchema>;

export const UpdateProductVariantSchema = z.object({
  id: z.string().uuid().optional(), // To identify existing variants
  price: z.number().positive('El precio debe ser un número positivo.').optional(),
  stock: z.number().int().min(0, 'El stock no puede ser negativo.').optional(),
  attributes: z.record(z.string(), { description: 'Atributos como color o talla' }).optional(),
  images: z.array(ProductImageSchema).optional(),
});

export const UpdateProductSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.').optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  variants: z.array(UpdateProductVariantSchema).optional(),
});

export type UpdateProductPayload = z.infer<typeof UpdateProductSchema>;

export const CreateBaseProductSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateBaseProductPayload = z.infer<typeof CreateBaseProductSchema>;
