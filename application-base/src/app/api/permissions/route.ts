import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma/connection"

// GET /api/permissions - Listar todos los permisos
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

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
    console.error("Error fetching permissions:", error)
    return NextResponse.json(
      { error: "Error al obtener permisos" },
      { status: 500 }
    )
  }
}
