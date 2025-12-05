"use client"

/**
 * Componente DeleteUserDialog (Dialog)
 *
 * Diálogo de alerta para confirmar eliminación de un usuario.
 * Valida que no sea el propio usuario quien se intente eliminar.
 *
 * Este componente es responsable de:
 * - Mostrar diálogo de confirmación para eliminar usuario
 * - Advertir si intenta auto-eliminarse
 * - Hacer DELETE a API para eliminar usuario
 * - Mostrar notificaciones de éxito/error
 * - Cerrar diálogo tras operación
 *
 * **Características**:
 * - AlertDialog controlado (open/onOpenChange)
 * - Valida intento de auto-eliminación
 * - Loading state en botón de acción
 * - Toast notifications para feedback
 * - Mensaje de advertencia descriptivo
 *
 * @component
 * @returns {JSX.Element} AlertDialog para confirmar eliminación
 *
 * @param {Object} props - Props del componente
 * @param {boolean} props.open - Estado del diálogo (abierto/cerrado)
 * @param {(open: boolean) => void} props.onOpenChange - Callback para cambiar estado
 * @param {UserData | null} props.user - Datos del usuario a eliminar
 * @param {() => void} props.onSuccess - Callback tras eliminación exitosa
 *
 * **Props Requeridas**:
 * - `open` (boolean): Indica si el diálogo está abierto
 * - `onOpenChange` (function): Callback para controlar estado
 * - `user` (object | null): { id, email } - null si no hay usuario
 * - `onSuccess` (function): Callback ejecutado tras eliminar
 *
 * **Estados Internos**:
 * - `loading`: Boolean indicando si está eliminando
 *
 * **Validaciones**:
 * - No permite auto-eliminación (se valida en servidor)
 * - Usuario debe tener id válido para eliminar
 *
 * **Flujo**:
 * 1. AlertDialog se abre cuando open = true
 * 2. Muestra email del usuario a eliminar
 * 3. Advertencia sobre eliminación permanente
 * 4. En click "Eliminar":
 *    - setLoading(true)
 *    - DELETE a /api/admin/users/:id
 *    - Si exitoso: toast + callback onSuccess()
 *    - Si error: toast error con mensaje
 * 5. Botón Cancelar cierra sin hacer nada
 *
 * **API Integration**:
 * - Endpoint: DELETE /api/admin/users/:id
 * - No requiere body
 * - Response: { success: true }
 * - Valida en servidor si es auto-eliminación
 *
 * **Casos de Uso**:
 * - Eliminar usuario desde tabla de usuarios
 * - Protección: no permite auto-eliminación
 *
 * @example
 * ```tsx
 * // En página de gestión de usuarios
 * import { DeleteUserDialog } from './delete-user-dialog'
 * 
 * export function UsersPage() {
 *   const [openDelete, setOpenDelete] = useState(false)
 *   const [selectedUser, setSelectedUser] = useState(null)
 *   
 *   return (
 *     <DeleteUserDialog
 *       open={openDelete}
 *       onOpenChange={setOpenDelete}
 *       user={selectedUser}
 *       onSuccess={() => refetchUsers()}
 *     />
 *   )
 * }
 * ```
 */

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { API_ROUTES } from "@/modules/shared/constants/api-routes"

interface DeleteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id: string
    name?: string | null
    email: string
  } | null
  onSuccess: () => void
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: DeleteUserDialogProps) {
  const [loading, setLoading] = React.useState(false)

  const handleDelete = async () => {
    if (!user) return

    setLoading(true)

    try {
      const response = await fetch(API_ROUTES.ADMIN_USER(user.id), {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al eliminar usuario")
      }

      toast.success("Usuario eliminado correctamente")
      onSuccess()
      onOpenChange(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al eliminar usuario"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente el usuario{" "}
            <strong>{user?.name || user?.email}</strong> y todos sus datos asociados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
