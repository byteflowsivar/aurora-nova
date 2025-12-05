import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma/connection"
import { z } from "zod"
import { requirePermission } from "@/lib/server/require-permission"
import { SYSTEM_PERMISSIONS } from "@/modules/admin/types/permissions"
import { UnauthenticatedError, PermissionDeniedError } from "@/lib/server/require-permission"
import { eventBus, SystemEvent } from "@/lib/events"
import { EventArea } from "@/lib/events/event-area"

const assignRoleSchema = z.object({
  roleId: z.string().uuid("ID de rol inválido"),
})

// GET /api/users/[id]/roles - Obtener roles del usuario
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.USER_READ)

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
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
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
    // Verificar permiso
    await requirePermission(SYSTEM_PERMISSIONS.USER_ASSIGN_ROLES)

    const session = await auth()

    const { id } = await params
    const body = await request.json()

    // Validar datos
    const validationResult = assignRoleSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { roleId } = validationResult.data

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

    // Verificar que el rol existe
    const role = await prisma.role.findUnique({
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
        createdBy: session?.user?.id || "",
      },
    })

    // Dispatch event for user role assignment audit
    await eventBus.dispatch(
      SystemEvent.USER_ROLE_ASSIGNED,
      {
        userId: id,
        roleId: roleId,
        roleName: role.name,
        assignedBy: session?.user?.id || 'system',
      },
      {
        userId: session?.user?.id,
        area: EventArea.ADMIN,
      }
    )

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
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
    await requirePermission(SYSTEM_PERMISSIONS.USER_ASSIGN_ROLES)
    const session = await auth()

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get("roleId")

    if (!roleId) {
      return NextResponse.json(
        { error: "roleId es requerido" },
        { status: 400 }
      )
    }

    // Obtener datos antes de eliminar para el evento
    const userRoleData = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: id,
          roleId: roleId,
        },
      },
      include: {
        user: true,
        role: true,
      },
    })

    if (!userRoleData) {
      return NextResponse.json(
        { error: "Asignación no encontrada" },
        { status: 404 }
      )
    }

    // Eliminar asignación
    await prisma.userRole.deleteMany({
      where: {
        userId: id,
        roleId: roleId,
      },
    })

    // Dispatch event for user role removal audit
    await eventBus.dispatch(
      SystemEvent.USER_ROLE_REMOVED,
      {
        userId: id,
        roleId: roleId,
        roleName: userRoleData.role.name,
        removedBy: session?.user?.id || 'system',
      },
      {
        userId: session?.user?.id,
        area: EventArea.ADMIN,
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
    console.error("Error removing role:", error)
    return NextResponse.json(
      { error: "Error al remover rol" },
      { status: 500 }
    )
  }
}
