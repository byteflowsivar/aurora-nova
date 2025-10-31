/**
 * Dashboard principal
 * Aurora Nova - Protected Route
 */

import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LogoutButton } from "@/components/auth/logout-button"

export const metadata: Metadata = {
  title: "Dashboard | Aurora Nova",
  description: "Panel de control de Aurora Nova",
}

export default async function DashboardPage() {
  // Verificar autenticación
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Dashboard
            </h1>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Card de bienvenida */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Bienvenido, {session.user.name || session.user.email}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Has iniciado sesión exitosamente en Aurora Nova
            </p>

            {/* Información del usuario */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{session.user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">ID de Usuario</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">
                    {session.user.id}
                  </dd>
                </div>
                {session.user.firstName && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {session.user.firstName} {session.user.lastName}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Email Verificado
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {session.user.emailVerified ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Verificado
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                        Pendiente
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Cards de estadísticas */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md bg-blue-500 p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Usuario Activo
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">Sesión Iniciada</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md bg-green-500 p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Autenticación
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">Segura</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md bg-purple-500 p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Estado
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">Protegido</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-8">
          <div className="overflow-hidden rounded-lg bg-blue-50 shadow">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-blue-900">
                Información de la Sesión
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Esta es una página protegida. Solo los usuarios autenticados pueden
                  acceder a ella.
                </p>
                <p className="mt-2">
                  El sistema de autenticación está implementado con Auth.js y utiliza
                  PostgreSQL 18+ para el almacenamiento de datos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
