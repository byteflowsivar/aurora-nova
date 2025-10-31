/**
 * Esquemas de validación con Zod para autenticación
 * Aurora Nova - Módulo Auth
 */

import { z } from "zod"

// ============================================================================
// REGISTRO DE USUARIOS
// ============================================================================

export const registerSchema = z.object({
  email: z
    .string({
      required_error: "El email es requerido",
    })
    .min(1, "El email es requerido")
    .email("Debe ser un email válido")
    .toLowerCase()
    .trim(),

  password: z
    .string({
      required_error: "La contraseña es requerida",
    })
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100, "La contraseña no puede exceder 100 caracteres")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "La contraseña debe contener al menos una mayúscula, una minúscula y un número"
    ),

  confirmPassword: z
    .string({
      required_error: "Debes confirmar la contraseña",
    })
    .min(1, "Debes confirmar la contraseña"),

  firstName: z
    .string()
    .min(1, "El nombre es requerido")
    .max(255, "El nombre no puede exceder 255 caracteres")
    .trim(),

  lastName: z
    .string()
    .min(1, "El apellido es requerido")
    .max(255, "El apellido no puede exceder 255 caracteres")
    .trim(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

export type RegisterInput = z.infer<typeof registerSchema>

// ============================================================================
// LOGIN DE USUARIOS
// ============================================================================

export const loginSchema = z.object({
  email: z
    .string({
      required_error: "El email es requerido",
    })
    .min(1, "El email es requerido")
    .email("Debe ser un email válido")
    .toLowerCase()
    .trim(),

  password: z
    .string({
      required_error: "La contraseña es requerida",
    })
    .min(1, "La contraseña es requerida"),
})

export type LoginInput = z.infer<typeof loginSchema>

// ============================================================================
// RECUPERACIÓN DE CONTRASEÑA
// ============================================================================

export const forgotPasswordSchema = z.object({
  email: z
    .string({
      required_error: "El email es requerido",
    })
    .min(1, "El email es requerido")
    .email("Debe ser un email válido")
    .toLowerCase()
    .trim(),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token inválido"),

  password: z
    .string({
      required_error: "La contraseña es requerida",
    })
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100, "La contraseña no puede exceder 100 caracteres")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "La contraseña debe contener al menos una mayúscula, una minúscula y un número"
    ),

  confirmPassword: z
    .string({
      required_error: "Debes confirmar la contraseña",
    })
    .min(1, "Debes confirmar la contraseña"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// ============================================================================
// CAMBIO DE CONTRASEÑA (usuario autenticado)
// ============================================================================

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({
      required_error: "La contraseña actual es requerida",
    })
    .min(1, "La contraseña actual es requerida"),

  newPassword: z
    .string({
      required_error: "La nueva contraseña es requerida",
    })
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100, "La contraseña no puede exceder 100 caracteres")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "La contraseña debe contener al menos una mayúscula, una minúscula y un número"
    ),

  confirmPassword: z
    .string({
      required_error: "Debes confirmar la contraseña",
    })
    .min(1, "Debes confirmar la contraseña"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "La nueva contraseña debe ser diferente a la actual",
  path: ["newPassword"],
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

// ============================================================================
// ACTUALIZACIÓN DE PERFIL
// ============================================================================

export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, "El nombre es requerido")
    .max(255, "El nombre no puede exceder 255 caracteres")
    .trim()
    .optional(),

  lastName: z
    .string()
    .min(1, "El apellido es requerido")
    .max(255, "El apellido no puede exceder 255 caracteres")
    .trim()
    .optional(),

  image: z
    .string()
    .url("Debe ser una URL válida")
    .optional()
    .nullable(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
