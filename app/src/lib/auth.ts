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
import '@/lib/auth-types' // Importar tipos extendidos
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma/connection"
import { getUserByEmail, getUserWithCredentials } from "@/lib/prisma/queries"
import { createSession } from "@/lib/prisma/session-queries"
import { generateSessionToken, getSessionExpiry } from "@/lib/utils/session-utils"
import bcrypt from "bcryptjs"

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
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Buscar usuario por email
          const user = await getUserByEmail(credentials.email as string)

          if (!user) {
            return null
          }

          // Buscar credenciales del usuario
          const userWithCredentials = await getUserWithCredentials(user.id)

          if (!userWithCredentials?.credentials) {
            return null
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            userWithCredentials.credentials.hashedPassword
          )

          if (!isValidPassword) {
            return null
          }

          // Retornar usuario en formato Auth.js + metadata para sistema híbrido
          return {
            id: user.id,
            email: user.email,
            name: user.name || `${user.firstName} ${user.lastName}`.trim(),
            image: user.image,
            emailVerified: user.emailVerified,
            firstName: user.firstName,
            lastName: user.lastName,
            // Metadata para crear sesión en BD (se usa en callback JWT)
            ipAddress: credentials.ipAddress as string | undefined,
            userAgent: credentials.userAgent as string | undefined,
          }
        } catch (error) {
          console.error("Error during authentication:", error)
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
            ipAddress: (user as any).ipAddress,
            userAgent: (user as any).userAgent,
          })

          // 4. Guardar sessionToken en el JWT para validaciones futuras
          token.sessionToken = sessionToken
        } catch (error) {
          console.error("Error creating session in database:", error)
          // Continuamos con el login aunque falle el tracking
          // El JWT seguirá funcionando, solo no habrá registro en BD
        }

        // 5. Agregar datos del usuario al token JWT
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.firstName = (user as any).firstName
        token.lastName = (user as any).lastName
        token.emailVerified = (user as any).emailVerified
      }
      return token
    },
    async session({ session, token }) {
      // Pasar datos del token a la sesión (incluido sessionToken para el sistema híbrido)
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        ;(session.user as any).firstName = token.firstName as string | null
        ;(session.user as any).lastName = token.lastName as string | null
        ;(session.user as any).emailVerified = token.emailVerified as Date | null
        // Incluir sessionToken para poder invalidar sesión desde logout
        ;(session as any).sessionToken = token.sessionToken
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