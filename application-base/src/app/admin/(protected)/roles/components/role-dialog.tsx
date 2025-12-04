"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { API_ROUTES } from "@/modules/shared/constants/api-routes"

interface RoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: {
    id: string
    name: string
    description: string | null
  } | null
  onSuccess: () => void
}

export function RoleDialog({ open, onOpenChange, role, onSuccess }: RoleDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
  })

  React.useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description || "",
      })
    } else {
      setFormData({
        name: "",
        description: "",
      })
    }
  }, [role, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = role ? API_ROUTES.ADMIN_ROLE(role.id) : API_ROUTES.ADMIN_ROLES
      const method = role ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al guardar rol")
      }

      toast.success(role ? "Rol actualizado" : "Rol creado")
      onSuccess()
      onOpenChange(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al guardar rol"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{role ? "Editar Rol" : "Crear Rol"}</DialogTitle>
          <DialogDescription>
            {role
              ? "Actualiza la información del rol."
              : "Completa el formulario para crear un nuevo rol."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="ej: Administrador, Editor, Visor"
                required
                maxLength={50}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe el propósito de este rol..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : role ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
