"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash2, UserPlus, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { UserDialog } from "./components/user-dialog"
import { DeleteUserDialog } from "./components/delete-user-dialog"
import { ManageUserRolesDialog } from "./components/manage-user-roles-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { API_ROUTES } from "@/modules/shared/constants/api-routes"

interface User {
  id: string
  name: string | null
  firstName: string | null
  lastName: string | null
  email: string
  emailVerified: Date | null
  image: string | null
  createdAt: Date
  updatedAt: Date
  roles: Array<{
    id: string
    name: string
    description: string | null
  }>
}

export default function UsersPage() {
  const [users, setUsers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(true)
  const [userDialogOpen, setUserDialogOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [rolesDialogOpen, setRolesDialogOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)

  const fetchUsers = React.useCallback(async () => {
    try {
      const response = await fetch(API_ROUTES.ADMIN_USERS)
      if (!response.ok) throw new Error("Error al cargar usuarios")
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setUserDialogOpen(true)
  }

  const handleDelete = (user: User) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const handleCreate = () => {
    setSelectedUser(null)
    setUserDialogOpen(true)
  }

  const handleManageRoles = (user: User) => {
    setSelectedUser(user)
    setRolesDialogOpen(true)
  }

  const getUserInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    }
    if (user.name) {
      const names = user.name.split(" ")
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase()
      }
      return user.name.substring(0, 2).toUpperCase()
    }
    return user.email.substring(0, 2).toUpperCase()
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Usuario",
      cell: ({ row }) => {
        const user = row.original
        const displayName =
          user.name ||
          (user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.email)

        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarImage src={user.image || undefined} alt={displayName} />
              <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{displayName}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "roles",
      header: "Roles",
      cell: ({ row }) => {
        const roles = row.original.roles
        return (
          <div className="flex flex-wrap gap-1">
            {roles.length > 0 ? (
              roles.map((role) => (
                <Badge key={role.id} variant="secondary">
                  <Shield className="mr-1 size-3" />
                  {role.name}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Sin roles</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "emailVerified",
      header: "Estado",
      cell: ({ row }) => {
        const verified = row.original.emailVerified
        return (
          <Badge variant={verified ? "default" : "secondary"}>
            {verified ? "Verificado" : "Pendiente"}
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
        const user = row.original

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
              <DropdownMenuItem onClick={() => handleManageRoles(user)}>
                <Shield className="mr-2 size-4" />
                Gestionar Roles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(user)}>
                <Pencil className="mr-2 size-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(user)}
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
            <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
            <p className="text-muted-foreground">
              Gestiona los usuarios del sistema y sus permisos
            </p>
          </div>
          <Button onClick={handleCreate}>
            <UserPlus className="mr-2 size-4" />
            Crear Usuario
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={users}
          searchColumn="name"
          searchPlaceholder="Buscar por nombre o email..."
        />
      </div>

      <UserDialog
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        user={selectedUser}
        onSuccess={fetchUsers}
      />

      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={selectedUser}
        onSuccess={fetchUsers}
      />

      {selectedUser && (
        <ManageUserRolesDialog
          open={rolesDialogOpen}
          onOpenChange={setRolesDialogOpen}
          userId={selectedUser.id}
          userName={
            selectedUser.name ||
            (selectedUser.firstName && selectedUser.lastName
              ? `${selectedUser.firstName} ${selectedUser.lastName}`
              : selectedUser.email)
          }
          onUpdate={fetchUsers}
        />
      )}
    </>
  )
}
