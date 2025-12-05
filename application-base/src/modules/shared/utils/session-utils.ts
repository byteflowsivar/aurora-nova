/**
 * Módulo de Utilidades para Gestión de Sesiones - Aurora Nova
 *
 * Proporciona funciones helper para la creación, validación y gestión de sesiones.
 * Integrado con el sistema de autenticación JWT + Database de Aurora Nova.
 *
 * **Funciones**:
 * 1. `generateSessionToken()` - Genera ID único para sesión (UUID v4)
 * 2. `parseUserAgent()` - Parsea User-Agent para detectar navegador, SO y dispositivo
 * 3. `getSessionExpiry()` - Calcula fecha de expiración (default: 30 días)
 *
 * **Casos de Uso**:
 * - Crear nueva sesión en login: POST /api/auth/[...nextauth]/route.ts
 * - Detectar cambios de dispositivo: comparar User-Agent parseado
 * - Manejar expiración de sesión: usar getSessionExpiry() en createSession()
 * - Análisis de sesiones activas: mostrar dispositivos en dashboard
 *
 * **Flujo de Integración**:
 * ```typescript
 * // 1. Usuario hace login
 * const { email, password } = await validateCredentials(...)
 *
 * // 2. Crear sesión
 * const token = generateSessionToken()  // UUID v4
 * const expiresAt = getSessionExpiry()  // 30 días desde ahora
 * const device = parseUserAgent(headers['user-agent'])
 *
 * // 3. Guardar en BD
 * await createSession({
 *   userId,
 *   sessionToken: token,
 *   expiresAt,
 *   userAgent: device.browser
 * })
 *
 * // 4. Retornar JWT con token como payload
 * ```
 *
 * @module shared/utils/session-utils
 * @see {@link @/modules/shared/api/session-queries.ts} para operaciones de BD
 * @see {@link @/lib/auth/auth.ts} para contexto de autenticación
 */

/**
 * Genera un ID único para una sesión usando UUID v4
 *
 * **Propósito**: Crear token de sesión criptográficamente seguro para identificación.
 *
 * **Características**:
 * - Usa `crypto.randomUUID()` (disponible en Node.js 15.7+)
 * - Compatible con campo `sessionToken` de tabla `session`
 * - Seguro contra collisions (probabilidad: 1 en 2^128)
 * - No requiere base de datos para generar
 *
 * **Flujo**:
 * ```
 * generateSessionToken()
 *   ↓ (crypto.randomUUID)
 * "550e8400-e29b-41d4-a716-446655440000"
 *   ↓ (Guardado en BD)
 * session.sessionToken
 * ```
 *
 * **Formato**:
 * - RFC 4122 UUID v4 (128 bits = 32 caracteres hex + 4 guiones)
 * - Ejemplos válidos:
 *   - "550e8400-e29b-41d4-a716-446655440000"
 *   - "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *
 * **Casos de Uso**:
 * - Session token en login (POST /api/auth/[...nextauth]/route.ts)
 * - Refresh token para renovar JWT
 * - ID único para rastreo de dispositivos
 *
 * **Seguridad**:
 * - UUID v4 es aleatorio (no secuencial)
 * - Imposible de adivinar (2^128 combinaciones)
 * - Seguro para usar en cookies y localStorage
 * - No contiene información sensible
 *
 * **Comparación con Alternativas**:
 * - nanoid: Más compacto (21 chars), pero menos estándar
 * - JWT: Para payload, no para tokens
 * - randomBytes: Requiere encoding adicional
 * - UUIDv4 (crypto.randomUUID): RECOMENDADO - estándar, nativo, seguro
 *
 * **Ejemplos**:
 * ```typescript
 * // Generar session token
 * const token = generateSessionToken()
 * // Output: "7a8c9e4f-2b1d-4f6c-9a3e-1c5d7b9f2a6e"
 *
 * // Usar en createSession
 * const session = await createSession({
 *   userId: user.id,
 *   sessionToken: generateSessionToken(),  // Nuevo UUID
 *   expiresAt: new Date()
 * })
 * ```
 *
 * @returns {string} UUID v4 en formato estándar RFC 4122 (36 caracteres)
 * @example
 * const token = generateSessionToken()
 * console.log(token) // "550e8400-e29b-41d4-a716-446655440000"
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/crypto/randomUUID para especificación
 * @see {@link createSession} en session-queries.ts para uso en BD
 */
export function generateSessionToken(): string {
  return crypto.randomUUID();
}

/**
 * Parsea User-Agent para extraer información de navegador, SO y dispositivo
 *
 * **Propósito**: Identificar el entorno del cliente para análisis y seguridad de sesiones.
 *
 * **Implementación**:
 * - Parse simple basado en string matching (case-insensitive)
 * - Orden de detección importante: más específico primero
 * - No requiere librerías externas
 *
 * **Navegadores Detectados**:
 * - Firefox: keyword "firefox"
 * - Edge: keyword "edg" (para Edge Chromium)
 * - Chrome: keyword "chrome"
 * - Safari: keyword "safari"
 * - Opera: keyword "opera"
 * - Otros: undefined
 *
 * **Sistemas Operativos Detectados**:
 * - Android: keyword "android"
 * - iOS: keywords "ios", "iphone", "ipad"
 * - Windows: keyword "windows"
 * - macOS: keyword "mac"
 * - Linux: keyword "linux"
 * - Otros: undefined
 *
 * **Tipos de Dispositivo Detectados**:
 * - Tablet: keywords "tablet", "ipad"
 * - Mobile: keyword "mobile"
 * - Desktop: default si no es tablet ni mobile
 *
 * **Orden de Prioridad**:
 * ```
 * Navegadores (más específico primero):
 * 1. Firefox
 * 2. Edge
 * 3. Chrome
 * 4. Safari
 * 5. Opera
 *
 * SO (más específico primero):
 * 1. Android
 * 2. iOS/iPhone/iPad
 * 3. Windows
 * 4. macOS
 * 5. Linux
 *
 * Dispositivo (más específico primero):
 * 1. Tablet/iPad
 * 2. Mobile
 * 3. Desktop (default)
 * ```
 *
 * **Limitaciones**:
 * - Parse simple: vulnerable a User-Agent spoofing
 * - No detecta navegadores oscuros (Tor Browser, etc.)
 * - Errores posibles en navegadores poco comunes
 * - Para producción crítica: usar ua-parser-js o similar
 *
 * **Casos de Uso**:
 * - Mostrar dispositivo en sesiones activas: "Chrome en Windows Desktop"
 * - Detectar cambios de dispositivo: comparar parseUserAgent(ua) anterior vs actual
 * - Análisis de acceso: estadísticas de navegadores/SO
 * - Seguridad: flagging acceso desde dispositivos sospechosos
 *
 * **Ejemplo - Flujo de Detección de Cambio de Dispositivo**:
 * ```typescript
 * // Session anterior
 * const oldSession = await getSession(sessionToken)
 * const oldDevice = parseUserAgent(oldSession.userAgent)
 * // { browser: 'Chrome', os: 'Windows', device: 'Desktop' }
 *
 * // Request actual
 * const newDevice = parseUserAgent(request.headers['user-agent'])
 * // { browser: 'Safari', os: 'iOS', device: 'Mobile' }
 *
 * // Detectar cambio
 * if (oldDevice.device !== newDevice.device) {
 *   // Enviar alerta de seguridad
 *   await sendSecurityAlert(user, 'Nuevo dispositivo detectado')
 * }
 * ```
 *
 * **User-Agent Ejemplos Reales**:
 * ```
 * Chrome Windows:
 * Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
 * ↓ Detecta: browser=Chrome, os=Windows, device=Desktop
 *
 * Safari iOS:
 * Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1
 * ↓ Detecta: browser=Safari, os=iOS, device=Mobile
 *
 * Firefox Android:
 * Mozilla/5.0 (Android; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0
 * ↓ Detecta: browser=Firefox, os=Android, device=Mobile
 *
 * iPad (Tablet):
 * Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1
 * ↓ Detecta: browser=Safari, os=iOS, device=Tablet
 * ```
 *
 * **Comparación con Librerías**:
 * ```
 * parseUserAgent (nativa):
 * ✓ Sin dependencias
 * ✓ Rápida
 * ✗ Limitada (browsers oscuros, casos edge)
 * ✗ Vulnerable a spoofing
 *
 * ua-parser-js (recomendada para producción):
 * ✓ Completa (100+ navegadores)
 * ✓ Precisa
 * ✓ Mantenida activamente
 * ✗ Dependencia adicional
 * ✗ Más lenta (pero negligible)
 * ```
 *
 * **Mejora Futura**:
 * ```typescript
 * // Migrar a ua-parser-js para producción
 * import { UAParser } from 'ua-parser-js'
 *
 * export function parseUserAgent(userAgent: string) {
 *   const parser = new UAParser(userAgent)
 *   const result = parser.getResult()
 *   return {
 *     browser: result.browser.name,
 *     os: result.os.name,
 *     device: result.device.type || 'Desktop'
 *   }
 * }
 * ```
 *
 * **Seguridad**:
 * - No usar para validación de seguridad crítica (es spoofable)
 * - No usar para autenticación
 * - Usar solo para UX (mostrar info al usuario)
 * - Para seguridad real: verificar IP, fingerprinting del navegador
 *
 * @param {string} userAgent - Header User-Agent del request (ej: req.headers['user-agent'])
 * @returns {{browser?: string; os?: string; device?: string}} Objeto con detectiones
 *   - browser: nombre del navegador detectado (Chrome, Firefox, Safari, Edge, Opera)
 *   - os: sistema operativo (Android, iOS, Windows, macOS, Linux)
 *   - device: tipo de dispositivo (Desktop, Mobile, Tablet)
 *
 * @example
 * // Chrome en Windows
 * const result = parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...')
 * // Retorna: { browser: 'Chrome', os: 'Windows', device: 'Desktop' }
 *
 * @example
 * // Safari en iPhone
 * const result = parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0...')
 * // Retorna: { browser: 'Safari', os: 'iOS', device: 'Mobile' }
 *
 * @example
 * // Firefox en Android
 * const result = parseUserAgent('Mozilla/5.0 (Android; Mobile; rv:120.0) Gecko/120.0...')
 * // Retorna: { browser: 'Firefox', os: 'Android', device: 'Mobile' }
 *
 * @see {@link getSessionExpiry} para expiración de sesión
 * @see {@link generateSessionToken} para generación de token
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent para User-Agent format
 * @see https://www.npmjs.com/package/ua-parser-js para librería alternativa más robusta
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
 * Calcula la fecha de expiración de una sesión en el futuro
 *
 * **Propósito**: Determinar cuándo una sesión debe expirar desde su creación.
 *
 * **Lógica**:
 * 1. Obtiene timestamp actual (now)
 * 2. Suma maxAge en milisegundos (convierte segundos → ms)
 * 3. Retorna nuevo objeto Date con timestamp futuro
 *
 * **Parámetro maxAge**:
 * - Default: 30 días = 30 * 24 * 60 * 60 = 2,592,000 segundos
 * - Unidad: segundos (no milisegundos)
 * - Rango típico: 1 día a 1 año
 *
 * **Conversión de Unidades**:
 * ```
 * maxAge (segundos) → milisegundos:
 * 1 segundo = 1,000 ms
 * 1 minuto = 60 segundos = 60,000 ms
 * 1 hora = 3,600 segundos = 3,600,000 ms
 * 1 día = 86,400 segundos = 86,400,000 ms
 * 30 días = 2,592,000 segundos = 2,592,000,000 ms
 *
 * En código:
 * maxAge * 1000 = convertir segundos a milisegundos
 * now.getTime() = obtener timestamp actual en ms
 * now.getTime() + (maxAge * 1000) = timestamp futuro
 * ```
 *
 * **Duración de Sesiones Típicas**:
 * ```
 * - Corta (1 hora): 3600 segundos → getSessionExpiry(3600)
 * - Mediana (7 días): 604800 segundos → getSessionExpiry(604800)
 * - Estándar (30 días): 2592000 segundos → getSessionExpiry()
 * - Larga (90 días): 7776000 segundos → getSessionExpiry(7776000)
 * - Muy larga (1 año): 31536000 segundos → getSessionExpiry(31536000)
 * ```
 *
 * **Flujo de Uso en createSession**:
 * ```typescript
 * // 1. Usuario hace login
 * const user = await validateCredentials(email, password)
 *
 * // 2. Crear sesión con expiración
 * const expiresAt = getSessionExpiry()  // 30 días desde ahora
 * // Ejemplo resultado: 2025-01-04 (si hoy es 2024-12-05)
 *
 * // 3. Crear token
 * const sessionToken = generateSessionToken()
 * // "550e8400-e29b-41d4-a716-446655440000"
 *
 * // 4. Guardar en BD
 * const session = await prisma.session.create({
 *   data: {
 *     sessionToken,
 *     userId: user.id,
 *     expiresAt,  // 2025-01-04T14:30:00Z
 *   }
 * })
 *
 * // 5. Generar JWT
 * const jwt = await generateToken({
 *   sessionToken,
 *   expiresAt
 * })
 * ```
 *
 * **Validación de Expiración**:
 * ```typescript
 * // En middleware: isSessionValid()
 * function isSessionValid(session: Session): boolean {
 *   const now = new Date()
 *   return session.expiresAt > now  // Comparar timestamps
 * }
 *
 * // Ejemplo:
 * const session = {
 *   expiresAt: new Date('2025-01-04T14:30:00Z'),
 *   // ...
 * }
 * const now = new Date('2025-01-05T10:00:00Z')
 * isSessionValid(session)  // false (expirada)
 * ```
 *
 * **Casos de Edge**:
 * ```typescript
 * // maxAge = 0 (expira inmediatamente)
 * const now = getSessionExpiry(0)
 * // Resultado: same as new Date() - actual
 * // Uso: para forzar logout
 *
 * // maxAge negativo (NO recomendado)
 * const past = getSessionExpiry(-3600)  // -1 hora
 * // Resultado: fecha en el pasado
 * // Uso: para revocación retroactiva (no hacer esto)
 *
 * // maxAge muy grande (1 año)
 * const year = getSessionExpiry(31536000)
 * // Resultado: fecha 1 año en el futuro
 * // Nota: aumenta riesgo de token theft
 * ```
 *
 * **Diferencia: Expiry vs Issued At**:
 * ```typescript
 * // Issued At: cuándo se creó la sesión
 * const issuedAt = new Date()  // Ahora
 *
 * // Expiry: cuándo vence la sesión
 * const expiresAt = getSessionExpiry()  // 30 días desde ahora
 *
 * // Duración: expiresAt - issuedAt
 * const duration = (expiresAt.getTime() - issuedAt.getTime()) / 1000  // segundos
 * ```
 *
 * **Seguridad**:
 * - Usar 30 días como default (buen balance entre seguridad y UX)
 * - Para operaciones sensibles: sessions cortas (1-24 horas)
 * - Para mobile apps: sessions más largas (7-30 días)
 * - Siempre validar expiración en middleware (no solo confiar en fecha)
 * - Implementar token refresh para sesiones largas
 *
 * **Performance**:
 * - O(1) - Solo aritmética, sin I/O
 * - Llamar múltiples veces es seguro (cada instancia es nueva)
 *
 * **Test Cases**:
 * ```typescript
 * describe('getSessionExpiry', () => {
 *   it('debería retornar fecha 30 días en el futuro por default', () => {
 *     const expiry = getSessionExpiry()
 *     const now = new Date()
 *     const diff = (expiry.getTime() - now.getTime()) / 1000
 *     expect(diff).toBeCloseTo(30 * 24 * 60 * 60, -2)  // -2 = ±100 segundos
 *   })
 *
 *   it('debería respetar maxAge en segundos', () => {
 *     const expiry = getSessionExpiry(3600)  // 1 hora
 *     const now = new Date()
 *     const diff = (expiry.getTime() - now.getTime()) / 1000
 *     expect(diff).toBeCloseTo(3600, -2)
 *   })
 *
 *   it('debería trabajar con maxAge = 0', () => {
 *     const expiry = getSessionExpiry(0)
 *     const now = new Date()
 *     expect(expiry.getTime()).toBeCloseTo(now.getTime(), -3)
 *   })
 * })
 * ```
 *
 * @param {number} [maxAge=2592000] - Duración en segundos (default: 30 días)
 *   - 3600: 1 hora
 *   - 86400: 1 día
 *   - 604800: 1 semana
 *   - 2592000: 30 días (default)
 *   - 7776000: 90 días
 *   - 31536000: 1 año
 *
 * @returns {Date} Fecha de expiración en el futuro
 *
 * @example
 * // Default: 30 días
 * const expiry = getSessionExpiry()
 * // Retorna: Date 30 días desde ahora
 *
 * @example
 * // Sesión de 1 hora
 * const expiry = getSessionExpiry(3600)
 * // Retorna: Date 1 hora desde ahora
 *
 * @example
 * // Sesión de 1 año
 * const expiry = getSessionExpiry(31536000)
 * // Retorna: Date 1 año desde ahora
 *
 * @see {@link generateSessionToken} para generar token único
 * @see {@link parseUserAgent} para información del dispositivo
 * @see {@link createSession} en session-queries.ts para uso en BD
 */
export function getSessionExpiry(maxAge: number = 30 * 24 * 60 * 60): Date {
  const now = new Date()
  return new Date(now.getTime() + maxAge * 1000)
}
