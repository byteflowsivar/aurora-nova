/**
 * Re-exports de utilidades del módulo admin (Cliente)
 * Importa desde aquí en lugar de desde archivos individuales
 *
 * NOTA: Solo exportamos utilidades cliente-seguras. Las funciones del servidor
 * (como permission-utils) deben importarse directamente desde su archivo.
 */

export { getIcon } from './icon-mapper'
