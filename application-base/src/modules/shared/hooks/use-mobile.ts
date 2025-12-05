/**
 * Hook useIsMobile - Detección responsiva de dispositivos móviles
 *
 * Hook para detectar si el viewport actual es un dispositivo móvil basado en
 * el ancho de ventana. Utiliza window.matchMedia API para detectar cambios
 * en tiempo real cuando el usuario redimensiona la ventana o rota el dispositivo.
 *
 * **Punto de Quiebre**:
 * - Móvil: < 768px (Tailwind's 'md' breakpoint)
 * - Desktop: >= 768px
 *
 * @hook
 * @returns {boolean} true si el viewport es móvil (< 768px), false si es desktop
 *
 * **Comportamiento**:
 * 1. Al montar: comprueba el ancho actual de window.innerWidth
 * 2. Configura listener en window.matchMedia para detectar cambios de tamaño
 * 3. Actualiza estado automáticamente cuando el usuario redimensiona/rota
 * 4. Al desmontar: limpia el listener (memory leak prevention)
 * 5. Retorna boolean (true/false, nunca undefined después de montar)
 *
 * **Casos de Uso**:
 * - Renderización condicional de componentes (layout móvil vs desktop)
 * - Mostrar/ocultar navegación específica para móvil
 * - Adaptar UX basado en tamaño de pantalla
 * - Responsividad en runtime (no solo CSS media queries)
 *
 * **Ventajas**:
 * - Usa window.matchMedia (estándar del navegador, eficiente)
 * - Detecta cambios en tiempo real sin poll continuo
 * - Compatible con next/dynamic para lazy loading por dispositivo
 * - Alternativa a CSS media queries cuando necesitas lógica JS
 *
 * **Notas Importantes**:
 * - El hook retorna `undefined` durante SSR (server-side rendering)
 * - En Next.js con SSR, el valor cambia después del hydrate
 * - Usar `useEffect` en componentes padres para manejar cambios
 * - No usar directamente para condicionales críticos en rendering inicial
 *
 * **Performance**:
 * - Mínimo overhead: solo un listener por hook
 * - window.matchMedia es mucho más eficiente que resize events
 * - No hay polling, reacciona solo a cambios reales
 *
 * @example
 * ```tsx
 * function ResponsiveLayout() {
 *   const isMobile = useIsMobile()
 *
 *   return (
 *     <div>
 *       {isMobile ? (
 *         <MobileNavigation />
 *       ) : (
 *         <DesktopNavigation />
 *       )}
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Con dynamic import para lazy load
 * import dynamic from 'next/dynamic'
 * const MobileComponent = dynamic(() => import('./Mobile'))
 * const DesktopComponent = dynamic(() => import('./Desktop'))
 *
 * function MyComponent() {
 *   const isMobile = useIsMobile()
 *   return isMobile ? <MobileComponent /> : <DesktopComponent />
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Manejo seguro con useEffect
 * function SafeComponent() {
 *   const [mounted, setMounted] = React.useState(false)
 *   const isMobile = useIsMobile()
 *
 *   React.useEffect(() => {
 *     setMounted(true)
 *   }, [])
 *
 *   // No renderizar condicional móvil/desktop hasta que esté mounted
 *   if (!mounted) return <DefaultLayout />
 *
 *   return isMobile ? <MobileLayout /> : <DesktopLayout />
 * }
 * ```
 *
 * **SSR y Hydration**:
 * - En servidor: siempre false (no hay window)
 * - En cliente inicial: puede ser undefined brevemente
 * - Después de hydrate: valor real basado en viewport
 * - Para evitar hydration mismatch: usar useEffect para aplicar lógica móvil
 *
 * **Comparación con Media Queries**:
 * | Aspecto | useIsMobile | Media Query CSS |
 * |--------|-----------|-----------------|
 * | Lógica JS | ✅ Sí | ❌ No |
 * | Renderizado condicional | ✅ Sí | ❌ No |
 * | Cambios en runtime | ✅ Sí | ✅ Sí |
 * | Performance | ✅ Muy bueno | ✅ Óptimo |
 * | SSR friendly | ⚠️ Requiere cuidado | ✅ Sí |
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia} para documentación de matchMedia
 */

import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
