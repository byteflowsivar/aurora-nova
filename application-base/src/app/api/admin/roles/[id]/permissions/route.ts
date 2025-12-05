import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma/connection"
import { z } from "zod"
import { requirePermission } from "@/lib/server/require-permission"
import { SYSTEM_PERMISSIONS } from "@/modules/admin/types/permissions"
import { UnauthenticatedError, PermissionDeniedError } from "@/lib/server/require-permission"
import { auth } from "@/lib/auth"
import { eventBus, SystemEvent } from "@/lib/events"
import { EventArea } from "@/lib/events/event-area"

const assignPermissionSchema = z.object({
  permissionId: z.string().min(1, "ID de permiso inválido"),
})

// GET /api/roles/[id]/permissions - Obtener permisos del rol
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.ROLE_READ)

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
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
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
    await requirePermission(SYSTEM_PERMISSIONS.ROLE_ASSIGN_PERMISSIONS)
    const session = await auth()

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

    // Dispatch event for role permission assignment audit
    await eventBus.dispatch(
      SystemEvent.ROLE_PERMISSION_ASSIGNED,
      {
        roleId: id,
        roleName: role.name,
        permissionId: permissionId,
        permissionName: permission.module,
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
    await requirePermission(SYSTEM_PERMISSIONS.ROLE_ASSIGN_PERMISSIONS)
    const session = await auth()

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const permissionId = searchParams.get("permissionId")

    if (!permissionId) {
      return NextResponse.json(
        { error: "permissionId es requerido" },
        { status: 400 }
      )
    }

    // Obtener datos antes de eliminar para el evento
    const rolePermissionData = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: id,
          permissionId: permissionId,
        },
      },
      include: {
        role: true,
        permission: true,
      },
    })

    if (!rolePermissionData) {
      return NextResponse.json(
        { error: "Asignación no encontrada" },
        { status: 404 }
      )
    }

    // Eliminar asignación
    await prisma.rolePermission.deleteMany({
      where: {
        roleId: id,
        permissionId: permissionId,
      },
    })

    // Dispatch event for role permission removal audit
    await eventBus.dispatch(
      SystemEvent.ROLE_PERMISSION_REMOVED,
      {
        roleId: id,
        roleName: rolePermissionData.role.name,
        permissionId: permissionId,
        permissionName: rolePermissionData.permission.module,
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
    console.error("Error removing permission:", error)
    return NextResponse.json(
      { error: "Error al remover permiso" },
      { status: 500 }
    )
  }
}
