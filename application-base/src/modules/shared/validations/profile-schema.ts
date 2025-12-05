/**
 * Módulo de Validaciones Zod para Perfil de Usuario - Aurora Nova
 *
 * Proporciona esquemas Zod para validación de perfiles de usuario:
 * - Actualización de datos personales (nombre, apellido, imagen)
 * - Cambio seguro de contraseña con validaciones cruzadas
 *
 * **Características**:
 * - Validación de URL para avatar
 * - Campos opcionales para actualizaciones parciales
 * - Validaciones cruzadas (refine) para contraseñas
 * - Mensajes de error en español
 * - Type inference con `z.infer<typeof schema>`
 *
 * **Esquemas**:
 * 1. **updateProfileSchema** - Actualizar nombre, apellido, avatar
 * 2. **changePasswordSchema** - Cambiar contraseña con validación cruzada
 *
 * **Ejemplo de Uso**:
 * ```typescript
 * // En form submit
 * try {
 *   const data = updateProfileSchema.parse(formData)
 *   await updateUserProfile(userId, data)
 * } catch (error) {
 *   if (error instanceof ZodError) {
 *     // error.fieldErrors contiene errores por campo
 *   }
 * }
 * ```
 *
 * @module shared/validations/profile-schema
 * @see {@link @/modules/shared/api/user-queries.ts} para funciones de BD
 * @see {@link @/modules/shared/types/profile.ts} para tipos de perfil
 */

import { z } from 'zod';

/**
 * Schema para validación de actualización de perfil
 *
 * Valida que los datos de actualización de perfil sean válidos.
 * Todos los campos son opcionales para soportar actualizaciones parciales.
 *
 * **Campos**:
 * - `firstName`: 1-255 caracteres (opcional)
 * - `lastName`: 1-255 caracteres (opcional)
 * - `image`: URL válida o null (opcional)
 *
 * **Validaciones**:
 * - firstName: string, min 1, max 255
 * - lastName: string, min 1, max 255
 * - image: URL válida con protocolo http/https o null
 *
 * **Ejemplo**:
 * ```typescript
 * // Actualizar solo nombre
 * const data = updateProfileSchema.parse({ firstName: 'Juan' })
 *
 * // Actualizar completo
 * const data = updateProfileSchema.parse({
 *   firstName: 'Juan',
 *   lastName: 'Pérez',
 *   image: 'https://example.com/avatar.jpg'
 * })
 *
 * // Quitar avatar
 * const data = updateProfileSchema.parse({ image: null })
 *
 * // Sin cambios
 * const data = updateProfileSchema.parse({})
 * ```
 *
 * **Type Inference**:
 * ```typescript
 * type UpdateProfileData = z.infer<typeof updateProfileSchema>
 * // Tipo automático: { firstName?: string; lastName?: string; image?: string | null }
 * ```
 *
 * @type {ZodType<{firstName?: string; lastName?: string; image?: string | null}>}
 * @see {@link UpdateProfileData} para tipo inferencial
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
 * Schema para cambio de contraseña con validaciones de seguridad estrictas
 *
 * Valida el cambio de contraseña mediante verificación en dos pasos:
 * 1. **Validaciones por campo**: Tipo, largo, complejidad
 * 2. **Validaciones cruzadas (refine)**: Coinscidencia y unicidad
 *
 * **Campos**:
 * - `currentPassword`: Contraseña actual (texto plano, se valida contra hash en BD)
 * - `newPassword`: Nueva contraseña con requisitos estrictos
 * - `confirmPassword`: Confirmación de nueva contraseña (debe coincidir)
 *
 * **Requisitos de Complejidad para newPassword**:
 * - **Largo**: Mínimo 8 caracteres
 * - **Mayúscula**: Al menos una letra mayúscula (A-Z)
 * - **Minúscula**: Al menos una letra minúscula (a-z)
 * - **Número**: Al menos un dígito (0-9)
 * - **Especial**: Al menos un carácter especial (!@#$%^&*)
 *
 * **Validaciones Cruzadas (refine)**:
 * 1. **Coincidencia**: `newPassword === confirmPassword`
 *    - Error en `confirmPassword` si no coinciden
 *    - Previene errores tipográficos del usuario
 *
 * 2. **Unicidad**: `currentPassword !== newPassword`
 *    - Error en `newPassword` si es igual a la actual
 *    - Força al usuario a cambiar realmente la contraseña
 *
 * **Patrón de Validación Cruzada**:
 * ```typescript
 * // Primero: validaciones por campo (types, length, format)
 * // Segundo: validaciones cruzadas (relationships, business logic)
 * z.object({...})
 *   .refine(rule1, { message: 'msg', path: ['field'] })
 *   .refine(rule2, { message: 'msg', path: ['field'] })
 * ```
 *
 * **Ejemplo - Caso Exitoso**:
 * ```typescript
 * const data = changePasswordSchema.parse({
 *   currentPassword: 'OldPassword123!',
 *   newPassword: 'NewPassword456!',
 *   confirmPassword: 'NewPassword456!'
 * })
 * // ✓ Validaciones pasan
 * // ✓ Complejidad OK: 8+ chars, mayús, minús, número, especial
 * // ✓ Coinciden: newPassword === confirmPassword
 * // ✓ Diferentes: currentPassword !== newPassword
 * ```
 *
 * **Ejemplo - Errores Posibles**:
 * ```typescript
 * // Error: Contraseña sin requisitos
 * changePasswordSchema.parse({
 *   currentPassword: 'OldPassword123!',
 *   newPassword: 'short',  // ❌ 5 caracteres
 *   confirmPassword: 'short'
 * })
 * // ZodError: \"La contraseña debe tener al menos 8 caracteres\"
 *
 * // Error: Sin mayúscula
 * changePasswordSchema.parse({
 *   currentPassword: 'OldPassword123!',
 *   newPassword: 'newpassword456!',  // ❌ Sin mayúscula
 *   confirmPassword: 'newpassword456!'
 * })
 * // ZodError: \"Debe contener al menos una letra mayúscula\"
 *
 * // Error: Sin número
 * changePasswordSchema.parse({
 *   currentPassword: 'OldPassword123!',
 *   newPassword: 'NewPassword!!!',  // ❌ Sin número
 *   confirmPassword: 'NewPassword!!!'
 * })
 * // ZodError: \"Debe contener al menos un número\"
 *
 * // Error: Sin carácter especial
 * changePasswordSchema.parse({
 *   currentPassword: 'OldPassword123!',
 *   newPassword: 'NewPassword456',  // ❌ Sin especial
 *   confirmPassword: 'NewPassword456'
 * })
 * // ZodError: \"Debe contener al menos un carácter especial (!@#$%^&*)\"
 *
 * // Error: Confirmación no coincide
 * changePasswordSchema.parse({
 *   currentPassword: 'OldPassword123!',
 *   newPassword: 'NewPassword456!',
 *   confirmPassword: 'NewPassword789!'  // ❌ Diferente
 * })
 * // ZodError: \"Las contraseñas no coinciden\" (path: confirmPassword)
 *
 * // Error: Nueva = Actual
 * changePasswordSchema.parse({
 *   currentPassword: 'Password123!',
 *   newPassword: 'Password123!',  // ❌ Misma contraseña
 *   confirmPassword: 'Password123!'
 * })
 * // ZodError: \"La nueva contraseña debe ser diferente a la actual\" (path: newPassword)
 * ```
 *
 * **Type Inference**:
 * ```typescript
 * type ChangePasswordData = z.infer<typeof changePasswordSchema>
 * // Tipo automático: {
 * //   currentPassword: string
 * //   newPassword: string
 * //   confirmPassword: string
 * // }
 * ```
 *
 * **Flujo de Cambio de Contraseña**:
 * ```typescript\n * // 1. Validar schema (cliente o servidor)\n * const data = changePasswordSchema.parse(formData)\n *\n * // 2. Pasar a changeUserPassword() que:\n * //    - Compara currentPassword contra hash en BD\n * //    - Genera nuevo hash de newPassword\n * //    - Transacción: actualiza password + revoca sesiones\n * const result = await changeUserPassword(userId, data.currentPassword, data.newPassword)\n * ```
 *
 * **Notas de Seguridad**:
 * - Validación en **cliente** (UX inmediata): Zod schema\n * - Validación en **servidor** (seguridad): Repetir validación + comparar contra bcrypt hash\n * - Cambio de contraseña revoca **TODAS las sesiones** (logout omnibus)\n * - La contraseña nueva se hashea con bcrypt (salt rounds: 10) antes de guardar\n * - Nunca almacenar contraseña en texto plano\n *
 * @type {ZodType<{currentPassword: string; newPassword: string; confirmPassword: string}>}
 * @see {@link ChangePasswordData} para tipo inferencial
 * @see {@link @/modules/shared/api/user-queries.ts#changeUserPassword} para implementación del cambio
 * @see {@link updateProfileSchema} para actualización de perfil (sin contraseña)
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
