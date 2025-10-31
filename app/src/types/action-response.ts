/**
 * Tipos para respuestas de Server Actions
 * Aurora Nova - Tipos comunes
 */

/**
 * Respuesta exitosa de una acción
 */
export type ActionSuccess<T = void> = {
  success: true
  data: T
  message?: string
}

/**
 * Respuesta de error de una acción
 */
export type ActionError = {
  success: false
  error: string
  fieldErrors?: Record<string, string[]>
}

/**
 * Respuesta genérica de una acción (éxito o error)
 */
export type ActionResponse<T = void> = ActionSuccess<T> | ActionError

/**
 * Helper para crear respuesta exitosa
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
 */
export function errorResponse(error: string, fieldErrors?: Record<string, string[]>): ActionError {
  return {
    success: false,
    error,
    fieldErrors,
  }
}

/**
 * Helper para validar si una respuesta fue exitosa
 */
export function isActionSuccess<T>(response: ActionResponse<T>): response is ActionSuccess<T> {
  return response.success === true
}

/**
 * Helper para validar si una respuesta fue error
 */
export function isActionError<T>(response: ActionResponse<T>): response is ActionError {
  return response.success === false
}
