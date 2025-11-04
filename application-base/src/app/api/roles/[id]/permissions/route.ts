import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma/connection"
import { z } from "zod"

const assignPermissionSchema = z.object({
  permissionId: z.string().min(1, "ID de permiso inválido"),
})

// GET /api/roles/[id]/permissions - Obtener permisos del rol
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

    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId: id },
      select: {
        permission: {
          select: {
            id: true,
            module: true,
            description: true,
            createdAt: true,
          },
        },
        createdAt: true,
      },
    })

    return NextResponse.json(rolePermissions.map((rp) => ({
      ...rp.permission,
      assignedAt: rp.createdAt,
    })))
  } catch (error) {
    console.error("Error fetching role permissions:", error)
    return NextResponse.json(
      { error: "Error al obtener permisos del rol" },
      { status: 500 }
    )
  }
}

// POST /api/roles/[id]/permissions - Asignar permiso a rol
export async function POST(
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
    const validationResult = assignPermissionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { permissionId } = validationResult.data

    // Verificar que el rol existe
    const role = await prisma.role.findUnique({
      where: { id },
    })

    if (!role) {
      return NextResponse.json(
        { error: "Rol no encontrado" },
        { status: 404 }
      )
    }

    // Verificar que el permiso existe
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
    })

    if (!permission) {
      return NextResponse.json(
        { error: "Permiso no encontrado" },
        { status: 404 }
      )
    }

    // Verificar si ya tiene el permiso
    const existingAssignment = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: id,
          permissionId: permissionId,
        },
      },
    })

    if (existingAssignment) {
      return NextResponse.json(
        { error: "El rol ya tiene este permiso asignado" },
        { status: 409 }
      )
    }

    // Asignar permiso
    await prisma.rolePermission.create({
      data: {
        roleId: id,
        permissionId: permissionId,
      },
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("Error assigning permission:", error)
    return NextResponse.json(
      { error: "Error al asignar permiso" },
      { status: 500 }
    )
  }
}

// DELETE /api/roles/[id]/permissions - Remover permiso de rol
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
    const { searchParams } = new URL(request.url)
    const permissionId = searchParams.get("permissionId")

    if (!permissionId) {
      return NextResponse.json(
        { error: "permissionId es requerido" },
        { status: 400 }
      )
    }

    // Eliminar asignación
    const deleted = await prisma.rolePermission.deleteMany({
      where: {
        roleId: id,
        permissionId: permissionId,
      },
    })

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Asignación no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing permission:", error)
    return NextResponse.json(
      { error: "Error al remover permiso" },
      { status: 500 }
    )
  }
}
