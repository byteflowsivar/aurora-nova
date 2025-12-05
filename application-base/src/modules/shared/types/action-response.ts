/**
 * Módulo de Tipos para Server Actions - Aurora Nova
 *
 * Define tipos y helpers para respuestas de Server Actions (Next.js 13+).
 * Proporciona un patrón consistente para manejar éxito y error en acciones.
 *
 * **Características**:
 * - Discriminated unions para type-safe pattern matching
 * - Type guards (helpers) para validar tipo de respuesta
 * - Soporte para errores de validación por campo
 * - Mensajes personalizados opcionales
 * - Genéricos para flexibilidad en tipos de datos
 *
 * **Tipos Incluidos**:
 * 1. **ActionSuccess<T>** - Respuesta exitosa con datos genéricos
 * 2. **ActionError** - Respuesta de error con validaciones por campo
 * 3. **ActionResponse<T>** - Union discriminada (éxito | error)
 * 4. **Helpers** - successResponse(), errorResponse(), isActionSuccess(), isActionError()
 *
 * **Patrón Típico**:
 * ```typescript
 * // En Server Action
 * async function registerUser(formData: FormData): Promise<ActionResponse<User>> {
 *   try {
 *     const data = registerSchema.parse(Object.fromEntries(formData))
 *     const user = await db.user.create({ data })
 *     return successResponse(user, 'Usuario registrado exitosamente')
 *   } catch (error) {
 *     if (error instanceof ZodError) {
 *       return errorResponse('Validación fallida', error.flatten().fieldErrors)
 *     }
 *     return errorResponse('Error interno del servidor')
 *   }
 * }
 *
 * // En cliente (React)
 * const response = await registerUser(new FormData(form))
 * if (isActionSuccess(response)) {
 *   console.log('Usuario:', response.data)
 * } else {
 *   console.error('Error:', response.error)
 *   if (response.fieldErrors) {
 *     // Mostrar errores por campo
 *   }
 * }
 * ```
 *
 * **Ventajas**:
 * - Type-safe: discriminated union previene acceso a propiedades incorrectas
 * - Validación de campo: errores de validación se muestran por campo
 * - Mensajes personalizados: permite feedback descriptivo al usuario
 * - Pattern matching: helpers tipo-guard facilitan código limpio
 * - Genéricos: reutilizable para cualquier tipo de dato
 *
 * @module shared/types/action-response
 * @see {@link ../../../../actions/auth.ts} para ejemplos de uso en Server Actions
 * @see {@link ../../validations/auth.ts} para validación con Zod (genera fieldErrors)
 */

/**
 * Respuesta exitosa de una Server Action
 *
 * Indica que la acción se completó correctamente.
 * Contiene los datos resultantes y un mensaje opcional.
 *
 * **Campos**:
 * - `success`: Siempre true (discriminador de union)
 * - `data`: Datos resultantes de la acción (genérico <T>)
 * - `message`: Mensaje descriptivo opcional para el usuario
 *
 * **Ejemplos de T (generic)**:
 * - `ActionSuccess<User>` - Retorna usuario creado
 * - `ActionSuccess<void>` - Acción sin datos de retorno (ej: logout)
 * - `ActionSuccess<{ sessionToken: string }>` - Datos personalizados
 *
 * **Tipo Discriminado**:
 * Usar `success === true` o helper `isActionSuccess()` para type narrowing.
 * Después de validar, TypeScript proporciona autocompletar solo para este tipo.
 *
 * @template T - Tipo genérico de los datos retornados
 * @example
 * ```typescript
 * const response: ActionSuccess<User> = {
 *   success: true,
 *   data: { id: '123', email: 'user@example.com', ... },
 *   message: 'Usuario creado exitosamente'
 * }
 *
 * if (response.success === true) {
 *   console.log(response.data) // ✓ TypeScript sabe que data existe
 *   console.log(response.error) // ✗ Error de compilación
 * }
 * ```
 *
 * @see {@link ActionError} para respuesta de error
 * @see {@link ActionResponse} para union
 * @see {@link successResponse} helper para crear esta respuesta
 * @see {@link isActionSuccess} type guard
 */
export type ActionSuccess<T = void> = {
  success: true
  data: T
  message?: string
}

/**
 * Respuesta de error de una Server Action
 *
 * Indica que la acción falló.
 * Contiene mensaje de error y validaciones por campo (si aplica).
 *
 * **Campos**:
 * - `success`: Siempre false (discriminador de union)
 * - `error`: Mensaje de error general
 * - `fieldErrors`: Errores específicos por campo (para validación)
 *
 * **Estructura de fieldErrors**:
 * ```typescript
 * {
 *   "email": ["El email es requerido", "Email inválido"],
 *   "password": ["La contraseña es muy corta"],
 *   "firstName": ["El nombre es requerido"]
 * }
 * ```
 *
 * **Casos de Uso**:
 * - Errores de validación (ZodError): pasar fieldErrors
 * - Errores de aplicación: mensaje general en error
 * - Errores de base de datos: mensaje general (no exponer detalles)
 * - Email ya existe: mensaje general (por seguridad)
 *
 * **Tipo Discriminado**:
 * Después de validar `success === false`, TypeScript permite acceso solo a error/fieldErrors.
 *
 * @example
 * ```typescript
 * // Desde ZodError
 * const response: ActionError = {
 *   success: false,
 *   error: 'Validación fallida',
 *   fieldErrors: zodError.flatten().fieldErrors
 * }
 *
 * // Desde error genérico
 * const response: ActionError = {
 *   success: false,
 *   error: 'Error al procesar la solicitud'
 * }
 * ```
 *
 * @see {@link ActionSuccess} para respuesta exitosa
 * @see {@link ActionResponse} para union
 * @see {@link errorResponse} helper para crear esta respuesta
 * @see {@link isActionError} type guard
 */
export type ActionError = {
  success: false
  error: string
  fieldErrors?: Record<string, string[]>
}

/**
 * Respuesta genérica de una Server Action (union discriminada)
 *
 * Union type que puede ser ActionSuccess<T> o ActionError.
 * Discriminado por el campo `success` (true | false).
 *
 * **Pattern Matching en Cliente**:
 * ```typescript
 * const response: ActionResponse<User> = await registerUser(data)
 *
 * if (response.success) {
 *   // TypeScript sabe que es ActionSuccess<User>
 *   const user = response.data
 *   console.log(user.email)
 * } else {
 *   // TypeScript sabe que es ActionError
 *   const errorMsg = response.error
 *   if (response.fieldErrors) { ... }
 * }
 * ```
 *
 * **Generics**:
 * - `ActionResponse` (sin tipo): default = void (para acciones sin retorno)
 * - `ActionResponse<T>`: retorna datos de tipo T
 *
 * **Ventajas sobre Promise<T | Error>**:
 * - No lanza excepciones (mejor control en UI)
 * - Errores de validación separados por campo
 * - Type-safe: no posible acceder a `.data` si es error
 * - Consistency: patrón uniforme en toda la aplicación
 *
 * @template T - Tipo de datos si success=true
 * @example
 * ```typescript
 * async function myAction(data: Data): Promise<ActionResponse<Result>> {
 *   // Implementation
 * }
 *
 * // Uso
 * const response = await myAction(data)
 * if (response.success) {
 *   // response.data es Result
 * } else {
 *   // response.error y response.fieldErrors
 * }
 * ```
 *
 * @see {@link ActionSuccess}
 * @see {@link ActionError}
 * @see {@link isActionSuccess} para type guard sin if
 * @see {@link isActionError} para type guard sin if
 */
export type ActionResponse<T = void> = ActionSuccess<T> | ActionError

/**
 * Helper para crear respuesta exitosa
 *
 * Función factory que crea un objeto ActionSuccess<T> con estructura correcta.
 * Más conveniente que crear el objeto manualmente.
 *
 * **Parámetros**:
 * - `data`: Los datos a retornar (genérico T)
 * - `message`: Mensaje opcional para mostrar al usuario
 *
 * **Retorna**: ActionSuccess<T> completamente tipado
 *
 * **Ventajas**:
 * - Evita escribir { success: true, data, ... }
 * - Type inference automático para T
 * - Consistency en toda la aplicación
 *
 * @template T - Tipo de los datos
 * @param {T} data - Datos a retornar
 * @param {string} [message] - Mensaje opcional
 * @returns {ActionSuccess<T>} Respuesta exitosa formateada
 *
 * @example
 * ```typescript
 * // Forma manual (verbose)
 * return { success: true, data: user, message: 'Usuario creado' }
 *
 * // Con helper (recomendado)
 * return successResponse(user, 'Usuario creado')
 *
 * // Sin mensaje
 * return successResponse(result)
 *
 * // Con void
 * return successResponse(undefined, 'Operación completada')
 * ```
 *
 * @see {@link errorResponse} helper complementario
 * @see {@link ActionSuccess} tipo que retorna
 */
export function successResponse<T>(data: T, message?: string): ActionSuccess<T> {
  return {
    success: true,
    data,
    message,
  }
}

/**
 * Helper para crear respuesta de error
 *
 * Función factory que crea un objeto ActionError con estructura correcta.
 * Más conveniente que crear el objeto manualmente.
 *
 * **Parámetros**:
 * - `error`: Mensaje de error general
 * - `fieldErrors`: Errores específicos por campo (opcional, para validación)
 *
 * **Retorna**: ActionError completamente tipado
 *
 * **Casos de Uso**:
 * - Error de validación: pasar fieldErrors de ZodError
 * - Error genérico: solo mensaje de error
 * - Error de BD: mensaje seguro sin detalles
 *
 * **Ejemplo con ZodError**:
 * ```typescript
 * try {
 *   const data = schema.parse(input)
 * } catch (error) {
 *   if (error instanceof ZodError) {
 *     return errorResponse('Validación fallida', error.flatten().fieldErrors)
 *   }
 * }
 * ```
 *
 * @param {string} error - Mensaje de error
 * @param {Record<string, string[]>} [fieldErrors] - Errores por campo
 * @returns {ActionError} Respuesta de error formateada
 *
 * @see {@link successResponse} helper complementario
 * @see {@link ActionError} tipo que retorna
 */
export function errorResponse(error: string, fieldErrors?: Record<string, string[]>): ActionError {
  return {
    success: false,
    error,
    fieldErrors,
  }
}

/**
 * Type Guard para validar respuesta exitosa
 *
 * Función type guard que valida si una ActionResponse es de tipo ActionSuccess<T>.
 * Proporciona type narrowing automático en TypeScript.
 *
 * **Uso**:
 * Reemplaza `if (response.success === true)` con un patrón más limpio.
 *
 * **Type Narrowing**:
 * Después de esta validación, TypeScript infiere que response es ActionSuccess<T>,
 * permitiendo acceso a `response.data` sin casteo.
 *
 * **Ventajas sobre `response.success === true`**:
 * - Más legible: `isActionSuccess(response)`
 * - Reutilizable: se define una sola vez
 * - Consistency: patrón uniforme en toda la app
 * - Naming: claramente expresa intención
 *
 * @template T - Tipo de datos si la respuesta es exitosa
 * @param {ActionResponse<T>} response - Respuesta a validar
 * @returns {boolean} true si response.success === true
 *
 * @example
 * ```typescript
 * const response = await myAction(data)
 *
 * // Forma clásica (todavía válida)
 * if (response.success === true) {
 *   console.log(response.data)
 * }
 *
 * // Forma con helper (recomendada)
 * if (isActionSuccess(response)) {
 *   console.log(response.data) // TypeScript sabe que .data existe
 * }
 *
 * // Con else para error
 * if (isActionSuccess(response)) {
 *   doSomething(response.data)
 * } else {
 *   handleError(response.error)
 * }
 * ```
 *
 * @see {@link isActionError} para validar error
 * @see {@link ActionSuccess}
 * @see {@link ActionResponse}
 */
export function isActionSuccess<T>(response: ActionResponse<T>): response is ActionSuccess<T> {
  return response.success === true
}

/**
 * Type Guard para validar respuesta de error
 *
 * Función type guard que valida si una ActionResponse es de tipo ActionError.
 * Proporciona type narrowing automático en TypeScript.
 *
 * **Uso**:
 * Reemplaza `if (response.success === false)` con un patrón más legible.
 *
 * **Type Narrowing**:
 * Después de esta validación, TypeScript infiere que response es ActionError,
 * permitiendo acceso a `response.error` y `response.fieldErrors`.
 *
 * **Complemento a isActionSuccess**:
 * Típicamente se usa en el bloque else de isActionSuccess.
 *
 * @template T - Tipo genérico (no usado, pero mantiene consistencia de firma)
 * @param {ActionResponse<T>} response - Respuesta a validar
 * @returns {boolean} true si response.success === false
 *
 * @example
 * ```typescript
 * const response = await myAction(data)
 *
 * // Con isActionSuccess
 * if (isActionSuccess(response)) {
 *   console.log(response.data)
 * } else if (isActionError(response)) {
 *   // response ahora es ActionError
 *   if (response.fieldErrors) {
 *     // Mostrar errores por campo
 *   } else {
 *     // Mostrar error general
 *     console.error(response.error)
 *   }
 * }
 *
 * // O simplemente en else (sin isActionError porque solo hay 2 opciones)
 * if (isActionSuccess(response)) {
 *   console.log(response.data)
 * } else {
 *   console.error(response.error) // TypeScript sabe que es ActionError
 * }
 * ```
 *
 * @see {@link isActionSuccess} para validar éxito
 * @see {@link ActionError}
 * @see {@link ActionResponse}
 */
export function isActionError<T>(response: ActionResponse<T>): response is ActionError {
  return response.success === false
}
