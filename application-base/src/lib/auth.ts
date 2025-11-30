/**
 * Configuración de Auth.js para Aurora Nova - Sistema Híbrido JWT + Database
 *
 * Este archivo implementa un sistema híbrido de autenticación que combina:
 *
 * 1. JWT Strategy: Para autenticación rápida sin consultas a BD en cada request
 * 2. Database Session Tracking: Para gestión manual de sesiones, invalidación y auditoría
 *
 * Flujo del sistema:
 * - Login: Se crea JWT + registro en tabla `session` con IP y UserAgent
 * - Request: Middleware valida JWT (rápido) + opcionalmente verifica sesión en BD
 * - Logout: Se elimina registro de tabla `session` (invalida sesión)
 * - Gestión: Permite listar/invalidar sesiones manualmente
 *
 * @see docs/auth-hybrid-system.md para documentación completa
 */

import NextAuth from "next-auth"

import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma/connection"
import { getUserByEmail, getUserWithCredentials } from "@/lib/prisma/queries"
import { createSession } from "@/lib/prisma/session-queries"
import { getUserPermissions } from "@/lib/prisma/permission-queries"
import { generateSessionToken, getSessionExpiry } from "@/lib/utils/session-utils"
import bcrypt from "bcryptjs"
import logger from "@/lib/logger";
import { eventBus, SystemEvent } from "@/lib/events";

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
            { userId: user.id }
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
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
})

// Los tipos extendidos están definidos en auth-types.ts