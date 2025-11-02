/**
 * Utilidades de testing para Aurora Nova
 * Helpers comunes para tests unitarios e integración
 */

import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

/**
 * Wrapper personalizado para render de testing-library
 * Incluye providers necesarios (SessionProvider, etc.)
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // TODO: Agregar SessionProvider cuando sea necesario
  return render(ui, { ...options })
}

/**
 * Re-exportar utilidades de testing-library
 */
export * from '@testing-library/react'
export { renderWithProviders as render }
