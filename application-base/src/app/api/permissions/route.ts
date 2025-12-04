import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma/connection"
import { requirePermission } from "@/lib/server/require-permission"
import { SYSTEM_PERMISSIONS } from "@/modules/admin/types/permissions"
import { UnauthenticatedError, PermissionDeniedError } from "@/lib/server/require-permission"

// GET /api/permissions - Listar todos los permisos
export async function GET() {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.PERMISSION_LIST)

    const permissions = await prisma.permission.findMany({
      select: {
        id: true,
        module: true,
        description: true,
        createdAt: true,
        _count: {
          select: {
            rolePermissions: true,
          },
        },
      },
      orderBy: [
        { module: "asc" },
        { id: "asc" },
      ],
    })

    // Agrupar por módulo
    const grouped = permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = []
      }
      acc[permission.module].push({
        id: permission.id,
        module: permission.module,
        description: permission.description,
        createdAt: permission.createdAt,
        rolesCount: permission._count.rolePermissions,
      })
      return acc
    }, {} as Record<string, Array<{id: string; module: string; description: string | null; createdAt: Date; rolesCount: number}>>)

    return NextResponse.json({
      permissions: permissions.map((p) => ({
        id: p.id,
        module: p.module,
        description: p.description,
        createdAt: p.createdAt,
        rolesCount: p._count.rolePermissions,
      })),
      groupedByModule: grouped,
    })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
    console.error("Error fetching permissions:", error)
    return NextResponse.json(
      { error: "Error al obtener permisos" },
      { status: 500 }
    )
  }
}
