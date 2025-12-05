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

// Schema de validación para crear usuario
const createUserSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
})

/**
 * @api {get} /api/admin/users
 * @name Listar Usuarios
 * @description Obtiene una lista de todos los usuarios del sistema, incluyendo sus roles.
 * @version 1.0.0
 *
 * @requires "user:list" - El usuario debe tener el permiso para listar usuarios.
 *
 * @response {200} Success - Retorna un array de objetos de usuario.
 * @response {401} Unauthorized - El usuario no está autenticado.
 * @response {403} Forbidden - El usuario no tiene los permisos necesarios.
 * @response {500} InternalServerError - Error inesperado en el servidor.
 *
 * @returns {Promise<NextResponse>} Una promesa que resuelve a la respuesta HTTP.
 *
 * @property {object[]} response.body - Array de usuarios.
 * @property {string} response.body.id - ID del usuario.
 * @property {string} response.body.name - Nombre completo del usuario.
 * @property {string} response.body.email - Email del usuario.
 * @property {Date|null} response.body.emailVerified - Fecha de verificación del email.
 * @property {object[]} response.body.roles - Array de roles asignados al usuario.
 *
 * @example
 * // Fetch users from a client component
 * async function fetchUsers() {
 *   const response = await fetch('/api/admin/users');
 *   const users = await response.json();
 *   console.log(users);
 * }
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
