/**
 * Validaciones Zod para Perfil de Usuario
 */

import { z } from 'zod';

/**
 * Schema para actualización de perfil
 * Permite actualizar nombre, apellido e imagen
 */
export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(255, 'El nombre es demasiado largo')
    .optional(),
  lastName: z
    .string()
    .min(1, 'El apellido es requerido')
    .max(255, 'El apellido es demasiado largo')
    .optional(),
  image: z
    .string()
    .url('Debe ser una URL válida')
    .optional()
    .nullable(),
});

export type UpdateProfileData = z.infer<typeof updateProfileSchema>;

/**
 * Schema para cambio de contraseña
 * Incluye validaciones de seguridad estrictas
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
      .regex(/[a-z]/, 'Debe contener al menos una letra minúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número')
      .regex(
        /[^A-Za-z0-9]/,
        'Debe contener al menos un carácter especial (!@#$%^&*)'
      ),
    confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['newPassword'],
  });

export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
