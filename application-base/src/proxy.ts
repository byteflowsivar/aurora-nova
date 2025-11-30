/**
 * Proxy de Next.js para Aurora Nova
 * Maneja la protección de rutas basada en la autenticación.
 *
 * Este proxy verifica si el usuario tiene una sesión activa (JWT)
 * para las rutas protegidas. La autorización detallada (permisos) se debe
 * manejar a nivel de página o layout en Server Components.
 *
 * También agrega request ID tracking para correlación de logs.
 *
 * NOTA: En Next.js 16+, el proxy SIEMPRE usa Node.js runtime por defecto.
 * No es necesario (ni permitido) configurar 'export const runtime'.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import {
  getOrGenerateRequestId,
  addRequestIdToHeaders,
  REQUEST_ID_HEADER,
} from "@/lib/logger/request-id"

// ============================================================================
// CONFIGURACIÓN DE RUTAS
// ============================================================================

// Rutas públicas que no requieren autenticación
const publicRoutes = [
  "/",
  "/auth/signin",
  "/auth/signup",
  "/auth/error",
  "/auth/forgot-password",
  "/auth/reset-password",
]

// Rutas de la API de autenticación que deben ser accesibles
const authApiRoutes = ["/api/auth"]

// Prefijos de rutas que deben ser ignorados por el proxy
const ignoredPrefixes = ["/_next/static", "/_next/image", "/favicon.ico", "/public"]

// ============================================================================
// PROXY
// ============================================================================

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Generate or get request ID
  const requestId = getOrGenerateRequestId(request)

  // Add request ID to request headers for propagation
  const requestHeaders = addRequestIdToHeaders(request, requestId)

  // Ignorar archivos estáticos, de imágenes y rutas de la API de auth
  if (
    ignoredPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    authApiRoutes.some((route) => pathname.startsWith(route))
  ) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    response.headers.set(REQUEST_ID_HEADER, requestId)
    return response
  }

  // Permitir el acceso a rutas públicas
  const isPublicRoute = publicRoutes.some((route) => pathname === route)
  if (isPublicRoute) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    response.headers.set(REQUEST_ID_HEADER, requestId)
    return response
  }

  // Para todas las demás rutas, se requiere autenticación.
  const session = await auth()

  // Si no hay sesión (JWT inválido o expirado), redirigir a la página de login
  if (!session?.user) {
    const signInUrl = new URL("/auth/signin", request.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    const response = NextResponse.redirect(signInUrl)
    response.headers.set(REQUEST_ID_HEADER, requestId)
    return response
  }

  // Si hay sesión, permitir el acceso. La autorización granular se hará en la página.
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set(REQUEST_ID_HEADER, requestId)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}
