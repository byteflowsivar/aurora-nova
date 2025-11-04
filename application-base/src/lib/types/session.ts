/**
 * Tipos para gestión de sesiones - Sistema Híbrido JWT + Database
 * Aurora Nova
 *
 * Este archivo define los tipos para el sistema híbrido de sesiones que combina:
 * - JWT para autenticación rápida sin BD
 * - Database tracking para gestión y control manual de sesiones
 */

/**
 * Información completa de una sesión
 */
export interface SessionInfo {
  sessionToken: string
  userId: string
  expires: Date
  createdAt: Date
  ipAddress: string | null
  userAgent: string | null
}

/**
 * Datos para crear una nueva sesión
 */
export interface CreateSessionData {
  sessionToken: string  // JWT ID (jti)
  userId: string
  expires: Date
  ipAddress?: string
  userAgent?: string
}

/**
 * Información de sesión enriquecida para UI
 * Incluye detalles parseados del userAgent
 */
export interface SessionDetails extends SessionInfo {
  isCurrent: boolean        // Si es la sesión actual del usuario
  browser?: string          // Navegador parseado del userAgent
  os?: string              // Sistema operativo parseado
  device?: string          // Tipo de dispositivo (desktop, mobile, tablet)
}

/**
 * Opciones para listar sesiones
 */
export interface ListSessionsOptions {
  userId: string
  includeExpired?: boolean  // Por defecto false
  currentSessionToken?: string  // Para marcar cuál es la sesión actual
}

/**
 * Resultado de operaciones de sesión
 */
export interface SessionOperationResult {
  success: boolean
  message?: string
  error?: string
}
