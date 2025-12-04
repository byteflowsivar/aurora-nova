"use client"

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
