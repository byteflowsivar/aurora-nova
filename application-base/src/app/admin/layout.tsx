/**
 * Layout base para todas las rutas administrativas
 * No valida sesión - permite acceso a auth (signin, forgot-password, reset-password)
 * Las rutas bajo (protected) validarán sesión en su propio layout
 */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
