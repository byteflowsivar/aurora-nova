/**
 * Módulo de Utilidades Administrativas - Aurora Nova
 *
 * Centraliza funciones de utilidad para el módulo admin.
 * Importa desde este archivo en lugar de desde archivos individuales.
 *
 * **Nota**: Solo exportamos utilidades cliente-seguras en este índice.
 * Las funciones del servidor (como permission-utils) deben importarse
 * directamente desde su archivo individual para mayor claridad.
 *
 * **Disponibles**:
 *
 * **Renderizado de Iconos** (desde icon-mapper.ts):
 * - `getIcon(iconName)` - Resuelve nombres de iconos a componentes Lucide React
 *   - Maneja fallback automático a Circle
 *   - Type-safe para 450+ iconos
 *   - Usado en menú dinámico y UI componentes
 *
 * **Verificación de Permisos** (desde permission-utils.ts - importar directamente):
 * ```typescript
 * // Importar directamente (no desde este índice)
 * import {
 *   hasPermission,
 *   hasAllPermissions,
 *   checkPermission,
 *   checkAllPermissions
 * } from '@/modules/admin/utils/permission-utils'
 *
 * // Razón: permiso-utils tiene funciones server y client,
 * // mejor ser explícito sobre cuál se está usando
 * ```
 *
 * **Uso**:
 * ```typescript
 * // Iconos (seguro en cliente)
 * import { getIcon } from '@/modules/admin/utils'
 * const SettingsIcon = getIcon('Settings')
 *
 * // Permisos (importar directamente)
 * import { hasPermission, checkPermission } from '@/modules/admin/utils/permission-utils'
 * const canCreate = await hasPermission(userId, 'user:create')
 * ```
 *
 * **Arquitectura**:
 * - Patrón Star Export selectivo
 * - Solo exportar funciones "seguras" en índice
 * - Funciones que requieren decisión de server/client se importan directamente
 * - Facilita découbrimiento de funciones comunes
 *
 * **Por qué no exportar permission-utils aquí**:
 * - Tiene tanto funciones async (server) como sync (client)
 * - Fácil confundir cuál usar si está en el índice
 * - Import directo hace explícito si se necesita server o cliente
 * - Reduce confusion y errores de uso
 *
 * @module admin/utils
 * @see {@link ./icon-mapper.ts} para documentación de getIcon
 * @see {@link ./permission-utils.ts} para documentación de verificación de permisos
 */

export { getIcon } from './icon-mapper'
