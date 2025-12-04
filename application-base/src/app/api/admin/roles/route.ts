import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma/connection"
import { z } from "zod"
import { requirePermission } from "@/lib/server/require-permission"
import { SYSTEM_PERMISSIONS } from "@/modules/admin/types/permissions"
import { UnauthenticatedError, PermissionDeniedError } from "@/lib/server/require-permission"

const createRoleSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(50, "El nombre debe tener máximo 50 caracteres"),
  description: z.string().optional().nullable(),
})

// GET /api/roles - Listar roles
export async function GET() {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.ROLE_LIST)

    const roles = await prisma.role.findMany({
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
      orderBy: {
        createdAt: "desc",
      },
    })

    const transformedRoles = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissionsCount: role._count.rolePermissions,
      usersCount: role._count.userRoles,
    }))

    return NextResponse.json(transformedRoles)
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
    console.error("Error fetching roles:", error)
    return NextResponse.json(
      { error: "Error al obtener roles" },
      { status: 500 }
    )
  }
}

// POST /api/roles - Crear rol
export async function POST(request: NextRequest) {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.ROLE_CREATE)

    const body = await request.json()

    // Validar datos
    const validationResult = createRoleSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { name, description } = validationResult.data

    // Verificar si el nombre ya existe
    const existingRole = await prisma.role.findFirst({
      where: { name },
    })

    if (existingRole) {
      return NextResponse.json(
        { error: "Ya existe un rol con este nombre" },
        { status: 409 }
      )
    }

    // Crear rol
    const role = await prisma.role.create({
      data: {
        name,
        description,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissionsCount: 0,
      usersCount: 0,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }
    console.error("Error creating role:", error)
    return NextResponse.json(
      { error: "Error al crear rol" },
      { status: 500 }
    )
  }
}
