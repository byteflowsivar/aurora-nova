import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma/connection"
import { z } from "zod"
import { requirePermission } from "@/lib/server/require-permission"
import { SYSTEM_PERMISSIONS } from "@/modules/admin/types/permissions"
import { UnauthenticatedError, PermissionDeniedError } from "@/lib/server/require-permission"
import { auth } from "@/lib/auth"
import { eventBus, SystemEvent } from "@/lib/events"
import { EventArea } from "@/lib/events/event-area"

const createRoleSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(50, "El nombre debe tener máximo 50 caracteres"),
  description: z.string().optional().nullable(),
})

/**
 * GET /api/admin/roles - Listar todos los roles del sistema
 *
 * Obtiene lista completa de roles con información de cada uno.
 * Incluye conteo de permisos y usuarios asociados a cada rol.
 * Ordenada por fecha de creación (más recientes primero).
 *
 * **Autenticación**: Requerida (permiso: `role:list`)
 *
 * **Respuesta** (200):
 * ```json
 * [
 *   {
 *     "id": "uuid",
 *     "name": "admin",
 *     "description": "Administrador del sistema",
 *     "createdAt": "2024-01-01T00:00:00Z",
 *     "updatedAt": "2024-12-05T12:00:00Z",
 *     "permissionsCount": 25,
 *     "usersCount": 3
 *   },
 *   {
 *     "id": "uuid",
 *     "name": "editor",
 *     "description": "Editor de contenidos",
 *     "createdAt": "2024-01-02T00:00:00Z",
 *     "updatedAt": "2024-12-04T12:00:00Z",
 *     "permissionsCount": 8,
 *     "usersCount": 5
 *   }
 * ]
 * ```
 *
 * **Errores**:
 * - 401: No autenticado (enviar JWT válido)
 * - 403: Sin permiso `role:list` (solicitar al admin)
 * - 500: Error del servidor
 *
 * **Performance**:
 * - Query optimizada con _count para permissionsCount y usersCount
 * - Select específico de campos necesarios
 * - Típicamente < 100ms incluso con 100+ roles
 *
 * **Campos Retornados**:
 * - `id`: UUID único del rol
 * - `name`: Nombre del rol (único)
 * - `description`: Descripción opcional
 * - `createdAt`: Timestamp de creación
 * - `updatedAt`: Timestamp de última actualización
 * - `permissionsCount`: Cantidad de permisos asignados a este rol
 * - `usersCount`: Cantidad de usuarios con este rol
 *
 * @method GET
 * @route /api/admin/roles
 * @auth Requerida (JWT válido)
 * @permission role:list
 *
 * @param {NextRequest} request - NextRequest HTTP (sin parámetros)
 * @returns {Promise<NextResponse>} Array de roles con conteos
 *
 * @example
 * ```typescript
 * // Obtener lista de roles
 * const response = await fetch('/api/admin/roles', {
 *   headers: {
 *     'Authorization': `Bearer ${session.user.token}`
 *   }
 * })
 *
 * if (response.ok) {
 *   const roles = await response.json()
 *   console.log(`Total roles: ${roles.length}`)
 *   roles.forEach(r => {
 *     console.log(`${r.name}: ${r.permissionsCount} permisos, ${r.usersCount} usuarios`)
 *   })
 * }
 * ```
 *
 * @see {@link ./route.ts#POST} para crear nuevo rol
 * @see {@link ./[id]/route.ts} para actualizar/eliminar rol específico
 */
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

/**
 * POST /api/admin/roles - Crear nuevo rol
 *
 * Crea un nuevo rol en el sistema con nombre único.
 * El rol se crea sin permisos (asignarlos luego en /api/admin/roles/:id/permissions).
 * Genera evento de auditoría ROLE_CREATED.
 *
 * **Autenticación**: Requerida (permiso: `role:create`)
 *
 * **Body Esperado**:
 * ```json
 * {
 *   "name": "string (requerido, 1-50 chars, debe ser único)",
 *   "description": "string (opcional, null permitido)"
 * }
 * ```
 *
 * **Respuesta** (201):
 * ```json
 * {
 *   "id": "uuid",
 *   "name": "editor",
 *   "description": "Editor de contenidos",
 *   "createdAt": "2024-12-05T12:00:00Z",
 *   "updatedAt": "2024-12-05T12:00:00Z",
 *   "permissionsCount": 0,
 *   "usersCount": 0
 * }
 * ```
 *
 * **Errores**:
 * - 400: Datos inválidos (nombre vacío, > 50 chars)
 *   - Validación: name.min(1), name.max(50)
 *   - Validación: description es opcional
 * - 401: No autenticado (enviar JWT válido)
 * - 403: Sin permiso `role:create` (solicitar al admin)
 * - 409: Ya existe rol con este nombre (duplicado)
 * - 500: Error del servidor
 *
 * **Validaciones**:
 * - name: requerido, 1-50 caracteres, debe ser único
 * - description: opcional, puede ser null
 *
 * **Lógica**:
 * 1. Valida permiso `role:create`
 * 2. Valida datos con Zod schema
 * 3. Verifica que nombre es único (409 si duplicado)
 * 4. Crea rol en BD
 * 5. Emite evento ROLE_CREATED para auditoría
 *
 * **Efectos Secundarios**:
 * - Crea registro en tabla `role`
 * - Rol se crea sin permisos (permissionsCount = 0)
 * - Rol se crea sin usuarios asignados (usersCount = 0)
 * - Emite evento para auditoría (quién creó, cuándo, qué)
 * - NO asigna automáticamente permisos (hacer POST /roles/:id/permissions después)
 *
 * **Auditoría**:
 * - Evento: `ROLE_CREATED`
 * - Quién: usuario autenticado (session.user.id)
 * - Cuándo: timestamp ISO
 * - Qué: roleId, name, description, createdBy
 *
 * @method POST
 * @route /api/admin/roles
 * @auth Requerida (JWT válido)
 * @permission role:create
 *
 * @param {NextRequest} request - NextRequest con body JSON
 * @returns {Promise<NextResponse>} Rol creado (201) o error
 *
 * @example
 * ```typescript
 * // Crear nuevo rol "moderator"
 * const response = await fetch('/api/admin/roles', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': `Bearer ${session.user.token}`
 *   },
 *   body: JSON.stringify({
 *     name: 'moderator',
 *     description: 'Moderador de contenidos'
 *   })
 * })
 *
 * if (response.status === 201) {
 *   const newRole = await response.json()
 *   console.log(`Rol creado: ${newRole.id}`)
 *   // Ahora asignar permisos: POST /api/admin/roles/:id/permissions
 * } else if (response.status === 409) {
 *   console.error('Ya existe un rol con ese nombre')
 * }
 * ```
 *
 * @see {@link ./route.ts#GET} para listar roles
 * @see {@link ./[id]/route.ts} para actualizar/eliminar rol
 * @see {@link ./[id]/permissions/route.ts} para asignar permisos al rol
 */
export async function POST(request: NextRequest) {
  try {
    await requirePermission(SYSTEM_PERMISSIONS.ROLE_CREATE)
    const session = await auth()

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

    // Dispatch event for role creation audit
    await eventBus.dispatch(
      SystemEvent.ROLE_CREATED,
      {
        roleId: role.id,
        name: role.name,
        description: role.description,
        createdBy: session?.user?.id || 'system',
      },
      {
        userId: session?.user?.id,
        area: EventArea.ADMIN,
      }
    )

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
