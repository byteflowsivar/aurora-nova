/**
 * Utilidades para gestión de sesiones
 * Aurora Nova
 */

/**
 * Genera un ID único para una sesión
 * Compatible con el campo sessionToken de la tabla session
 */
export function generateSessionToken(): string {
  return crypto.randomUUID();
}

/**
 * Parse simple de User-Agent para extraer información básica
 * Para producción, considerar usar una librería como ua-parser-js
 *
 * @param userAgent - String del User-Agent
 * @returns Información parseada del navegador
 */
export function parseUserAgent(userAgent: string): {
  browser?: string
  os?: string
  device?: string
} {
  const ua = userAgent.toLowerCase()

  // Detectar navegador
  let browser: string | undefined
  if (ua.includes("firefox")) browser = "Firefox"
  else if (ua.includes("edg")) browser = "Edge"
  else if (ua.includes("chrome")) browser = "Chrome"
  else if (ua.includes("safari")) browser = "Safari"
  else if (ua.includes("opera")) browser = "Opera"

  // Detectar OS (orden importante: más específico primero)
  let os: string | undefined
  if (ua.includes("android")) os = "Android"
  else if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad"))
    os = "iOS"
  else if (ua.includes("windows")) os = "Windows"
  else if (ua.includes("mac")) os = "macOS"
  else if (ua.includes("linux")) os = "Linux"

  // Detectar tipo de dispositivo (orden importante: más específico primero)
  let device: string | undefined
  if (ua.includes("tablet") || ua.includes("ipad")) device = "Tablet"
  else if (ua.includes("mobile")) device = "Mobile"
  else device = "Desktop"

  return { browser, os, device }
}

/**
 * Calcula la fecha de expiración de una sesión
 *
 * @param maxAge - Duración en segundos (default: 30 días)
 * @returns Fecha de expiración
 */
export function getSessionExpiry(maxAge: number = 30 * 24 * 60 * 60): Date {
  const now = new Date()
  return new Date(now.getTime() + maxAge * 1000)
}
