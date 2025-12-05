"use client"

/**
 * Componente LogoutButton (Container)
 *
 * Botón para cerrar sesión del usuario autenticado.
 * Llama a server action para invalidar sesión en BD y redirige a login.
 *
 * Este componente es responsable de:
 * - Proporcionar interfaz para cierre de sesión
 * - Llamar a server action `logoutUser()`
 * - Mostrar estado de loading durante el proceso
 * - Redirigir a página de login tras logout exitoso
 * - Manejar errores durante el cierre de sesión
 *
 * **Características**:
 * - Botón con ícono SVG
 * - Loading state con spinner durante logout
 * - Estados deshabilitado durante procesamiento
 * - Mensaje de error tipo alert si falla
 * - Integración con server action (invalidación en BD)
 * - Redirección segura a /admin/auth/signin
 *
 * @component
 * @returns {JSX.Element} Botón de logout con estilos Tailwind
 *
 * **Props**: Ninguno (sin props requeridas)
 *
 * **Estados Internos**:
 * - `isLoading`: Boolean indicando si está procesando logout
 *
 * **Flujo**:
 * 1. Usuario hace clic en el botón
 * 2. setIsLoading(true) deshabilita botón y muestra spinner
 * 3. Llama await logoutUser() server action
 * 4. Si exitoso: router.push a /admin/auth/signin
 * 5. Si error: muestra alert con mensaje de error
 * 6. setIsLoading(false) restaura estado del botón
 *
 * **Seguridad**:
 * - Server action `logoutUser()` invalida sesión en BD
 * - JWT se invalida en BD (no solo en cliente)
 * - Redirección a signin fuerza nuevo login
 * - router.refresh() sincroniza estado del servidor
 * - Manejo de errores sin exponer información sensible
 *
 * **Estilos**:
 * - Color: Blue-600 (hover: Blue-700)
 * - Disabled: Gray-400
 * - Focus ring de 2px en Blue-500
 * - Padding: px-4 py-2
 * - Icono + texto alineados horizontalmente
 *
 * **Casos de Uso**:
 * - Botón en header/navbar del admin
 * - Botón en dropdown menu del usuario (AppSidebar)
 * - Botón en página de configuración/perfil
 *
 * **Notas**:
 * - Usa <button> nativo HTML (no shadcn Button)
 * - SVG inline para ícono (no lucide-react aquí)
 * - Spinner animado durante loading
 * - Para componentes reutilizables, prefer Button de shadcn
 *
 * @example
 * ```tsx
 * // En navbar o dropdown
 * import { LogoutButton } from '@/modules/admin/components/containers/logout-button-container'
 *
 * export function AdminHeader() {
 *   return (
 *     <header>
 *       <nav>
 *         <LogoutButton />
 *       </nav>
 *     </header>
 *   )
 * }
 * ```
 *
 * @see {@link logoutUser} para la server action de logout
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { logoutUser } from "@/actions/auth"

export function LogoutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)

    try {
      const result = await logoutUser()

      if (result.success) {
        // Redirigir al login administrativo después del logout
        router.push("/admin/auth/signin")
        router.refresh()
      } else {
        console.error("Error al cerrar sesión:", result.error)
        alert("Error al cerrar sesión. Por favor intenta de nuevo.")
      }
    } catch (error) {
      console.error("Error inesperado al cerrar sesión:", error)
      alert("Error inesperado al cerrar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        isLoading
          ? "cursor-not-allowed bg-gray-400"
          : "bg-blue-600 hover:bg-blue-700"
      }`}
    >
      {isLoading ? (
        <>
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Cerrando sesión...
        </>
      ) : (
        <>
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Cerrar sesión
        </>
      )}
    </button>
  )
}
