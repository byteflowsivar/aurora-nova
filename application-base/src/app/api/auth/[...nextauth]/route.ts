/**
 * NextAuth.js API Route Handlers - Manejador dinámico de todas las rutas de autenticación
 *
 * **Descripción**:
 * Este archivo es el punto de entrada dinámico para NextAuth.js que maneja TODAS las rutas
 * de autenticación bajo `/api/auth/*`. Es un patrón especial de Next.js usando catch-all routes.
 *
 * **Rutas Manejadas**:
 * - GET /api/auth/callback/:provider - Callback de OAuth (Google, GitHub, etc)
 * - GET /api/auth/signin - Mostrar página de login (si auth UI habilitado)
 * - GET /api/auth/signout - Mostrar página de logout
 * - GET /api/auth/session - Obtener sesión del usuario actual
 * - GET /api/auth/csrf - Token CSRF para formularios
 * - POST /api/auth/signin/:provider - Iniciar autenticación con proveedor
 * - POST /api/auth/signout - Cerrar sesión del usuario
 * - POST /api/auth/callback/:provider - Callback POST de OAuth
 * - Y otras rutas internas de NextAuth.js
 *
 * **Implementación**:
 * Este archivo es un wrapper que simplemente re-exporta GET y POST handlers de `@/lib/auth`.
 * La lógica real de autenticación está configurada en `/lib/auth` (NextAuth configuration).
 *
 * **Autenticación**: Depende de la ruta específica y configuración en `/lib/auth`
 * - Algunas rutas (signin, signout, session, csrf) públicas
 * - Rutas de callback requieren validación de proveedor OAuth
 * - Rutas protegidas en aplicación usan middleware
 *
 * **Respuestas**: Varias según ruta específica
 * - GET /api/auth/session: { user: {...}, expires: string } (200) o { } (401 si no autenticado)
 * - POST /api/auth/signin: Redirige a proveedor o página de login
 * - POST /api/auth/signout: Redirige a home, limpia sesión
 * - GET /api/auth/callback/*: Redirige a origen o error si validación falla
 * - GET /api/auth/csrf: { csrfToken: "..." } (200)
 *
 * **Casos de Uso**:
 * - Login con OAuth (Google, GitHub, etc)
 * - Obtener sesión actual del usuario
 * - Logout y limpieza de sesión
 * - Protección CSRF en formularios
 * - Callbacks internos de NextAuth.js
 *
 * **Configuración**:
 * Toda la configuración real está en `/lib/auth.ts`:
 * - Proveedores OAuth (Google, GitHub, etc)
 * - Callbacks de autorización y sesión
 * - Opciones de seguridad (CSRF, secure cookies, etc)
 * - JWT configuration
 * - Database adapter (Prisma)
 * - URL de callback base
 *
 * **Seguridad**:
 * - NextAuth.js maneja automáticamente validación de OAuth
 * - CSRF protection incluido automáticamente
 * - Secure cookies (httpOnly, secure, sameSite)
 * - Session tokens encriptados
 * - Validación de JWT
 * - Rate limiting puede configurarse
 *
 * **Important Notes**:
 * - Este es un patrón especial de Next.js: [...nextauth] es un catch-all route
 * - Aunque vacío aquí, es obligatorio que re-exporte GET/POST de la configuración
 * - No agregar lógica adicional aquí - modificar `/lib/auth.ts` en su lugar
 * - NextAuth.js maneja internamente todas las rutas bajo `/api/auth/`
 *
 * @see {@link /lib/auth.ts} para la configuración completa de NextAuth.js
 * @see {@link https://next-auth.js.org/} documentación oficial de NextAuth.js
 */

import { GET, POST } from "@/lib/auth"

export { GET, POST }