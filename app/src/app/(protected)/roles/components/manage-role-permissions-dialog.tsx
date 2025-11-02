"use client"

import * as React from "react"
import { X, Plus, Key, Search, Loader2 } from "lucide-react"

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
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface Permission {
  id: string
  module: string
  description: string | null
  createdAt?: Date
}

interface RolePermission extends Permission {
  assignedAt?: Date
}

interface ManageRolePermissionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleId: string
  roleName: string
  onUpdate?: () => void
}

export function ManageRolePermissionsDialog({
  open,
  onOpenChange,
  roleId,
  roleName,
  onUpdate,
}: ManageRolePermissionsDialogProps) {
  const [assignedPermissions, setAssignedPermissions] = React.useState<RolePermission[]>([])
  const [allPermissions, setAllPermissions] = React.useState<Permission[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [assigningId, setAssigningId] = React.useState<string | null>(null)
  const [removingId, setRemovingId] = React.useState<string | null>(null)

  const fetchData = React.useCallback(async () => {
    if (!open) return

    setLoading(true)
    try {
      // Cargar permisos asignados al rol
      const rolePermissionsRes = await fetch(`/api/roles/${roleId}/permissions`)
      if (rolePermissionsRes.ok) {
        const rolePermissions = await rolePermissionsRes.json()
        setAssignedPermissions(rolePermissions)
      }

      // Cargar todos los permisos disponibles
      const allPermissionsRes = await fetch("/api/permissions")
      if (allPermissionsRes.ok) {
        const data = await allPermissionsRes.json()
        setAllPermissions(data.permissions || [])
      }
    } catch (error) {
      console.error("Error loading permissions:", error)
      toast.error("Error al cargar permisos")
    } finally {
      setLoading(false)
    }
  }, [roleId, open])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAssignPermission = async (permissionId: string) => {
    setAssigningId(permissionId)
    try {
      const response = await fetch(`/api/roles/${roleId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al asignar permiso")
      }

      toast.success("Permiso asignado correctamente")
      await fetchData()
      onUpdate?.()
    } catch (error) {
      console.error("Error assigning permission:", error)
      toast.error(error instanceof Error ? error.message : "Error al asignar permiso")
    } finally {
      setAssigningId(null)
    }
  }

  const handleRemovePermission = async (permissionId: string) => {
    setRemovingId(permissionId)
    try {
      const response = await fetch(
        `/api/roles/${roleId}/permissions?permissionId=${permissionId}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al remover permiso")
      }

      toast.success("Permiso removido correctamente")
      await fetchData()
      onUpdate?.()
    } catch (error) {
      console.error("Error removing permission:", error)
      toast.error(error instanceof Error ? error.message : "Error al remover permiso")
    } finally {
      setRemovingId(null)
    }
  }

  // Filtrar permisos disponibles (que no están asignados)
  const assignedPermissionIds = new Set(assignedPermissions.map((p) => p.id))
  const availablePermissions = allPermissions
    .filter((p) => !assignedPermissionIds.has(p.id))
    .filter(
      (p) =>
        searchQuery === "" ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

  // Agrupar permisos disponibles por módulo
  const groupedAvailable = availablePermissions.reduce((acc, perm) => {
    const module = perm.module || "Sin módulo"
    if (!acc[module]) acc[module] = []
    acc[module].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  // Agrupar permisos asignados por módulo
  const groupedAssigned = assignedPermissions.reduce((acc, perm) => {
    const module = perm.module || "Sin módulo"
    if (!acc[module]) acc[module] = []
    acc[module].push(perm)
    return acc
  }, {} as Record<string, RolePermission[]>)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Gestionar Permisos</DialogTitle>
          <DialogDescription>
            Asigna o remueve permisos para el rol <strong>{roleName}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Permisos Asignados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Permisos Asignados ({assignedPermissions.length})
                </h3>
              </div>
              <ScrollArea className="h-[400px] rounded-md border">
                <div className="p-4 space-y-4">
                  {assignedPermissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No hay permisos asignados
                    </p>
                  ) : (
                    Object.keys(groupedAssigned)
                      .sort()
                      .map((module) => (
                        <div key={module} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Key className="size-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium">{module}</h4>
                          </div>
                          <div className="space-y-2">
                            {groupedAssigned[module].map((permission) => (
                              <div
                                key={permission.id}
                                className="flex items-start justify-between gap-2 rounded-lg border p-2 text-sm"
                              >
                                <div className="flex-1 min-w-0">
                                  <code className="text-xs font-medium">
                                    {permission.id}
                                  </code>
                                  {permission.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {permission.description}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 shrink-0"
                                  onClick={() => handleRemovePermission(permission.id)}
                                  disabled={removingId === permission.id}
                                >
                                  {removingId === permission.id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <X className="size-3" />
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Permisos Disponibles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Permisos Disponibles ({availablePermissions.length})
                </h3>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar permisos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <ScrollArea className="h-[400px] rounded-md border">
                <div className="p-4 space-y-4">
                  {availablePermissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {searchQuery
                        ? "No se encontraron permisos"
                        : "Todos los permisos están asignados"}
                    </p>
                  ) : (
                    Object.keys(groupedAvailable)
                      .sort()
                      .map((module) => (
                        <div key={module} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Key className="size-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium">{module}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {groupedAvailable[module].length}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {groupedAvailable[module].map((permission) => (
                              <div
                                key={permission.id}
                                className="flex items-start justify-between gap-2 rounded-lg border p-2 text-sm hover:bg-accent/50 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <code className="text-xs font-medium">
                                    {permission.id}
                                  </code>
                                  {permission.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {permission.description}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 shrink-0"
                                  onClick={() => handleAssignPermission(permission.id)}
                                  disabled={assigningId === permission.id}
                                >
                                  {assigningId === permission.id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <Plus className="size-3" />
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
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
