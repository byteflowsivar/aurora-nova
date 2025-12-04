/**
 * Página principal pública de Aurora Nova
 * Muestra pantalla de bienvenida con acceso a login administrativo
 */

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-8">
        {/* Logo / Nombre de la Aplicación */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-lg shadow-lg">
              <h1 className="text-5xl font-bold text-blue-600">Aurora Nova</h1>
            </div>
          </div>
          <p className="text-lg text-gray-600">Sistema de Gestión Integral</p>
        </div>

        {/* Botón de Login Administrativo */}
        <div className="pt-8">
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 px-8 py-6 text-lg">
            <Link href="/admin/auth/signin">
              Acceder al Sistema Administrativo
            </Link>
          </Button>
        </div>

        {/* Footer opcional */}
        <div className="pt-8 text-sm text-gray-500">
          <p>© 2025 Aurora Nova. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  )
}
