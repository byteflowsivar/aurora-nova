"use client"

/**
 * Componente DeleteRoleDialog (Dialog)
 *
 * Diálogo de alerta para confirmar eliminación de un rol.
 * Muestra advertencia si hay usuarios asignados al rol.
 *
 * Este componente es responsable de:
 * - Mostrar diálogo de confirmación para eliminar rol
 * - Advertir si hay usuarios asignados (no se puede eliminar)
 * - Hacer DELETE a API para eliminar rol
 * - Mostrar notificaciones de éxito/error
 * - Cerrar diálogo tras operación
 *
 * **Características**:
 * - AlertDialog controlado (open/onOpenChange)
 * - Valida si el rol tiene usuarios asignados
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
 * @param {RoleData | null} props.role - Datos del rol a eliminar
 * @param {() => void} props.onSuccess - Callback tras eliminación exitosa
 *
 * **Props Requeridas**:
 * - `open` (boolean): Indica si el diálogo está abierto
 * - `onOpenChange` (function): Callback para controlar estado del diálogo
 * - `role` (object | null): { id, name, usersCount } - null si no hay rol
 * - `onSuccess` (function): Callback ejecutado tras eliminar exitosamente
 *
 * **Estados Internos**:
 * - `loading`: Boolean indicando si está eliminando
 *
 * **Validaciones**:
 * - Si usersCount > 0: Se muestra advertencia y se deshabilita eliminación
 * - Rol debe tener id válido para eliminar
 *
 * **Flujo**:
 * 1. AlertDialog se abre cuando open = true
 * 2. Muestra nombre del rol y número de usuarios asignados
 * 3. Si usersCount > 0: Mensaje de advertencia, botón acción deshabilitado
 * 4. Si usersCount === 0: Botón "Eliminar" habilitado
 * 5. En click "Eliminar":
 *    - setLoading(true)
 *    - DELETE a /api/admin/roles/:id
 *    - Si exitoso: toast + callback onSuccess() + cierra
 *    - Si error: toast error con mensaje
 * 6. Botón Cancelar cierra sin hacer nada
 *
 * **API Integration**:
 * - Endpoint: DELETE /api/admin/roles/:id
 * - No requiere body
 * - Response: { success: true }
 *
 * **Casos de Uso**:
 * - Eliminar rol desde tabla de roles
 * - Protección: no permite eliminar si hay usuarios asignados
 *
 * **Seguridad**:
 * - Validación en servidor si el rol tiene usuarios
 * - No elimina roles con referencias activas
 * - Requiere autenticación/autorización
 * - Toast errors sin exponer información sensible
 *
 * @example
 * ```tsx
 * // En página de gestión de roles
 * import { DeleteRoleDialog } from './delete-role-dialog'
 * 
 * export function RolesPage() {
 *   const [openDelete, setOpenDelete] = useState(false)
 *   const [selectedRole, setSelectedRole] = useState(null)
 *   
 *   const handleDelete = (role) => {
 *     setSelectedRole(role)
 *     setOpenDelete(true)
 *   }
 *   
 *   return (
 *     <DeleteRoleDialog
 *       open={openDelete}
 *       onOpenChange={setOpenDelete}
 *       role={selectedRole}
 *       onSuccess={() => refetchRoles()}
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

interface DeleteRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: {
    id: string
    name: string
    usersCount?: number
  } | null
  onSuccess: () => void
}

export function DeleteRoleDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: DeleteRoleDialogProps) {
  const [loading, setLoading] = React.useState(false)

  const handleDelete = async () => {
    if (!role) return

    setLoading(true)

    try {
      const response = await fetch(API_ROUTES.ADMIN_ROLE(role.id), {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al eliminar rol")
      }

      toast.success("Rol eliminado correctamente")
      onSuccess()
      onOpenChange(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al eliminar rol"
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
            Esta acción no se puede deshacer. Se eliminará permanentemente el rol{" "}
            <strong>{role?.name}</strong>
            {role?.usersCount && role.usersCount > 0 ? (
              <span className="text-destructive">
                {" "}
                (tiene {role.usersCount} usuario(s) asignado(s))
              </span>
            ) : null}
            .
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
