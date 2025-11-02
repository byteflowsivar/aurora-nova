import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma/connection"
import { z } from "zod"

const assignRoleSchema = z.object({
  roleId: z.string().uuid("ID de rol inválido"),
})

// GET /api/users/[id]/roles - Obtener roles del usuario
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

    const userRoles = await prisma.userRole.findMany({
      where: { userId: id },
      select: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        createdAt: true,
      },
    })

    return NextResponse.json(userRoles.map((ur) => ({
      ...ur.role,
      assignedAt: ur.createdAt,
    })))
  } catch (error) {
    console.error("Error fetching user roles:", error)
    return NextResponse.json(
      { error: "Error al obtener roles del usuario" },
      { status: 500 }
    )
  }
}

// POST /api/users/[id]/roles - Asignar rol a usuario
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
    const validationResult = assignRoleSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { roleId } = validationResult.data

    // Verificar que el usuario existe
    const user = await prisma.User.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Verificar que el rol existe
    const role = await prisma.Role.findUnique({
      where: { id: roleId },
    })

    if (!role) {
      return NextResponse.json(
        { error: "Rol no encontrado" },
        { status: 404 }
      )
    }

    // Verificar si ya tiene el rol
    const existingAssignment = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: id,
          roleId: roleId,
        },
      },
    })

    if (existingAssignment) {
      return NextResponse.json(
        { error: "El usuario ya tiene este rol asignado" },
        { status: 409 }
      )
    }

    // Asignar rol
    await prisma.userRole.create({
      data: {
        userId: id,
        roleId: roleId,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("Error assigning role:", error)
    return NextResponse.json(
      { error: "Error al asignar rol" },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id]/roles - Remover rol de usuario
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
    const roleId = searchParams.get("roleId")

    if (!roleId) {
      return NextResponse.json(
        { error: "roleId es requerido" },
        { status: 400 }
      )
    }

    // Eliminar asignación
    const deleted = await prisma.userRole.deleteMany({
      where: {
        userId: id,
        roleId: roleId,
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
    console.error("Error removing role:", error)
    return NextResponse.json(
      { error: "Error al remover rol" },
      { status: 500 }
    )
  }
}
