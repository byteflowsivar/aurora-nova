"use client"

import * as React from "react"
import { X, Plus, Shield, Search, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"

interface Role {
  id: string
  name: string
  description: string | null
}

interface UserRole extends Role {
  assignedAt?: Date
}

interface ManageUserRolesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
  onUpdate?: () => void
}

export function ManageUserRolesDialog({
  open,
  onOpenChange,
  userId,
  userName,
  onUpdate,
}: ManageUserRolesDialogProps) {
  const [assignedRoles, setAssignedRoles] = React.useState<UserRole[]>([])
  const [allRoles, setAllRoles] = React.useState<Role[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [assigningId, setAssigningId] = React.useState<string | null>(null)
  const [removingId, setRemovingId] = React.useState<string | null>(null)

  const fetchData = React.useCallback(async () => {
    if (!open) return

    setLoading(true)
    try {
      // Cargar roles asignados al usuario
      const userRolesRes = await fetch(`/api/users/${userId}/roles`)
      if (userRolesRes.ok) {
        const userRoles = await userRolesRes.json()
        setAssignedRoles(userRoles)
      }

      // Cargar todos los roles disponibles
      const allRolesRes = await fetch("/api/roles")
      if (allRolesRes.ok) {
        const data = await allRolesRes.json()
        setAllRoles(data)
      }
    } catch (error) {
      console.error("Error loading roles:", error)
      toast.error("Error al cargar roles")
    } finally {
      setLoading(false)
    }
  }, [userId, open])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAssignRole = async (roleId: string) => {
    setAssigningId(roleId)
    try {
      const response = await fetch(`/api/users/${userId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al asignar rol")
      }

      toast.success("Rol asignado correctamente")
      await fetchData()
      onUpdate?.()
    } catch (error) {
      console.error("Error assigning role:", error)
      toast.error(error instanceof Error ? error.message : "Error al asignar rol")
    } finally {
      setAssigningId(null)
    }
  }

  const handleRemoveRole = async (roleId: string) => {
    setRemovingId(roleId)
    try {
      const response = await fetch(
        `/api/users/${userId}/roles?roleId=${roleId}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al remover rol")
      }

      toast.success("Rol removido correctamente")
      await fetchData()
      onUpdate?.()
    } catch (error) {
      console.error("Error removing role:", error)
      toast.error(error instanceof Error ? error.message : "Error al remover rol")
    } finally {
      setRemovingId(null)
    }
  }

  // Filtrar roles disponibles (que no están asignados)
  const assignedRoleIds = new Set(assignedRoles.map((r) => r.id))
  const availableRoles = allRoles
    .filter((r) => !assignedRoleIds.has(r.id))
    .filter(
      (r) =>
        searchQuery === "" ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Gestionar Roles</DialogTitle>
          <DialogDescription>
            Asigna o remueve roles para el usuario <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Roles Asignados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Roles Asignados ({assignedRoles.length})
                </h3>
              </div>
              <ScrollArea className="h-[400px] rounded-md border">
                <div className="p-4 space-y-3">
                  {assignedRoles.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No hay roles asignados
                    </p>
                  ) : (
                    assignedRoles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-start gap-3 rounded-lg border p-3"
                      >
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                          <Shield className="size-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{role.name}</div>
                          {role.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {role.description}
                            </p>
                          )}
                          {role.assignedAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Asignado el{" "}
                              {new Date(role.assignedAt).toLocaleDateString("es-ES")}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={() => handleRemoveRole(role.id)}
                          disabled={removingId === role.id}
                        >
                          {removingId === role.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <X className="size-4" />
                          )}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Roles Disponibles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Roles Disponibles ({availableRoles.length})
                </h3>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <ScrollArea className="h-[400px] rounded-md border">
                <div className="p-4 space-y-3">
                  {availableRoles.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {searchQuery
                        ? "No se encontraron roles"
                        : "Todos los roles están asignados"}
                    </p>
                  ) : (
                    availableRoles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                          <Shield className="size-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{role.name}</div>
                          {role.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {role.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={() => handleAssignRole(role.id)}
                          disabled={assigningId === role.id}
                        >
                          {assigningId === role.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Plus className="size-4" />
                          )}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
