/**
 * Configuración de Auth.js - Sistema Híbrido JWT + Database
 *
 * Aurora Nova - Autenticación Profesional de Aplicación
 *
 * Implementa un sistema híbrido de autenticación que combina dos estrategias:
 *
 * **1. JWT Strategy (Rápido)**:
 * - Token JWT con validez de 30 días
 * - Validación sin consultas a BD en cada request (mediante middleware)
 * - Ideal para rendimiento y escalabilidad
 *
 * **2. Database Session Tracking (Gestión)**:
 * - Registro en tabla `session` de cada sesión activa
 * - Información de IP y User-Agent para seguridad
 * - Permite invalidación manual, logout remoto, auditoría
 *
 * **Flujo Completo**:
 * ```
 * Login:
 *   1. Usuario ingresa email/contraseña en form
 *   2. Credentials Provider valida contra hash en BD
 *   3. Se crea JWT válido por 30 días
 *   4. Se crea registro en tabla session para tracking
 *   5. Se emite evento USER_LOGGED_IN para auditoría
 *
 * Request (Durante sesión):
 *   1. Middleware valida JWT (sin consulta a BD)
 *   2. Usuario obtiene info de permisos desde token
 *   3. Opcionalmente se verifica sesión en BD (si required)
 *
 * Logout:
 *   1. Usuario hace click en logout
 *   2. Se elimina registro de tabla session (invalida)
 *   3. Se emite evento USER_LOGGED_OUT para auditoría
 *
 * Gestión (Admin):
 *   1. Admin puede listar sesiones activas del usuario
 *   2. Admin puede invalidar sesiones de otros usuarios
 *   3. Todos los cambios se auditan
 * ```
 *
 * **Componentes**:
 * - {@link CredentialsProvider}: Valida email/password contra BD
 * - {@link callbacks.jwt}: Crea JWT y sesión en BD, emite eventos
 * - {@link callbacks.session}: Enriquece sesión con permisos
 * - {@link handlers.POST/GET}: Endpoints para `/api/auth/[...nextauth]`
 * - {@link signIn}: Server action para iniciar sesión
 * - {@link signOut}: Server action para cerrar sesión
 * - {@link auth}: Obtener sesión actual en Server Components
 *
 * **Características de Seguridad**:
 * - Contraseñas hasheadas con bcryptjs (rounds: 12)
 * - CSRF protection automática de Auth.js
 * - JWT con expiración de 30 días
 * - Tracking de IP y User-Agent para detección de anomalías
 * - Soporte para permissions en token
 *
 * **Extensiones Custom**:
 * - Sistema híbrido JWT + Base de Datos
 * - Integración con EventBus para auditoría
 * - Carga automática de permisos del usuario
 * - Evento USER_LOGGED_IN en cada login exitoso
 *
 * @module lib/auth
 * @see {@link auth-utils.ts} para funciones auxiliares de autenticación
 * @see {@link ../lib/auth-types.ts} para tipos extendidos (Session, User, etc)
 * @see {@link ../modules/shared/api/create-session.ts} para creación de sesiones
 * @see {@link ../lib/events/event-bus.ts} para sistema de eventos
 *
 * @example
 * ```typescript
 * // En Server Component
 * import { auth } from '@/lib/auth';
 *
 * export default async function DashboardLayout() {
 *   const session = await auth();
 *   if (!session) return redirect('/auth/signin');
 *
 *   return <div>Bienvenido {session.user.name}</div>;
 * }
 *
 * // En Server Action
 * import { signIn, signOut } from '@/lib/auth';
 *
 * export async function loginAction(email: string, password: string) {
 *   const result = await signIn('credentials', {
 *     email,
 *     password,
 *     redirect: false
 *   });
 *   return result;
 * }
 *
 * // En Middleware
 * import { auth } from '@/lib/auth';
 *
 * export const middleware = auth((req) => {
 *   if (!req.auth) {
 *     return Response.redirect(new URL('/auth/signin', req.url));
 *   }
 * });
 * ```
 *
 * @remarks
 * **Tipos Extendidos**:
 * Los tipos de Session y User están extendidos en `auth-types.ts` para incluir:
 * - `user.id`: ID único del usuario
 * - `user.permissions`: Array de permisos (ej: ['user:read', 'user:create'])
 * - `sessionToken`: Token de sesión para validaciones en BD
 *
 * **Performance**:
 * - JWT validation: ~1ms (sin consulta a BD)
 * - Database session check: ~5-10ms si es necesario
 * - Token refresh: Automático mediante callback jwt()
 *
 * **Seguridad**:
 * - Contraseña hasheada con bcryptjs (12 rounds)
 * - CSRF token verificado automáticamente
 * - JWT no contiene datos sensibles (solo IDs y permisos públicos)
 * - Sesiones invalidables desde logout o admin
 */

import NextAuth from "next-auth"

import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma/connection"
import { getUserByEmail, getUserWithCredentials } from "@/lib/prisma/queries"
import { createSession } from "@/modules/shared/api"
import { getUserPermissions } from "@/modules/admin/services"
import { generateSessionToken, getSessionExpiry } from "@/modules/shared/utils"
import bcrypt from "bcryptjs"
import logger from "@/lib/logger";
import { eventBus, SystemEvent } from "@/lib/events";
import { EventArea } from "@/lib/events/event-area";

// Configuración del adapter Prisma para Auth.js
const authAdapter = PrismaAdapter(prisma)

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut
} = NextAuth({
  adapter: authAdapter,
  session: {
    strategy: "jwt", // Requerido para usar credentials provider
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // Campos adicionales para el sistema híbrido (pasados desde server action)
        ipAddress: { label: "IP Address", type: "text" },
        userAgent: { label: "User Agent", type: "text" },
      },
      async authorize(credentials) {
        logger.info(`Authentication attempt for email: ${credentials?.email}`);
        if (!credentials?.email || !credentials?.password) {
          logger.warn('Authentication failed: Missing credentials');
          return null
        }

        try {
          // Buscar usuario por email
          const user = await getUserByEmail(credentials.email as string)

          if (!user) {
            logger.warn(`Authentication failed: User not found for email: ${credentials.email}`);
            return null
          }

          // Buscar credenciales del usuario
          const userWithCredentials = await getUserWithCredentials(user.id)

          if (!userWithCredentials?.credentials) {
            logger.error(`Authentication failed: Credentials not found for user: ${user.id}`);
            return null
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            userWithCredentials.credentials.hashedPassword
          )

          if (!isValidPassword) {
            logger.warn(`Authentication failed: Invalid password for user: ${user.id}`);
            return null
          }

          logger.info(`Authentication successful for user: ${user.id}`);
          // Cargar permisos del usuario
          const permissions = await getUserPermissions(user.id);

          // Retornar usuario en formato Auth.js + metadata para sistema híbrido
          return {
            id: user.id,
            email: user.email,
            name: user.name || `${user.firstName} ${user.lastName}`.trim(),
            image: user.image,
            emailVerified: user.emailVerified,
            firstName: user.firstName,
            lastName: user.lastName,
            permissions: permissions, // Add permissions here
            // Metadata para crear sesión en BD (se usa en callback JWT)
            ipAddress: credentials.ipAddress as string | undefined,
            userAgent: credentials.userAgent as string | undefined,
          }
        } catch (error) {
          logger.error(error, "Error during authentication:")
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Sistema Híbrido: En el primer login (cuando 'user' existe)
      if (user && user.id) {
        // 1. Generar sessionToken único para el sistema híbrido
        const sessionToken = generateSessionToken()

        // 2. Calcular fecha de expiración (30 días, igual que maxAge de JWT)
        const expires = getSessionExpiry(30 * 24 * 60 * 60)

        // 3. Crear registro en tabla session para tracking y gestión manual
        try {
          await createSession({
            sessionToken,
            userId: user.id,
            expires,
            ipAddress: user.ipAddress,
            userAgent: user.userAgent,
          })

          // Determinar el área basándose en los permisos del usuario
          // Si tiene permisos administrativos → ADMIN
          // Si no → SYSTEM (callback JWT es genérico)
          const isAdminUser = user.permissions && Array.isArray(user.permissions) && user.permissions.some(perm => {
            // Considerar admin si tiene permisos de usuario, rol, sistema o auditoría
            return perm.startsWith('user:') || perm.startsWith('role:') || perm.startsWith('system:') || perm.startsWith('audit:');
          });

          const loginArea = isAdminUser ? EventArea.ADMIN : EventArea.SYSTEM;

          // Dispatch login event
          await eventBus.dispatch(
            SystemEvent.USER_LOGGED_IN,
            {
              userId: user.id,
              email: user.email!,
              sessionId: sessionToken,
              ipAddress: user.ipAddress as string,
              userAgent: user.userAgent as string,
            },
            {
              userId: user.id,
              area: loginArea,
            }
          );

          // 4. Guardar sessionToken en el JWT para validaciones futuras
          token.sessionToken = sessionToken
        } catch {
          // Continuamos con el login aunque falle el tracking
          // El JWT seguirá funcionando, solo no habrá registro en BD
          // El error ya se loggea en createSession
        }

        // 5. Agregar datos del usuario al token JWT
        token.id = user.id
        token.email = user.email ?? undefined
        token.name = user.name ?? undefined
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.emailVerified = user.emailVerified

        // 6. Cargar y agregar permisos al token
        const permissions = await getUserPermissions(user.id)
        token.permissions = permissions
      }
      return token
    },
    async session({ session, token }) {
      // Pasar datos del token a la sesión (incluido sessionToken para el sistema híbrido)
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.firstName = token.firstName
        session.user.lastName = token.lastName
        session.user.emailVerified = token.emailVerified ?? null
        // Incluir sessionToken para poder invalidar sesión desde logout
        session.sessionToken = token.sessionToken as string

        // Asignar permisos desde el token a la sesión
        session.user.permissions = (token.permissions as string[]) || []
      }
      return session
    }
  },
  pages: {
    signIn: '/admin/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
})

/**
 * Exportaciones de Auth.js
 *
 * @exports handlers Handlers HTTP para la ruta `/api/auth/[...nextauth]`
 * @exports handlers.GET Manejador GET para Auth.js (callback, signin, session, etc)
 * @exports handlers.POST Manejador POST para Auth.js (signin, callback, etc)
 *
 * @exports auth Función para obtener la sesión actual
 * Uso: `const session = await auth();`
 * En Server Components, Server Actions, API Routes, Middleware
 *
 * @exports signIn Función para iniciar sesión
 * Uso: `await signIn('credentials', { email, password })`
 * Dispara el callback jwt() que crea JWT + sesión en BD
 *
 * @exports signOut Función para cerrar sesión
 * Uso: `await signOut()`
 * Invalida el JWT y elimina la sesión de la BD
 *
 * @remarks
 * **Tipos Extendidos**:
 * Los tipos de Session y User están extendidos en `auth-types.ts` para incluir:
 * - `session.user.id`: ID único del usuario
 * - `session.user.firstName`: Nombre del usuario
 * - `session.user.lastName`: Apellido del usuario
 * - `session.user.permissions`: Array de permisos (ej: ['user:read', 'user:create'])
 * - `session.sessionToken`: Token de sesión para validaciones en BD
 *
 * Estos tipos se importan automáticamente en toda la aplicación.
 *
 * @see {@link ../lib/auth-types.ts} para definición de tipos extendidos
 */

// Los tipos extendidos están definidos en auth-types.ts