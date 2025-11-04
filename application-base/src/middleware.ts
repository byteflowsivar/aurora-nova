/**
 * Middleware de Next.js para Aurora Nova - Sistema Híbrido + RBAC
 * Maneja autenticación, autorización y protección de rutas
 *
 * Sistema Híbrido de Validación:
 * - Validación JWT (rápida): Para todas las rutas protegidas
 * - Validación BD (estricta): Solo para rutas sensibles (opcional, configurable)
 * - Verificación RBAC (permisos): Granular por ruta con lógica AND/OR
 *
 * La validación en BD asegura que sesiones manualmente invalidadas
 * no puedan acceder aunque tengan un JWT válido.
 *
 * NOTA SOBRE EDGE RUNTIME WARNINGS:
 * Este middleware usa Prisma y APIs de Node.js (crypto), lo que genera warnings
 * sobre Edge Runtime. Estos son solo advertencias y no afectan la funcionalidad.
 * El middleware funciona correctamente en producción. Next.js 15 no permite cambiar
 * el runtime de middleware a Node.js, por lo que estos warnings son esperados.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserPermissions } from '@/lib/prisma/permission-queries'
import { isSessionValid } from '@/lib/prisma/session-queries'

// ============================================================================
// CONFIGURACIÓN DE RUTAS
// ============================================================================

// Rutas que requieren autenticación
const protectedRoutes = [
  '/dashboard',
  '/admin',
  '/users',
  '/roles',
  '/permissions',
  '/settings',
]

/**
 * Configuración de permisos requeridos por ruta
 * Soporta lógica AND y OR para verificación de permisos
 */
interface RoutePermissionConfig {
  /** Array de permisos requeridos */
  permissions: string[]
  /**
   * Modo de verificación:
   * - 'any': Requiere AL MENOS UNO de los permisos (OR)
   * - 'all': Requiere TODOS los permisos (AND)
   * @default 'any'
   */
  mode?: 'any' | 'all'
}

/**
 * Mapa de rutas a configuración de permisos
 * Las rutas más específicas deben ir primero (se evalúan en orden)
 */
const permissionRoutes: Record<string, RoutePermissionConfig> = {
  // Rutas de usuarios - específicas primero
  '/users/create': {
    permissions: ['user:create'],
    mode: 'any',
  },
  '/users/[id]/edit': {
    permissions: ['user:update'],
    mode: 'any',
  },
  '/users/[id]/delete': {
    permissions: ['user:delete'],
    mode: 'any',
  },
  '/users': {
    permissions: ['user:list', 'user:read'],
    mode: 'any', // Puede listar O leer
  },

  // Rutas de roles - específicas primero
  '/roles/create': {
    permissions: ['role:create'],
    mode: 'any',
  },
  '/roles/[id]/edit': {
    permissions: ['role:update'],
    mode: 'any',
  },
  '/roles/[id]/permissions': {
    permissions: ['role:update', 'permission:manage'],
    mode: 'all', // Requiere AMBOS permisos
  },
  '/roles/[id]/delete': {
    permissions: ['role:delete'],
    mode: 'any',
  },
  '/roles': {
    permissions: ['role:list', 'role:read'],
    mode: 'any',
  },

  // Rutas de permisos
  '/permissions': {
    permissions: ['permission:list', 'permission:read'],
    mode: 'any',
  },

  // Rutas de administración
  '/admin/permissions': {
    permissions: ['permission:manage', 'system:admin'],
    mode: 'any', // Admin O gestor de permisos
  },
  '/admin/system': {
    permissions: ['system:admin', 'system:config'],
    mode: 'all', // Requiere AMBOS permisos
  },
  '/admin': {
    permissions: ['system:admin', 'user:manage', 'role:manage'],
    mode: 'any', // Cualquier permiso de gestión
  },

  // Rutas de configuración sensibles
  '/settings/security': {
    permissions: ['user:update'], // Puede cambiar su propia seguridad
    mode: 'any',
  },
  '/settings/password': {
    permissions: ['user:update'],
    mode: 'any',
  },
}

// Rutas que requieren validación ESTRICTA en BD (además de JWT)
// Útil para rutas sensibles donde se debe verificar que la sesión no fue invalidada
// NOTA: Esto agrega una query a BD por request, usar solo donde sea necesario
const strictValidationRoutes = [
  '/admin',
  '/users',
  '/roles',
  '/permissions',
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Encuentra la configuración de permisos que coincide con el pathname
 * Soporta rutas dinámicas con [id] y [...slug]
 *
 * @param pathname - Pathname actual del request
 * @param routes - Mapa de configuraciones de rutas
 * @returns Configuración de permisos o null
 */
function findMatchingRouteConfig(
  pathname: string,
  routes: Record<string, RoutePermissionConfig>
): RoutePermissionConfig | null {
  // 1. Buscar coincidencia exacta primero
  if (routes[pathname]) {
    return routes[pathname]
  }

  // 2. Buscar coincidencias con rutas dinámicas
  // Ordenar por especificidad (más segmentos = más específico)
  const routePatterns = Object.keys(routes).sort((a, b) => {
    const aSegments = a.split('/').length
    const bSegments = b.split('/').length
    return bSegments - aSegments
  })

  for (const pattern of routePatterns) {
    if (matchDynamicRoute(pathname, pattern)) {
      return routes[pattern]
    }
  }

  return null
}

/**
 * Verifica si un pathname coincide con un patrón de ruta dinámica
 * Soporta [param] y [...slug]
 *
 * @param pathname - Pathname actual
 * @param pattern - Patrón de ruta (ej: '/users/[id]/edit')
 * @returns true si coincide
 */
function matchDynamicRoute(pathname: string, pattern: string): boolean {
  const pathSegments = pathname.split('/').filter(Boolean)
  const patternSegments = pattern.split('/').filter(Boolean)

  // Si tienen diferente número de segmentos y no hay catch-all, no coincide
  if (pathSegments.length !== patternSegments.length) {
    // Excepto si hay catch-all
    const hasCatchAll = patternSegments.some(s => s.startsWith('[...'))
    if (!hasCatchAll) return false
  }

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i]
    const pathSegment = pathSegments[i]

    // Catch-all segment [...slug] coincide con resto de path
    if (patternSegment.startsWith('[...') && patternSegment.endsWith(']')) {
      return true
    }

    // Dynamic segment [id] coincide con cualquier valor
    if (patternSegment.startsWith('[') && patternSegment.endsWith(']')) {
      continue
    }

    // Segmento estático debe coincidir exactamente
    if (patternSegment !== pathSegment) {
      return false
    }
  }

  return true
}

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
      const sessionToken = (session as { sessionToken?: string }).sessionToken

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

    // 3. Verificar permisos específicos (RBAC) con lógica AND/OR
    const routeConfig = findMatchingRouteConfig(pathname, permissionRoutes)

    if (routeConfig && routeConfig.permissions.length > 0 && session.user.id) {
      try {
        const userPermissions = await getUserPermissions(session.user.id)
        const { permissions, mode = 'any' } = routeConfig

        let hasRequiredPermission: boolean

        if (mode === 'all') {
          // Modo AND: Requiere TODOS los permisos
          hasRequiredPermission = permissions.every(permission =>
            userPermissions.includes(permission)
          )
        } else {
          // Modo OR (default): Requiere AL MENOS UNO
          hasRequiredPermission = permissions.some(permission =>
            userPermissions.includes(permission)
          )
        }

        if (!hasRequiredPermission) {
          // Redireccionar a página de error de permisos
          const errorUrl = new URL('/auth/error', request.url)
          errorUrl.searchParams.set('error', 'insufficient_permissions')

          // Agregar información de permisos faltantes para debugging (solo en dev)
          if (process.env.NODE_ENV === 'development') {
            const missing = permissions.filter(p => !userPermissions.includes(p))
            errorUrl.searchParams.set('required', permissions.join(','))
            errorUrl.searchParams.set('missing', missing.join(','))
            errorUrl.searchParams.set('mode', mode)
          }

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