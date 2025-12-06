/**
 * Módulo de Validación con Zod - Autenticación y Perfil
 *
 * Esquemas de validación en tiempo de ejecución para autenticación.
 * Usa Zod para validación type-safe con mensajes de error personalizados.
 *
 * **Características Principales**:
 * - Type-safe: cada schema genera un tipo TypeScript inferencial
 * - Validaciones personalizadas: regex, refine(), transformaciones
 * - Mensajes de error en español
 * - Sanitización: trim(), toLowerCase() automático
 * - Validaciones cruzadas: confirmPassword, contraseña actual vs nueva
 *
 * **Schemas Disponibles**:
 * 1. **registerSchema**: Registro de nuevo usuario
 *    - Email, contraseña (con confirmación), nombres
 *    - Contraseña: 8+ chars, mayúscula, minúscula, número
 * 2. **loginSchema**: Credenciales de login
 *    - Email, contraseña
 * 3. **forgotPasswordSchema**: Solicitud de reset
 *    - Solo email
 * 4. **resetPasswordSchema**: Reset con token
 *    - Token, contraseña (con confirmación)
 * 5. **changePasswordSchema**: Cambio de contraseña autenticado
 *    - Contraseña actual, nueva, confirmación
 *    - Validación: nueva ≠ actual
 * 6. **updateProfileSchema**: Actualizar perfil
 *    - Nombres (opcionales), foto (URL)
 *
 * **Patrones de Uso**:
 * ```typescript
 * // En server action
 * const result = registerSchema.safeParse(formData)
 * if (!result.success) return { error: result.error.flatten() }
 * const data: RegisterInput = result.data
 *
 * // En API route
 * const validated = await registerSchema.parseAsync(req.body)
 * ```
 *
 * **Validaciones Comunes**:
 * - Email: validEmail + toLowerCase + trim
 * - Nombres: 1-255 chars + trim
 * - Contraseña: min 8, regex de complejidad
 * - URLs: z.url() para validación
 * - Confirmación: refine() para comparación
 *
 * **Regexes Implementados**:
 * - Contraseña: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/`
 *   - AL MENOS: una mayúscula, una minúscula, un número
 *   - No requiere caracteres especiales (opcional)
 *   - Min 8 chars, max 100
 *
 * @module shared/validations/auth
 * @see {@link ../../types/auth.ts} para DTOs que validan estos schemas
 * @see {@link ../../../../actions/auth.ts} para Server Actions que usan estos schemas
 *
 * @example
 * ```typescript
 * import { registerSchema, type RegisterInput } from '@/modules/shared/validations/auth'
 *
 * // Validar datos de formulario
 * const result = registerSchema.safeParse({
 *   email: 'user@example.com',
 *   password: 'SecurePass123',
 *   confirmPassword: 'SecurePass123',
 *   firstName: 'John',
 *   lastName: 'Doe'
 * })
 *
 * if (result.success) {
 *   const user = await registerUser(result.data)
 * } else {
 *   // result.error.flatten() para formularios con errores por campo
 *   console.error(result.error.flatten().fieldErrors)
 * }
 * ```
 */

import { z } from "zod"

// ============================================================================
// REGISTRO DE USUARIOS
// ============================================================================

/**
 * Schema de validación para registro de nuevos usuarios
 *
 * Valida datos de un formulario de registro (signup).
 * Requiere confirmación de contraseña y validaciones de complejidad.
 *
 * **Campos**:
 * - `email`: Email único (validado, lowercased, trimmed)
 * - `password`: Contraseña con requisitos de complejidad
 * - `confirmPassword`: Confirmación (debe coincidir con password)
 * - `firstName`: Primer nombre (1-255 chars, trimmed)
 * - `lastName`: Apellido (1-255 chars, trimmed)
 *
 * **Validaciones de Contraseña**:
 * - Mínimo 8 caracteres
 * - Máximo 100 caracteres
 * - AL MENOS una mayúscula (A-Z)
 * - AL MENOS una minúscula (a-z)
 * - AL MENOS un número (0-9)
 * - NO requiere caracteres especiales (opcional)
 *
 * **Validación Cruzada**:
 * - `password` debe coincidir con `confirmPassword`
 * - Si no coinciden, error en el campo `confirmPassword`
 *
 * **Transformaciones**:
 * - email: toLowerCase() + trim()
 * - firstName, lastName: trim()
 *
 * **Casos de Uso**:
 * - Validar formulario de signup en cliente
 * - Validar payload en /api/auth/register o action registerUser()
 * - Generar tipos con `z.infer<typeof registerSchema>`
 *
 * @constant {ZodObject} registerSchema
 * @see {@link RegisterInput} tipo inferencial generado por este schema
 * @see {@link loginSchema} para validación de login
 *
 * @example
 * ```typescript
 * const result = registerSchema.safeParse(formData)
 * if (result.success) {
 *   const user = await createUser(result.data)
 * } else {
 *   const errors = result.error.flatten().fieldErrors
 *   // { email: ['error'], password: ['error'], ... }
 * }
 * ```
 */
export const registerSchema = z.object({
  email: z
    .string({ message: "El email es requerido" })
    .min(1, "El email es requerido")
    .email("Debe ser un email válido")
    .toLowerCase()
    .trim(),

  password: z
    .string({ message: "La contraseña es requerida" })
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100, "La contraseña no puede exceder 100 caracteres")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "La contraseña debe contener al menos una mayúscula, una minúscula y un número"
    ),

  confirmPassword: z
    .string({ message: "Debes confirmar la contraseña" })
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

/**
 * Tipo TypeScript inferencial del schema registerSchema
 *
 * Genera automáticamente un tipo TypeScript que refleja exactamente
 * la estructura y validaciones del schema registerSchema.
 *
 * **Campos Tipados**:
 * - email: string (email válido, lowercase)
 * - password: string (8-100 chars con complejidad)
 * - confirmPassword: string
 * - firstName: string (1-255 chars)
 * - lastName: string (1-255 chars)
 *
 * **Uso**:
 * ```typescript
 * // Cuando sabes que los datos ya están validados
 * const user: RegisterInput = validatedData
 *
 * // En funciones que requieren datos validados
 * async function createUser(data: RegisterInput) { ... }
 * ```
 *
 * @typedef {z.infer<typeof registerSchema>} RegisterInput
 * @see {@link registerSchema} el schema que genera este tipo
 */
export type RegisterInput = z.infer<typeof registerSchema>

// ============================================================================
// LOGIN DE USUARIOS
// ============================================================================

/**
 * Schema de validación para login de usuarios
 *
 * Valida credenciales en formulario de login.
 * Schema más simple: solo email y contraseña sin validaciones de complejidad
 * (porque el servidor valida contra el hash almacenado).
 *
 * **Campos**:
 * - `email`: Email del usuario (validado, lowercase, trimmed)
 * - `password`: Contraseña tal como está (será comparado con hash en servidor)
 *
 * **Validaciones**:
 * - email: válido como email, min 1 char
 * - password: min 1 char (no se valida complejidad aquí)
 *
 * **Transformaciones**:
 * - email: toLowerCase() + trim()
 *
 * **Notas**:
 * - No valida complejidad porque se compara contra hash en servidor
 * - No requiere confirmPassword (no es set/change, solo login)
 * - Ambos campos son obligatorios
 *
 * **Casos de Uso**:
 * - Validar formulario de login
 * - Validar credenciales en /api/auth/login
 *
 * @constant {ZodObject} loginSchema
 * @see {@link LoginInput} tipo inferencial
 *
 * @example
 * ```typescript
 * const result = loginSchema.safeParse({ email, password })
 * if (result.success) {
 *   const authenticated = await authenticateUser(result.data)
 * }
 * ```
 */
export const loginSchema = z.object({
  email: z
    .string({ message: "El email es requerido" })
    .min(1, "El email es requerido")
    .email("Debe ser un email válido")
    .toLowerCase()
    .trim(),

  password: z
    .string({ message: "La contraseña es requerida" })
    .min(1, "La contraseña es requerida"),
})

/**
 * Tipo TypeScript inferencial del schema loginSchema
 * @typedef {z.infer<typeof loginSchema>} LoginInput
 * @see {@link loginSchema}
 */
export type LoginInput = z.infer<typeof loginSchema>

// ============================================================================
// RECUPERACIÓN DE CONTRASEÑA
// ============================================================================

/**
 * Schema para solicitud de reset de contraseña
 *
 * Valida el email para enviar email de recuperación.
 * Solo requiere email (el servidor genera token y lo envía).
 *
 * **Campos**:
 * - `email`: Email del usuario registrado
 *
 * **Nota**: No valida si el email existe (por seguridad, no revelar usuarios)
 *
 * @constant {ZodObject} forgotPasswordSchema
 * @see {@link ForgotPasswordInput}
 * @see {@link resetPasswordSchema} para validar el reset una vez que tiene el token
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string({ message: "El email es requerido",
    })
    .min(1, "El email es requerido")
    .email("Debe ser un email válido")
    .toLowerCase()
    .trim(),
})

/**
 * Tipo TypeScript inferencial del schema forgotPasswordSchema
 * @typedef {z.infer<typeof forgotPasswordSchema>} ForgotPasswordInput
 */
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

/**
 * Schema para validar reset de contraseña con token
 *
 * Valida el token de reset + nueva contraseña (con confirmación).
 * Se usa después que el usuario hace click en el email de reset.
 *
 * **Campos**:
 * - `token`: Token de reset enviado por email (validado en servidor)
 * - `password`: Nueva contraseña (con requisitos de complejidad)
 * - `confirmPassword`: Confirmación de contraseña
 *
 * **Validación Cruzada**:
 * - password === confirmPassword
 *
 * **Flujo Típico**:
 * 1. Usuario solicita reset → forgotPasswordSchema
 * 2. Servidor envía email con token → token en URL
 * 3. Usuario ingresa nueva contraseña → resetPasswordSchema
 * 4. Servidor valida token y actualiza contraseña
 *
 * @constant {ZodObject} resetPasswordSchema
 * @see {@link ResetPasswordInput}
 * @see {@link forgotPasswordSchema} paso anterior
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token inválido"),

  password: z
    .string({ message: "La contraseña es requerida",
    })
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100, "La contraseña no puede exceder 100 caracteres")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "La contraseña debe contener al menos una mayúscula, una minúscula y un número"
    ),

  confirmPassword: z
    .string({ message: "Debes confirmar la contraseña",
    })
    .min(1, "Debes confirmar la contraseña"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

/**
 * Tipo TypeScript inferencial del schema resetPasswordSchema
 * @typedef {z.infer<typeof resetPasswordSchema>} ResetPasswordInput
 */
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// ============================================================================
// CAMBIO DE CONTRASEÑA (usuario autenticado)
// ============================================================================

/**
 * Schema para cambio de contraseña de usuario autenticado
 *
 * Valida cambio de contraseña para usuario ya logueado.
 * A diferencia de reset, requiere contraseña ACTUAL para verificación.
 *
 * **Campos**:
 * - `currentPassword`: Contraseña actual (para verificación)
 * - `newPassword`: Nueva contraseña (con requisitos de complejidad)
 * - `confirmPassword`: Confirmación de nueva contraseña
 *
 * **Validaciones Cruzadas**:
 * - newPassword === confirmPassword
 * - currentPassword !== newPassword (no reutilizar)
 *
 * **Flujo**:
 * 1. Usuario ingresa contraseña actual → verificar contra hash
 * 2. Usuario ingresa nueva contraseña → validar complejidad
 * 3. Usuario confirma nueva → debe coincidir
 * 4. Verificar que nueva ≠ actual
 * 5. Hash y actualizar en BD
 *
 * **Diferencia con resetPasswordSchema**:
 * - Reset: requiere token (sin contraseña actual)
 * - Change: requiere contraseña actual (sin token)
 *
 * @constant {ZodObject} changePasswordSchema
 * @see {@link ChangePasswordInput}
 * @see {@link resetPasswordSchema} para reset sin contraseña actual
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ message: "La contraseña actual es requerida",
    })
    .min(1, "La contraseña actual es requerida"),

  newPassword: z
    .string({ message: "La nueva contraseña es requerida",
    })
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100, "La contraseña no puede exceder 100 caracteres")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "La contraseña debe contener al menos una mayúscula, una minúscula y un número"
    ),

  confirmPassword: z
    .string({ message: "Debes confirmar la contraseña",
    })
    .min(1, "Debes confirmar la contraseña"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "La nueva contraseña debe ser diferente a la actual",
  path: ["newPassword"],
})

/**
 * Tipo TypeScript inferencial del schema changePasswordSchema
 * @typedef {z.infer<typeof changePasswordSchema>} ChangePasswordInput
 */
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

// ============================================================================
// ACTUALIZACIÓN DE PERFIL
// ============================================================================

/**
 * Schema para actualizar perfil de usuario
 *
 * Valida actualización de datos de perfil no-contraseña.
 * Todos los campos son opcionales (puede actualizar solo algunos).
 *
 * **Campos**:
 * - `firstName`: Nuevo primer nombre (1-255 chars, opcional)
 * - `lastName`: Nuevo apellido (1-255 chars, opcional)
 * - `image`: URL de foto de perfil (válida como URL, opcional, nullable)
 *
 * **Características**:
 * - Todos los campos son opcionales
 * - Campos que no se envían NO se modifican
 * - Image es nullable (se puede pasar null para borrar foto)
 * - Nombres se trimean automáticamente
 *
 * **Validaciones**:
 * - firstName: 1-255 chars si se proporciona
 * - lastName: 1-255 chars si se proporciona
 * - image: debe ser URL válida si se proporciona (no null string)
 *
 * **Casos de Uso**:
 * - Formulario de edición de perfil (actualizar solo algunos campos)
 * - API PATCH /api/customer/profile
 * - Usuario solo quiere cambiar foto (envía solo image)
 *
 * **Flujo Típico**:
 * ```typescript
 * // Usuario actualiza solo nombre
 * const result = updateProfileSchema.safeParse({
 *   firstName: 'Juan'
 *   // lastName y image omitidos = no se modifican
 * })
 *
 * // Actualizar foto a null (borrar)
 * const result = updateProfileSchema.safeParse({
 *   image: null
 * })
 * ```
 *
 * @constant {ZodObject} updateProfileSchema
 * @see {@link UpdateProfileInput}
 */
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

/**
 * Tipo TypeScript inferencial del schema updateProfileSchema
 *
 * Todos los campos son opcionales, reflejando que es un update parcial.
 *
 * @typedef {z.infer<typeof updateProfileSchema>} UpdateProfileInput
 * @see {@link updateProfileSchema}
 */
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
