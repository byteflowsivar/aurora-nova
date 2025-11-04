import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma/connection"

// GET /api/users/[id]/permissions - Obtener permisos del usuario (a través de sus roles)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Obtener todos los permisos del usuario a través de sus roles
    const userRoles = await prisma.userRole.findMany({
      where: { userId: id },
      select: {
        role: {
          select: {
            id: true,
            name: true,
            rolePermissions: {
              select: {
                permission: {
                  select: {
                    id: true,
                    module: true,
                    description: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    // Agrupar permisos únicos por módulo
    const permissionsMap = new Map<string, {
      id: string
      module: string
      description: string | null
      createdAt: Date
      roles: string[]
    }>()

    userRoles.forEach((userRole) => {
      userRole.role.rolePermissions.forEach((rp) => {
        const perm = rp.permission
        if (permissionsMap.has(perm.id)) {
          // Agregar el rol a la lista de roles que otorgan este permiso
          permissionsMap.get(perm.id)!.roles.push(userRole.role.name)
        } else {
          permissionsMap.set(perm.id, {
            id: perm.id,
            module: perm.module,
            description: perm.description,
            createdAt: perm.createdAt,
            roles: [userRole.role.name],
          })
        }
      })
    })

    // Convertir a array y agrupar por módulo
    const permissions = Array.from(permissionsMap.values())
    const groupedByModule = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = []
      }
      acc[perm.module].push({
        id: perm.id,
        module: perm.module,
        description: perm.description,
        createdAt: perm.createdAt,
        roles: perm.roles,
      })
      return acc
    }, {} as Record<string, typeof permissions>)

    return NextResponse.json({
      userId: id,
      permissions: groupedByModule,
      totalPermissions: permissions.length,
      totalRoles: userRoles.length,
    })
  } catch (error) {
    console.error("Error fetching user permissions:", error)
    return NextResponse.json(
      { error: "Error al obtener permisos del usuario" },
      { status: 500 }
    )
  }
}
