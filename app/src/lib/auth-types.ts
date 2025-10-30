/**
 * Tipos específicos de Auth.js para Aurora Nova
 * Archivo separado para evitar conflictos con module augmentation
 */

import type { UserRole } from '@/lib/types/auth'

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      emailVerified?: Date | null
      firstName?: string | null
      lastName?: string | null
      roles?: UserRole[]
      permissions?: string[]
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    firstName?: string | null
    lastName?: string | null
    emailVerified?: Date | null
  }
}

