import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma/connection"
import { z } from "zod"

const updateRoleSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(50, "El nombre debe tener máximo 50 caracteres").optional(),
  description: z.string().optional().nullable(),
})

// GET /api/roles/[id] - Obtener rol por ID
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

    const role = await prisma.Role.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        rolePermissions: {
          select: {
            permission: {
              select: {
                id: true,
                module: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    })

    if (!role) {
      return NextResponse.json(
        { error: "Rol no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map((rp) => rp.permission),
      usersCount: role._count.userRoles,
    })
  } catch (error) {
    console.error("Error fetching role:", error)
    return NextResponse.json(
      { error: "Error al obtener rol" },
      { status: 500 }
    )
  }
}

// PUT /api/roles/[id] - Actualizar rol
export async function PUT(
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
    const body = await request.json()

    // Validar datos
    const validationResult = updateRoleSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { name, description } = validationResult.data

    // Verificar que el rol existe
    const existingRole = await prisma.Role.findUnique({
      where: { id },
    })

    if (!existingRole) {
      return NextResponse.json(
        { error: "Rol no encontrado" },
        { status: 404 }
      )
    }

    // Si se está actualizando el nombre, verificar que no esté en uso
    if (name && name !== existingRole.name) {
      const nameInUse = await prisma.Role.findFirst({
        where: { name },
      })

      if (nameInUse) {
        return NextResponse.json(
          { error: "Ya existe un rol con este nombre" },
          { status: 409 }
        )
      }
    }

    // Actualizar rol
    const updatedRole = await prisma.Role.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            rolePermissions: true,
            userRoles: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: updatedRole.id,
      name: updatedRole.name,
      description: updatedRole.description,
      createdAt: updatedRole.createdAt,
      updatedAt: updatedRole.updatedAt,
      permissionsCount: updatedRole._count.rolePermissions,
      usersCount: updatedRole._count.userRoles,
    })
  } catch (error) {
    console.error("Error updating role:", error)
    return NextResponse.json(
      { error: "Error al actualizar rol" },
      { status: 500 }
    )
  }
}

// DELETE /api/roles/[id] - Eliminar rol
export async function DELETE(
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

    // Verificar que el rol existe
    const role = await prisma.Role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    })

    if (!role) {
      return NextResponse.json(
        { error: "Rol no encontrado" },
        { status: 404 }
      )
    }

    // No permitir eliminar rol si tiene usuarios asignados
    if (role._count.userRoles > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar el rol porque tiene ${role._count.userRoles} usuario(s) asignado(s)` },
        { status: 400 }
      )
    }

    // Eliminar rol (cascade eliminará rolePermissions)
    await prisma.Role.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting role:", error)
    return NextResponse.json(
      { error: "Error al eliminar rol" },
      { status: 500 }
    )
  }
}
