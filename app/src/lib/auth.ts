/**
 * Configuración de Auth.js para Aurora Nova
 * Incluye providers, callbacks y configuración personalizada para RBAC
 * Migrado a Prisma para mejor compatibilidad
 */

import NextAuth from "next-auth"
import '@/lib/auth-types' // Importar tipos extendidos
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma/connection"
import { getUserByEmail, getUserWithCredentials } from "@/lib/prisma/queries"
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
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
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

          // Retornar usuario en formato Auth.js
          return {
            id: user.id,
            email: user.email,
            name: user.name || `${user.firstName} ${user.lastName}`.trim(),
            image: user.image,
            emailVerified: user.emailVerified,
          }
        } catch (error) {
          console.error("Error during authentication:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async session({ session, user }) {
      // Agregar ID del usuario a la sesión
      if (session?.user && user) {
        session.user.id = user.id
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