import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";
import type { UserRole } from '@/lib/types/auth';

declare module "next-auth" {
  interface Session extends DefaultSession {
    sessionToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      emailVerified?: Date | null;
      firstName?: string | null;
      lastName?: string | null;
      roles?: UserRole[];
      permissions?: string[];
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: Date | null;
    ipAddress?: string;
    userAgent?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    email?: string;
    name?: string;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: Date | null;
    sessionToken?: string;
  }
}
