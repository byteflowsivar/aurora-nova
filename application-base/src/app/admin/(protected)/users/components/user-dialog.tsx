"use client"

/**
 * Componente UserDialog (Dialog)
 *
 * Diálogo modal para crear o editar usuarios.
 * Renderiza un formulario con campos para email, nombre y apellido.
 *
 * Este componente es responsable de:
 * - Mostrar diálogo modal para crear o editar usuario
 * - Renderizar formulario con email, nombre, apellido
 * - Validar datos antes de enviar
 * - Hacer POST/PUT a API según modo (crear/editar)
 * - Mostrar notificaciones de éxito/error
 * - Cerrar diálogo tras operación exitosa
 *
 * **Características**:
 * - Modal dialog controlado (open/onOpenChange)
 * - Modo dual: crear nuevo usuario o editar existente
 * - Campos: email (único), nombre, apellido
 * - Loading state en botón durante envío
 * - Toast notifications para feedback
 * - Validación de entrada en formulario
 *
 * @component
 * @returns {JSX.Element} Dialog modal para gestión de usuarios
 *
 * @param {Object} props - Props del componente
 * @param {boolean} props.open - Estado del diálogo (abierto/cerrado)
 * @param {(open: boolean) => void} props.onOpenChange - Callback para cambiar estado
 * @param {UserData} [props.user] - Datos del usuario si se está editando
 * @param {() => void} props.onSuccess - Callback tras operación exitosa
 *
 * **Props Requeridas**:
 * - `open` (boolean): Indica si el diálogo está abierto
 * - `onOpenChange` (function): Callback para controlar estado del diálogo
 * - `onSuccess` (function): Callback ejecutado tras crear/editar
 * - `user` (optional): Objeto con { id, email, firstName, lastName }
 *
 * **Campos del Formulario**:
 * 1. **Email** (requerido si crear, readonly si editar)
 *    - Input email
 *    - Validación de formato email
 *    - Único a nivel de aplicación
 * 2. **Nombre** (requerido)
 *    - Input text
 *    - Mínimo 1 carácter
 * 3. **Apellido** (requerido)
 *    - Input text
 *    - Mínimo 1 carácter
 *
 * **Flujo**:
 * 1. Props open controla visibilidad del modal
 * 2. Si user !== null: modo "editar", pre-carga datos
 * 3. Si user === null: modo "crear", form vacío
 * 4. Usuario completa/modifica datos
 * 5. En submit:
 *    - Modo crear: POST a /api/admin/users con datos
 *    - Modo editar: PUT a /api/admin/users/:id con datos
 * 6. Si exitoso: toast success + callback onSuccess()
 * 7. Si error: toast error con mensaje
 *
 * **API Integration**:
 * - Crear: POST /api/admin/users
 * - Editar: PUT /api/admin/users/:id
 * - Body: { email, firstName, lastName }
 * - Response: { id, email, firstName, lastName, ... }
 *
 * **Validaciones**:
 * - Email: formato válido, único en BD
 * - firstName: requerido
 * - lastName: requerido
 *
 * **Casos de Uso**:
 * - Crear nuevo usuario desde tabla de usuarios
 * - Editar información de usuario existente
 *
 * @example
 * ```tsx
 * // En página de gestión de usuarios
 * import { UserDialog } from './user-dialog'
 * 
 * export function UsersPage() {
 *   const [open, setOpen] = useState(false)
 *   const [selectedUser, setSelectedUser] = useState(null)
 *   
 *   return (
 *     <UserDialog
 *       open={open}
 *       onOpenChange={setOpen}
 *       user={selectedUser}
 *       onSuccess={() => refetchUsers()}
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
import { toast } from "sonner"
import { API_ROUTES } from "@/modules/shared/constants/api-routes"

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  } | null
  onSuccess: () => void
}

export function UserDialog({ open, onOpenChange, user, onSuccess }: UserDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [formData, setFormData] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  })

  React.useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email,
        password: "",
      })
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
      })
    }
  }, [user, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = user ? API_ROUTES.ADMIN_USER(user.id) : API_ROUTES.ADMIN_USERS
      const method = user ? "PUT" : "POST"

      const body = user
        ? { firstName: formData.firstName, lastName: formData.lastName, email: formData.email }
        : formData

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al guardar usuario")
      }

      toast.success(user ? "Usuario actualizado" : "Usuario creado")
      onSuccess()
      onOpenChange(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al guardar usuario"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{user ? "Editar Usuario" : "Crear Usuario"}</DialogTitle>
          <DialogDescription>
            {user
              ? "Actualiza la información del usuario."
              : "Completa el formulario para crear un nuevo usuario."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
            {!user && (
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  minLength={6}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : user ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
