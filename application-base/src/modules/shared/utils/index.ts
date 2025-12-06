/**
 * Módulo de Utilidades Compartidas - Aurora Nova
 *
 * Centraliza todas las funciones de utilidad del módulo shared.
 * Importa desde este archivo en lugar de desde archivos individuales para mejor mantenibilidad.
 *
 * **Disponibles**:
 *
 * **Gestión de Sesiones** (desde session-utils.ts):
 * - `generateSessionToken()` - Genera UUID v4 para tokens de sesión
 * - `parseUserAgent(ua)` - Detecta navegador, SO y tipo de dispositivo
 * - `getSessionExpiry(maxAge)` - Calcula fecha de expiración (default: 30 días)
 *
 * **Uso**:
 * ```typescript
 * // Importar desde el índice
 * import { generateSessionToken, parseUserAgent, getSessionExpiry } from '@/modules/shared/utils'
 *
 * // Generar nueva sesión
 * const token = generateSessionToken()  // UUID v4
 * const device = parseUserAgent(headers['user-agent'])
 * const expiresAt = getSessionExpiry()  // 30 días desde ahora
 * ```
 *
 * **Arquitectura**:
 * - Patrón Star Export: `export * from './file'`
 * - Centraliza re-exports para fácil descubrimiento
 * - Facilita refactorización sin romper imports externos
 *
 * @module shared/utils
 * @see {@link ./session-utils.ts} para documentación de funciones de sesión
 * @see {@link @/modules/shared/api} para consultas de BD
 */

export * from './session-utils'
