"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import type { Session } from "next-auth"

interface SessionProviderProps {
  children: React.ReactNode
  session?: Session | null
}

/**
 * @component SessionProvider
 * @description Provides NextAuth session context to the application.
 * @version 1.0.0
 *
 * This component is a client-side wrapper for the `SessionProvider` from `next-auth/react`.
 * It's used in a separate file to avoid marking the root layout as a client component.
 *
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components that will have access to the session context.
 * @param {Session | null} [props.session] - The NextAuth session object.
 *
 * @returns {JSX.Element} The NextAuth session provider wrapping the children.
 *
 * @example
 * // In a `providers.tsx` file
 * import { SessionProvider } from '@/components/providers/session-provider';
 *
 * export function Providers({ children }) {
 *   return (
 *     <SessionProvider>
 *       {children}
 *     </SessionProvider>
 *   );
 * }
 *
 * // In `layout.tsx`
 * import { Providers } from './providers';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <Providers>
 *           {children}
 *         </Providers>
 *       </body>
 *     </html>
 *   );
 * }
 */
export function SessionProvider({ children, session }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider
      session={session}
      refetchOnWindowFocus={false}
    >
      {children}
    </NextAuthSessionProvider>
  )
}
