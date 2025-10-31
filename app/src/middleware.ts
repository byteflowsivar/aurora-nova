/**
 * Middleware de Next.js para Aurora Nova - Sistema Híbrido
 * Maneja autenticación, autorización y protección de rutas
 *
 * Sistema Híbrido de Validación:
 * - Validación JWT (rápida): Para todas las rutas protegidas
 * - Validación BD (estricta): Solo para rutas sensibles (opcional, configurable)
 *
 * La validación en BD asegura que sesiones manualmente invalidadas
 * no puedan acceder aunque tengan un JWT válido.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserPermissions } from '@/lib/auth-utils'
import { isSessionValid } from '@/lib/prisma/session-queries'

// Rutas que requieren autenticación
const protectedRoutes = [
  '/dashboard',
  '/admin',
  '/users',
  '/roles',
  '/settings',
]

// Rutas que requieren permisos específicos
const permissionRoutes: Record<string, string[]> = {
  '/admin': ['user:list', 'role:list'],
  '/users': ['user:list'],
  '/users/create': ['user:create'],
  '/users/edit': ['user:update'],
  '/roles': ['role:list'],
  '/roles/create': ['role:create'],
  '/roles/edit': ['role:update'],
}

// Rutas que requieren validación ESTRICTA en BD (además de JWT)
// Útil para rutas sensibles donde se debe verificar que la sesión no fue invalidada
// NOTA: Esto agrega una query a BD por request, usar solo donde sea necesario
const strictValidationRoutes = [
  '/admin',
  '/users',
  '/roles',
  '/settings/security',
  '/settings/password',
]

// Flag para habilitar validación estricta globalmente (para testing o seguridad máxima)
// Si es true, TODAS las rutas protegidas verificarán en BD
const ENABLE_STRICT_VALIDATION_GLOBALLY = false

// Rutas públicas (no requieren autenticación)
const publicRoutes = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/auth/reset-password',
  '/api/auth',
]

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir rutas de API de Auth.js
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Permitir rutas públicas
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Verificar si la ruta requiere autenticación
  const requiresAuth = protectedRoutes.some(route => pathname.startsWith(route))

  if (requiresAuth) {
    // 1. Obtener sesión (validación JWT)
    const session = await auth()

    // Redireccionar a login si no está autenticado (JWT inválido o expirado)
    if (!session?.user) {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }

    // 2. Validación ESTRICTA en BD (opcional, solo para rutas sensibles)
    const requiresStrictValidation =
      ENABLE_STRICT_VALIDATION_GLOBALLY ||
      strictValidationRoutes.some(route => pathname.startsWith(route))

    if (requiresStrictValidation) {
      const sessionToken = (session as any).sessionToken as string | undefined

      if (sessionToken) {
        try {
          // Verificar que la sesión existe en BD y no fue invalidada manualmente
          const isValid = await isSessionValid(sessionToken)

          if (!isValid) {
            // Sesión fue invalidada manualmente o expiró en BD
            // Redireccionar a login (el JWT puede seguir siendo válido, pero la sesión fue cerrada)
            const signInUrl = new URL('/auth/signin', request.url)
            signInUrl.searchParams.set('callbackUrl', pathname)
            signInUrl.searchParams.set('reason', 'session_invalidated')
            return NextResponse.redirect(signInUrl)
          }
        } catch (error) {
          // Si falla la verificación en BD, por seguridad rechazamos el acceso
          console.error('Error validating session in database:', error)
          const errorUrl = new URL('/auth/error', request.url)
          errorUrl.searchParams.set('error', 'session_validation_failed')
          return NextResponse.redirect(errorUrl)
        }
      }
    }

    // 3. Verificar permisos específicos (RBAC)
    const requiredPermissions = permissionRoutes[pathname]
    if (requiredPermissions && requiredPermissions.length > 0) {
      try {
        const userPermissions = await getUserPermissions(session.user.id)

        // Verificar si el usuario tiene al menos uno de los permisos requeridos
        const hasRequiredPermission = requiredPermissions.some(permission =>
          userPermissions.includes(permission)
        )

        if (!hasRequiredPermission) {
          // Redireccionar a página de error de permisos
          const errorUrl = new URL('/auth/error', request.url)
          errorUrl.searchParams.set('error', 'insufficient_permissions')
          return NextResponse.redirect(errorUrl)
        }
      } catch (error) {
        console.error('Error checking permissions in middleware:', error)
        // En caso de error, redireccionar a error
        const errorUrl = new URL('/auth/error', request.url)
        errorUrl.searchParams.set('error', 'permission_check_failed')
        return NextResponse.redirect(errorUrl)
      }
    }
  }

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
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}