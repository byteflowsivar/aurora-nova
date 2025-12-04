"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash2, Shield, Users, Key } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { RoleDialog } from "./components/role-dialog"
import { DeleteRoleDialog } from "./components/delete-role-dialog"
import { ManageRolePermissionsDialog } from "./components/manage-role-permissions-dialog"
import { Skeleton } from "@/components/ui/skeleton"

interface Role {
  id: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
  permissionsCount: number
  usersCount: number
}

export default function RolesPage() {
  const [roles, setRoles] = React.useState<Role[]>([])
  const [loading, setLoading] = React.useState(true)
  const [roleDialogOpen, setRoleDialogOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = React.useState(false)
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null)

  const fetchRoles = React.useCallback(async () => {
    try {
      const response = await fetch("/api/roles")
      if (!response.ok) throw new Error("Error al cargar roles")
      const data = await response.json()
      setRoles(data)
    } catch (error) {
      console.error("Error fetching roles:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const handleEdit = (role: Role) => {
    setSelectedRole(role)
    setRoleDialogOpen(true)
  }

  const handleDelete = (role: Role) => {
    setSelectedRole(role)
    setDeleteDialogOpen(true)
  }

  const handleCreate = () => {
    setSelectedRole(null)
    setRoleDialogOpen(true)
  }

  const handleManagePermissions = (role: Role) => {
    setSelectedRole(role)
    setPermissionsDialogOpen(true)
  }

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: "name",
      header: "Rol",
      cell: ({ row }) => {
        const role = row.original

        return (
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="size-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">{role.name}</div>
              {role.description && (
                <div className="text-sm text-muted-foreground line-clamp-1">
                  {role.description}
                </div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "permissionsCount",
      header: "Permisos",
      cell: ({ row }) => {
        const count = row.original.permissionsCount
        return (
          <Badge variant="secondary">
            <Key className="mr-1 size-3" />
            {count} {count === 1 ? "permiso" : "permisos"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "usersCount",
      header: "Usuarios",
      cell: ({ row }) => {
        const count = row.original.usersCount
        return (
          <Badge variant="outline">
            <Users className="mr-1 size-3" />
            {count} {count === 1 ? "usuario" : "usuarios"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: "Creado",
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt)
        return <div className="text-sm">{date.toLocaleDateString("es-ES")}</div>
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const role = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="size-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleManagePermissions(role)}>
                <Key className="mr-2 size-4" />
                Gestionar Permisos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(role)}>
                <Pencil className="mr-2 size-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(role)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
            <p className="text-muted-foreground">
              Gestiona los roles del sistema y sus permisos asociados
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Shield className="mr-2 size-4" />
            Crear Rol
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={roles}
          searchColumn="name"
          searchPlaceholder="Buscar roles..."
        />
      </div>

      <RoleDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        role={selectedRole}
        onSuccess={fetchRoles}
      />

      <DeleteRoleDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        role={selectedRole}
        onSuccess={fetchRoles}
      />

      {selectedRole && (
        <ManageRolePermissionsDialog
          open={permissionsDialogOpen}
          onOpenChange={setPermissionsDialogOpen}
          roleId={selectedRole.id}
          roleName={selectedRole.name}
          onUpdate={fetchRoles}
        />
      )}
    </>
  )
}
