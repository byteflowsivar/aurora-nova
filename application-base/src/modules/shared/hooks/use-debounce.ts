/**
 * Hook useDebounce - Debounce de valores
 *
 * Hook genérico para debounce que retrasa la actualización de un valor
 * hasta que ha pasado el tiempo especificado sin cambios.
 * Útil para búsquedas, validaciones y operaciones costosas.
 *
 * @template T - Tipo genérico del valor
 * @param {T} value - Valor a debounce (puede ser string, número, objeto, etc)
 * @param {number} delay - Tiempo de espera en milisegundos antes de actualizar
 *
 * @returns {T} - Valor debounceado que se actualiza después del delay
 *
 * **Comportamiento**:
 * 1. Retorna el valor anterior mientras está dentro del delay
 * 2. Reinicia el temporizador cada vez que 'value' cambia
 * 3. Solo actualiza 'debouncedValue' cuando pasa el delay sin cambios
 * 4. Limpia el timeout si el componente se desmonta
 *
 * **Casos de Uso**:
 * - Búsqueda en tiempo real (esperar a que el usuario termine de escribir)
 * - Validación de formularios
 * - Llamadas API mientras se escribe
 * - Resize de ventana
 * - Operaciones costosas que se repiten frecuentemente
 *
 * **Ventajas**:
 * - Reduce llamadas a API/validaciones innecesarias
 * - Mejora performance al evitar re-renders frecuentes
 * - Genérico para cualquier tipo de valor
 * - Cleanup automático en desmonte
 *
 * @example
 * ```tsx
 * function SearchUsers() {
 *   const [searchTerm, setSearchTerm] = useState('')
 *   const debouncedSearchTerm = useDebounce(searchTerm, 500)
 *
 *   useEffect(() => {
 *     if (debouncedSearchTerm) {
 *       // Buscar solo después de 500ms sin escribir
 *       fetchUsers(debouncedSearchTerm)
 *     }
 *   }, [debouncedSearchTerm])
 *
 *   return (
 *     <input
 *       value={searchTerm}
 *       onChange={(e) => setSearchTerm(e.target.value)}
 *       placeholder="Buscar usuarios..."
 *     />
 *   )
 * }
 * ```
 *
 * **Performance**:
 * - Con delay=500ms: máximo 2 actualizaciones por segundo
 * - Con delay=1000ms: máximo 1 actualización por segundo
 * - Reduce carga de red y CPU significativamente
 *
 * **Notas**:
 * - El delay debe ser mayor a 0 (recomendado 300-500ms)
 * - Genérico: funciona con strings, números, objetos, arrays
 * - Limpia timeout automáticamente en cleanup
 * - Dependencias: [value, delay]
 */

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
