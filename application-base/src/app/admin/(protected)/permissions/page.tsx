"use client"

import * as React from "react"
import { Key, Shield, Info } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { API_ROUTES } from "@/modules/shared/constants/api-routes"

interface Permission {
  id: string
  module: string
  description: string | null
  createdAt: Date
  rolesCount: number
}

interface PermissionsData {
  permissions: Permission[]
  groupedByModule: Record<string, Permission[]>
}

export default function PermissionsPage() {
  const [data, setData] = React.useState<PermissionsData | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await fetch(API_ROUTES.ADMIN_PERMISSIONS)
        if (!response.ok) throw new Error("Error al cargar permisos")
        const permissionsData = await response.json()
        setData(permissionsData)
      } catch (error) {
        console.error("Error fetching permissions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[200px]" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permisos</h1>
          <p className="text-muted-foreground">
            No se pudieron cargar los permisos del sistema
          </p>
        </div>
      </div>
    )
  }

  const modules = Object.keys(data.groupedByModule).sort()

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Permisos</h1>
        <p className="text-muted-foreground">
          Vista de solo lectura de todos los permisos del sistema
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Info className="size-5 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-base">Información</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Los permisos son definidos por el sistema y no pueden ser creados o eliminados
            directamente. Se gestionan a través de la asignación a roles en el módulo de
            <strong> Roles</strong>.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => {
          const permissions = data.groupedByModule[module]

          return (
            <Card key={module}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Key className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{module}</CardTitle>
                    <CardDescription>
                      {permissions.length} {permissions.length === 1 ? "permiso" : "permisos"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <code className="text-sm font-medium">{permission.id}</code>
                          {permission.description && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {permission.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          <Shield className="mr-1 size-3" />
                          {permission.rolesCount}
                        </Badge>
                      </div>
                      {permission !== permissions[permissions.length - 1] && (
                        <Separator className="!mt-3" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Resumen del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <Key className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.permissions.length}</p>
                <p className="text-sm text-muted-foreground">Permisos totales</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                <Shield className="size-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{modules.length}</p>
                <p className="text-sm text-muted-foreground">Módulos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
                <Info className="size-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(
                    data.permissions.reduce((sum, p) => sum + p.rolesCount, 0) /
                      data.permissions.length
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Promedio por permiso</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
