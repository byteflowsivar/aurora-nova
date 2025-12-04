/**
 * Página principal de Aurora Nova
 * Redirige a dashboard si está autenticado, o a login si no lo está
 */

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await auth()

  if (session?.user) {
    // Usuario autenticado, redirigir al dashboard de administración
    redirect("/admin/dashboard")
  } else {
    // Usuario no autenticado, redirigir al login administrativo
    redirect("/admin/auth/signin")
  }
}
