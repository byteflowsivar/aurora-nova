"use client"

/**
 * Componente RoleDialog (Dialog)
 *
 * Diálogo modal para crear o editar roles.
 * Renderiza un formulario con campos para nombre y descripción del rol.
 *
 * Este componente es responsable de:
 * - Mostrar diálogo modal para crear o editar rol
 * - Renderizar formulario con nombre y descripción
 * - Validar datos antes de enviar
 * - Hacer POST/PUT a API según modo (crear/editar)
 * - Mostrar notificaciones de éxito/error
 * - Cerrar diálogo tras operación exitosa
 *
 * **Características**:
 * - Modal dialog controlado (open/onOpenChange)
 * - Modo dual: crear nuevo rol o editar existente
 * - Campos: nombre (requerido, max 50 chars), descripción (opcional)
 * - Loading state en botón durante envío
 * - Toast notifications para feedback
 * - Validación de entrada en formulario
 *
 * @component
 * @returns {JSX.Element} Dialog modal para gestión de roles
 *
 * @param {Object} props - Props del componente
 * @param {boolean} props.open - Estado del diálogo (abierto/cerrado)
 * @param {(open: boolean) => void} props.onOpenChange - Callback para cambiar estado del diálogo
 * @param {RoleData} [props.role] - Datos del rol si se está editando (null para crear)
 * @param {() => void} props.onSuccess - Callback tras operación exitosa (para refrescar lista)
 *
 * **Props Requeridas**:
 * - `open` (boolean): Indica si el diálogo está abierto
 * - `onOpenChange` (function): Callback para controlar estado del diálogo
 * - `onSuccess` (function): Callback ejecutado tras crear/editar exitosamente
 * - `role` (optional): Objeto con { id, name, description } si editar, null si crear
 *
 * **Campos del Formulario**:
 * 1. **Nombre** (requerido)
 *    - Input text
 *    - Máximo 50 caracteres
 *    - Placeholder: "ej: Administrador, Editor, Visor"
 * 2. **Descripción** (opcional)
 *    - Textarea con 3 filas
 *    - Placeholder: "Describe el propósito de este rol..."
 *
 * **Flujo**:
 * 1. Props open controla visibilidad del modal
 * 2. Si role !== null: modo "editar", pre-carga datos en form
 * 3. Si role === null: modo "crear", form vacío
 * 4. Usuario completa/modifica datos
 * 5. En submit:
 *    - Modo crear: POST a /api/admin/roles
 *    - Modo editar: PUT a /api/admin/roles/:id
 * 6. Si exitoso: toast success + cierra diálogo
 * 7. Si error: toast error con mensaje
 *
 * @example
 * ```tsx
 * // En página de gestión de roles
 * import { RoleDialog } from './role-dialog'
 * 
 * export function RolesPage() {
 *   const [open, setOpen] = useState(false)
 *   const [selectedRole, setSelectedRole] = useState(null)
 *   
 *   return (
 *     <RoleDialog
 *       open={open}
 *       onOpenChange={setOpen}
 *       role={selectedRole}
 *       onSuccess={() => refetchRoles()}
 *     />
 *   )
 * }
 * ```
 */

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
