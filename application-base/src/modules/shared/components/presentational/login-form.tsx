"use client"

/**
 * Formulario de inicio de sesión
 * Aurora Nova - Auth Module
 */

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { loginUser } from "@/actions/auth"
import type { LoginInput } from "@/modules/shared/validations"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [formData, setFormData] = useState<LoginInput>({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string>("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})
    setGlobalError("")

    try {
      const result = await loginUser(formData)

      if (result.success) {
        // Login exitoso, redirigir usando redirectUrl del servidor
        const redirectUrl = result.data?.redirectUrl || searchParams.get("callbackUrl") || "/admin/dashboard"
        router.push(redirectUrl)
        router.refresh()
      } else {
        // Mostrar errores
        if (result.fieldErrors) {
          setErrors(result.fieldErrors)
        }
        setGlobalError(result.error)
      }
    } catch (error) {
      console.error("Error en login:", error)
      setGlobalError("Error inesperado al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Limpiar errores del campo al escribir
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  return (
    <div className="mt-8 bg-white px-6 py-8 shadow sm:rounded-lg sm:px-10">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error global */}
        {globalError && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{globalError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Campo Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              className={`block w-full appearance-none rounded-md border px-3 py-2 placeholder-gray-400 shadow-sm focus:outline-none sm:text-sm ${
                errors.email
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
              placeholder="usuario@ejemplo.com"
            />
          </div>
          {errors.email && (
            <p className="mt-2 text-sm text-red-600">{errors.email[0]}</p>
          )}
        </div>

        {/* Campo Contraseña */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              className={`block w-full appearance-none rounded-md border px-3 py-2 placeholder-gray-400 shadow-sm focus:outline-none sm:text-sm ${
                errors.password
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
              placeholder="••••••••"
            />
          </div>
          {errors.password && (
            <p className="mt-2 text-sm text-red-600">{errors.password[0]}</p>
          )}
        </div>

        {/* Botón de submit */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className={`flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isLoading
                ? "cursor-not-allowed bg-blue-400"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center">
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
                Iniciando sesión...
              </span>
            ) : (
              "Iniciar sesión"
            )}
          </button>
        </div>
      </form>

      {/* Links adicionales */}
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">¿Necesitas ayuda?</span>
          </div>
        </div>

        <div className="mt-6 text-center text-sm">
          <a
            href="/admin/auth/forgot-password"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </div>
    </div>
  )
}
