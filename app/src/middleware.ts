/**
 * Middleware de Next.js para Aurora Nova
 * Maneja autenticación, autorización y protección de rutas
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserPermissions } from '@/lib/auth-utils'

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
    // Obtener sesión
    const session = await auth()

    // Redireccionar a login si no está autenticado
    if (!session?.user) {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }

    // Verificar permisos específicos
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