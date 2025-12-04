import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma/connection"
import { z } from "zod"
import { requirePermission } from "@/lib/server/require-permission"
import { SYSTEM_PERMISSIONS } from "@/modules/admin/types/permissions"
import { UnauthenticatedError, PermissionDeniedError } from "@/lib/server/require-permission"

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
    await requirePermission(SYSTEM_PERMISSIONS.ROLE_READ)

    const { id } = await params

    const role = await prisma.role.findUnique({
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
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
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
    await requirePermission(SYSTEM_PERMISSIONS.ROLE_UPDATE)

    const { id } = await params
    const body = await request.json()

    // Validar datos
    const validationResult = updateRoleSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { name, description } = validationResult.data

    // Verificar que el rol existe
    const existingRole = await prisma.role.findUnique({
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
      const nameInUse = await prisma.role.findFirst({
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
    const updatedRole = await prisma.role.update({
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
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
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
    await requirePermission(SYSTEM_PERMISSIONS.ROLE_DELETE)

    const { id } = await params

    // Verificar que el rol existe
    const role = await prisma.role.findUnique({
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
    await prisma.role.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
    console.error("Error deleting role:", error)
    return NextResponse.json(
      { error: "Error al eliminar rol" },
      { status: 500 }
    )
  }
}
