/**
 * Middleware de Next.js para Aurora Nova
 * Maneja la protección de rutas basada en la autenticación.
 *
 * Este middleware verifica si el usuario tiene una sesión activa (JWT)
 * para las rutas protegidas. La autorización detallada (permisos) se debe
 * manejar a nivel de página o layout en Server Components.
 *
 * IMPORTANTE: Este middleware usa Node.js runtime (no Edge Runtime)
 * para poder acceder a Prisma y otras funcionalidades de Node.js.
 */

// Forzar uso de Node.js runtime en lugar de Edge Runtime
export const runtime = 'nodejs'

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

// ============================================================================
// CONFIGURACIÓN DE RUTAS
// ============================================================================

// Rutas públicas que no requieren autenticación
const publicRoutes = [
  "/",
  "/auth/signin",
  "/auth/signup",
  "/auth/error",
  "/auth/reset-password",
]

// Rutas de la API de autenticación que deben ser accesibles
const authApiRoutes = ["/api/auth"]

// Prefijos de rutas que deben ser ignorados por el middleware
const ignoredPrefixes = ["/_next/static", "/_next/image", "/favicon.ico", "/public"]

// ============================================================================
// MIDDLEWARE
// ============================================================================

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignorar archivos estáticos, de imágenes y rutas de la API de auth
  if (
    ignoredPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    authApiRoutes.some((route) => pathname.startsWith(route))
  ) {
    return NextResponse.next()
  }

  // Permitir el acceso a rutas públicas
  const isPublicRoute = publicRoutes.some((route) => pathname === route)
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Para todas las demás rutas, se requiere autenticación.
  const session = await auth()

  // Si no hay sesión (JWT inválido o expirado), redirigir a la página de login
  if (!session?.user) {
    const signInUrl = new URL("/auth/signin", request.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Si hay sesión, permitir el acceso. La autorización granular se hará en la página.
  return NextResponse.next()
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
