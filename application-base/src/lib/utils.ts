/**
 * Utilidades CSS para Aurora Nova
 *
 * Aurora Nova - CSS Class Merging Utility
 *
 * Proporciona función helper para combinar clases de Tailwind CSS
 * de forma segura, resolviendo conflictos automáticamente.
 *
 * **Propósito**:
 * - Combinación segura de clases Tailwind
 * - Resolución inteligente de conflictos (último valor gana)
 * - Uso en componentes dinámicos con clases condicionales
 *
 * **Librerías Utilizadas**:
 * - `clsx`: Combina clases de forma condicional
 * - `tailwind-merge`: Resuelve conflictos de Tailwind
 *
 * @module lib/utils
 * @see {@link https://github.com/dcastil/tailwind-merge} para tailwind-merge docs
 * @see {@link https://github.com/lukeed/clsx} para clsx docs
 *
 * @example
 * ```typescript
 * import { cn } from '@/lib/utils';
 *
 * // Combinar clases base con clases condicionales
 * const buttonClass = cn(
 *   'px-4 py-2 rounded',
 *   variant === 'primary' && 'bg-blue-600 text-white',
 *   variant === 'secondary' && 'bg-gray-200 text-black',
 *   isDisabled && 'opacity-50 cursor-not-allowed'
 * );
 * ```
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combinar clases CSS de forma segura (cn = class name)
 *
 * Fusiona múltiples clases y resuelve conflictos de Tailwind automáticamente.
 * Permite usar clases condicionales sin preocuparse por duplicados o conflictos.
 *
 * **Funcionamiento**:
 * 1. Recibe variadic arguments de clases
 * 2. Usa `clsx` para procesar condicionales
 * 3. Usa `tailwind-merge` para resolver conflictos Tailwind
 * 4. Retorna string único de clases
 *
 * @param inputs - Variadic arguments: strings, arrays, objetos, null, undefined
 *
 * @returns {string} String de clases CSS combinadas y sin conflictos
 *
 * @remarks
 * **Resolución de Conflictos**:
 * Cuando hay múltiples clases que afectan la misma propiedad,
 * tailwind-merge mantiene solo la última:
 *
 * ```typescript
 * cn('bg-blue-500', 'bg-red-500') // → 'bg-red-500'
 * cn('px-2 px-4', 'px-6')         // → 'px-6'
 * ```
 *
 * **Valores Nullables**:
 * Automáticamente ignora null, undefined, false:
 *
 * ```typescript
 * cn('text-center', isActive && 'font-bold') // Si isActive=false → solo 'text-center'
 * ```
 *
 * **Casos de Uso**:
 * - Componentes con variantes (primary/secondary/danger)
 * - Clases condicionales según props
 * - Componentes que heredan clases de parent
 * - Combinación de estilos base con overrides
 *
 * @example
 * ```typescript
 * import { cn } from '@/lib/utils';
 *
 * // Ejemplo 1: Botón con variantes
 * function Button({ variant, size, disabled, className }) {
 *   return (
 *     <button
 *       className={cn(
 *         // Estilos base
 *         'inline-flex items-center justify-center rounded-md font-medium transition-colors',
 *         // Variantes de color
 *         variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
 *         variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300',
 *         variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
 *         // Variantes de tamaño
 *         size === 'sm' && 'px-3 py-1.5 text-sm',
 *         size === 'md' && 'px-4 py-2 text-base',
 *         size === 'lg' && 'px-6 py-3 text-lg',
 *         // Estado deshabilitado
 *         disabled && 'opacity-50 cursor-not-allowed',
 *         // Clases custom desde prop (sobrescribe lo anterior)
 *         className
 *       )}
 *       disabled={disabled}
 *     >
 *       {children}
 *     </button>
 *   );
 * }
 *
 * // Uso
 * <Button variant="primary" size="md">Click me</Button>
 * ```
 *
 * ```typescript
 * // Ejemplo 2: Card con estilos condicionales
 * function Card({ isSelected, isHovered, children }) {
 *   return (
 *     <div
 *       className={cn(
 *         'rounded-lg border bg-white p-4',
 *         isSelected && 'border-blue-500 bg-blue-50',
 *         isHovered && 'shadow-lg border-gray-400'
 *       )}
 *     >
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 *
 * **Performance**:
 * - Computación ligera (string concatenation + merge)
 * - Seguro para renderizado frecuente
 * - No causa re-renders innecesarios
 *
 * @see {@link https://github.com/dcastil/tailwind-merge} Tailwind Merge Docs
 * @see {@link https://github.com/lukeed/clsx} Clsx Docs
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
