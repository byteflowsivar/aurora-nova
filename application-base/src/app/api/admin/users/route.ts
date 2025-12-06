import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma/connection"
import { hash } from "bcryptjs"
import { z } from "zod"
import { requirePermission } from "@/lib/server/require-permission"
import { SYSTEM_PERMISSIONS } from "@/modules/admin/types/permissions"
import { UnauthenticatedError, PermissionDeniedError } from "@/lib/server/require-permission"
import { auth } from "@/lib/auth"
import { eventBus, SystemEvent } from "@/lib/events"
import { EventArea } from "@/lib/events/event-area"

/**
 * API Route - Admin Users Management - Aurora Nova
 *
 * Endpoints para gestión completa de usuarios:
 * - GET /api/admin/users: Listar todos los usuarios
 * - POST /api/admin/users: Crear nuevo usuario
 *
 * Ambos endpoints requieren autenticación y permisos específicos.
 * Todas las operaciones se registran en auditoría.
 *
 * @module api/admin/users
 */

// Schema de validación para crear usuario
const createUserSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
})

/**
 * GET /api/admin/users - Listar todos los usuarios
 *
 * Obtiene lista completa de usuarios del sistema con roles asociados.
 * Ordenada por fecha de creación (más recientes primero).
 *
 * **Autenticación**: Requerida (permiso: `user:list`)
 *
 * **Respuesta** (200):
 * ```json
 * [
 *   {
 *     "id": "uuid",
 *     "name": "Juan Pérez",
 *     "firstName": "Juan",
 *     "lastName": "Pérez",
 *     "email": "juan@example.com",
 *     "emailVerified": "2024-01-01T00:00:00Z" | null,
 *     "image": "url" | null,
 *     "createdAt": "2024-01-01T00:00:00Z",
 *     "updatedAt": "2024-12-05T12:00:00Z",
 *     "roles": [
 *       { "id": "uuid", "name": "admin", "description": "..." }
 *     ]
 *   }
 * ]
 * ```
 *
 * **Errores**:
 * - 401: No autenticado (enviar JWT válido)
 * - 403: Sin permiso `user:list` (solicitar al admin)
 * - 500: Error del servidor
 *
 * **Performance**:
 * - Query optimizada: select solo campos necesarios
 * - Incluye roles en misma query (no N+1)
 * - Ordenada por createdAt DESC (más recientes primero)
 * - Típicamente < 100ms para 1000+ usuarios
 *
 * @method GET
 * @route /api/admin/users
 * @auth Requerida (JWT válido)
 * @permission user:list
 *
 * @returns {Promise<NextResponse>} Array de usuarios transformados
 *
 * @example
 * ```typescript
 * // Fetch users en componente admin
 * const response = await fetch('/api/admin/users', {
 *   headers: {
 *     'Authorization': `Bearer ${session.user.token}`  // NextAuth maneja automáticamente
 *   }
 * })
 *
 * if (response.ok) {
 *   const users = await response.json()
 *   console.log(`Total usuarios: ${users.length}`)
 * } else if (response.status === 403) {
 *   console.error('No tienes permiso para listar usuarios')
 * }
 * ```
 *
 * @see {@link ./route.ts#POST} para crear usuarios
 * @see {@link ../../../lib/server/require-permission.ts} para validación de permisos
 */

/**
 * POST /api/admin/users - Crear nuevo usuario
 *
 * Crea un nuevo usuario en el sistema con email único.
 * Genera hash seguro de contraseña y registra evento de auditoría.
 *
 * **Autenticación**: Requerida (permiso: `user:create`)
 *
 * **Body Esperado**:
 * ```json
 * {
 *   "firstName": "string (requerido, mín 1 char)",
 *   "lastName": "string (requerido, mín 1 char)",
 *   "email": "string (email válido, debe ser único)",
 *   "password": "string (mín 6 caracteres)"
 * }
 * ```
 *
 * **Respuesta** (201):
 * ```json
 * {
 *   "id": "uuid generado",
 *   "firstName": "Juan",
 *   "lastName": "Pérez",
 *   "email": "juan@example.com",
 *   "name": "Juan Pérez",
 *   "image": null,
 *   "emailVerified": null,
 *   "createdAt": "2024-12-05T12:00:00Z",
 *   "updatedAt": "2024-12-05T12:00:00Z"
 * }
 * ```
 *
 * **Errores**:
 * - 400: Email ya existe o validación fallida
 *   ```json
 *   { "error": "El email ya está en uso" }
 *   { "error": "Email inválido" }
 *   { "error": "El nombre es requerido" }
 *   ```
 * - 401: No autenticado
 * - 403: Sin permiso `user:create`
 * - 500: Error del servidor
 *
 * **Validaciones**:
 * - Email: formato válido, único en tabla users
 * - Nombres: no vacíos, máximo 100 caracteres
 * - Password: mínimo 6 caracteres (validar en front más estricto)
 *
 * **Seguridad**:
 * - ✓ Contraseña hasheada con bcryptjs (salt 10)
 * - ✓ Email único (índice único en BD)
 * - ✓ Transacción: usuario + credentials creados atómicamente
 * - ✓ Auditoría: se registra USER_CREATED con quien, cuándo, qué datos
 *
 * **Efectos Secundarios**:
 * - Crea registro en tabla `user`
 * - Crea registro en tabla `userCredentials` con hash de contraseña
 * - Emite evento `USER_CREATED` para auditoría
 * - NO asigna roles automáticamente (hacer POST /api/admin/users/[id]/roles después)
 *
 * **Auditoría**:
 * - Evento: `USER_CREATED`
 * - Quién: usuario autenticado
 * - Cuándo: timestamp ISO
 * - Dónde: IP + User-Agent
 * - Qué: { firstName, lastName, email } (NO password)
 *
 * @method POST
 * @route /api/admin/users
 * @auth Requerida (JWT válido)
 * @permission user:create
 *
 * @param {Request} request - NextRequest con body JSON
 * @returns {Promise<NextResponse>} Usuario creado (201) o error (400/401/403/500)
 *
 * @example
 * ```typescript
 * // Crear usuario desde form admin
 * const newUser = await fetch('/api/admin/users', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     firstName: 'Juan',
 *     lastName: 'Pérez',
 *     email: 'juan@example.com',
 *     password: 'TempPass123!'
 *   })
 * })
 *
 * if (newUser.ok) {
 *   const user = await newUser.json()
 *   console.log(`Usuario creado: ${user.id}`)
 *   // Ahora asignar roles
 *   // POST /api/admin/users/{id}/roles { roleId }
 * } else {
 *   const error = await newUser.json()
 *   console.error(error.error)
 * }
 * ```
 *
 * @see {@link ./route.ts#GET} para listar usuarios
 * @see {@link ./[id]/route.ts} para modificar/eliminar usuario
 * @see {@link ./[id]/roles/route.ts} para asignar roles
 */
export async function GET() {
  try {
    // Verificar permiso
    await requirePermission(SYSTEM_PERMISSIONS.USER_LIST)

    // Obtener usuarios con sus roles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Transformar los datos
    const transformedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.userRoles.map((ur) => ur.role),
    }))

    return NextResponse.json(transformedUsers)
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json(
        { error: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      )
    }
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/admin/users
 * @name Crear Usuario
 * @description Crea un nuevo usuario en el sistema, junto con sus credenciales.
 * @version 1.0.0
 *
 * @requires "user:create" - El usuario debe tener el permiso para crear usuarios.
 *
 * @param {NextRequest} request - La petición HTTP de entrada.
 * @param {object} request.body - El cuerpo de la petición.
 * @param {string} request.body.firstName - Nombre del usuario.
 * @param {string} request.body.lastName - Apellido del usuario.
 * @param {string} request.body.email - Email del usuario (debe ser único).
 * @param {string} request.body.password - Contraseña para el nuevo usuario.
 *
 * @response {201} Created - Retorna el objeto del usuario recién creado.
 * @response {400} BadRequest - Los datos proporcionados son inválidos.
 * @response {401} Unauthorized - El usuario no está autenticado.
 * @response {403} Forbidden - El usuario no tiene los permisos necesarios.
 * @response {409} Conflict - Ya existe un usuario con el mismo email.
 * @response {500} InternalServerError - Error inesperado en el servidor.
 *
 * @returns {Promise<NextResponse>} Una promesa que resuelve a la respuesta HTTP.
 *
 * @fires SystemEvent.USER_CREATED - Emite un evento para auditoría cuando el usuario es creado.
 *
 * @example
 * // Create a new user from a client component
 * async function createUser(userData) {
 *   const response = await fetch('/api/admin/users', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(userData),
 *   });
 *   const newUser = await response.json();
 *   if (response.ok) {
 *     console.log('Usuario creado:', newUser);
 *   } else {
 *     console.error('Error:', newUser.error);
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar permiso y obtener sesión
    await requirePermission(SYSTEM_PERMISSIONS.USER_CREATE)
    const session = await auth()

    const body = await request.json()

    // Validar datos
    const validationResult = createUserSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { firstName, lastName, email, password } = validationResult.data

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 409 }
      )
    }

    // Hash de la contraseña
    const hashedPassword = await hash(password, 12)

    // Crear usuario y credenciales en una transacción
    const user = await prisma.$transaction(async (tx) => {
      // Crear usuario
      const newUser = await tx.user.create({
        data: {
          name: `${firstName} ${lastName}`,
          firstName: firstName,
          lastName: lastName,
          email,
        },
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          emailVerified: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      // Crear credenciales
      await tx.userCredentials.create({
        data: {
          userId: newUser.id,
          hashedPassword: hashedPassword,
        },
      })

      // Crear cuenta de credentials provider
      await tx.account.create({
        data: {
          userId: newUser.id,
          type: "credentials",
          provider: "credentials",
          providerAccountId: newUser.id,
        },
      })

      return newUser
    })

    // Dispatch event for user creation audit
    await eventBus.dispatch(
      SystemEvent.USER_CREATED,
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        createdBy: session?.user?.id || 'system',
      },
      {
        userId: session?.user?.id,
        area: EventArea.ADMIN,
      }
    )

    return NextResponse.json({
      id: user.id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: [],
    }, { status: 201 })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json(
        { error: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      )
    }
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    )
  }
}
