/**
 * Configuración de Auth.js para Aurora Nova
 * Incluye providers, callbacks y configuración personalizada para RBAC
 */

import NextAuth from "next-auth"
import '@/lib/auth-types' // Importar tipos extendidos
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db/connection"
import {
  userTable,
  sessionTable,
  accountTable,
  verificationTokenTable,
  userCredentialsTable,
} from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

// Configuración del adapter Drizzle para Auth.js con tablas personalizadas
const customAdapter = DrizzleAdapter(db, {
  usersTable: userTable,
  accountsTable: accountTable,
  sessionsTable: sessionTable,
  verificationTokensTable: verificationTokenTable,
})

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut
} = NextAuth({
  adapter: customAdapter,
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
          const [user] = await db
            .select()
            .from(userTable)
            .where(eq(userTable.email, credentials.email as string))
            .limit(1)

          if (!user) {
            return null
          }

          // Verificar password
          const [userCredentials] = await db
            .select()
            .from(userCredentialsTable)
            .where(eq(userCredentialsTable.userId, user.id))
            .limit(1)

          if (!userCredentials) {
            return null
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            userCredentials.hashedPassword
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