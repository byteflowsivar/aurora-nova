/**
 * Server Actions para autenticación - Sistema Híbrido JWT + Database
 * Aurora Nova - Módulo Auth
 *
 * Este módulo implementa server actions para autenticación con sistema híbrido:
 * - Login: Crea JWT + registro en tabla session con IP y UserAgent
 * - Logout: Elimina registro de session (invalida sesión)
 */

"use server"

import { signIn, signOut, auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma/connection"
import { deleteSession } from "@/lib/prisma/session-queries"
import {
  loginSchema,
  type LoginInput,
} from "@/lib/validations/auth"
import type { ActionResponse } from "@/types/action-response"
import { successResponse, errorResponse } from "@/types/action-response"
import { AuthError } from "next-auth"
import { z } from "zod"
import { headers } from "next/headers"
import logger from "@/lib/logger";

// ============================================================================
// TIPOS
// ============================================================================

type LoginResponse = {
  success: boolean
  redirectUrl?: string
}

// ============================================================================
// REGISTRO DE USUARIOS
// ============================================================================

/**
 * Registrar nuevo usuario en el sistema
 *
 * @param input - Datos del usuario a registrar
 * @returns Respuesta con datos del usuario creado o error
 *
 * @example
 * ```ts
 * const result = await registerUser({
 *   email: "usuario@example.com",
 *   password: "Password123",
 *   confirmPassword: "Password123",
 *   firstName: "Juan",
 *   lastName: "Pérez"
 * })
 *
 * if (result.success) {
 *   console.log("Usuario creado:", result.data.userId)
 * }
 * ```
 */
export async function registerUser(
  values: z.infer<typeof RegisterSchema>
): Promise<ActionResponse<{ userId: string; firstName: string | null; lastName: string | null; }>> {
  logger.info('Starting user registration');
  const validatedFields = RegisterSchema.safeParse(values);

  if (!validatedFields.success) {
    logger.error('Invalid registration fields');
    return {
      success: false,
      error: "Campos inválidos",
    };
  }

  const { email, password, firstName, lastName } = validatedFields.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logger.warn(`Registration attempt for existing email: ${email}`);
      return {
        success: false,
        error: "El correo electrónico ya está en uso",
      };
    }

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        email,
        firstName,
        lastName,
        credentials: {
          create: {
            hashedPassword,
          },
        },
      },
    });

    logger.info(`User registered successfully: ${user.id}`);
    return {
      success: true,
      data: {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  } catch (error) {
    logger.error(error, 'Error during user registration');
    return {
      success: false,
      error: "Ocurrió un error al registrar el usuario",
    };
  }
}

// ============================================================================
// LOGIN DE USUARIOS
// ============================================================================

/**
 * Iniciar sesión con credenciales - Sistema Híbrido
 *
 * Este action implementa el sistema híbrido de autenticación:
 * 1. Valida credenciales del usuario
 * 2. Crea JWT para autenticación (via Auth.js)
 * 3. Crea registro en tabla session con IP y UserAgent (via callback JWT)
 *
 * @param input - Credenciales del usuario (email y password)
 * @returns Respuesta con resultado del login
 *
 * @example
 * ```ts
 * const result = await loginUser({
 *   email: "usuario@example.com",
 *   password: "Password123"
 * })
 *
 * if (result.success) {
 *   // Redirigir al dashboard
 *   redirect(result.data.redirectUrl || "/dashboard")
 * }
 * ```
 */
export async function loginUser(
  input: LoginInput
): Promise<ActionResponse<LoginResponse>> {
  try {
    // Validar datos de entrada
    const validatedData = loginSchema.parse(input)

    // Obtener información del request para el sistema híbrido
    const headersList = await headers()
    const ipAddress = headersList.get("x-forwarded-for") ||
                     headersList.get("x-real-ip") ||
                     "unknown"
    const userAgent = headersList.get("user-agent") || "unknown"

    // Intentar login con Auth.js + metadata para sistema híbrido
    // Los campos ipAddress y userAgent se pasan al authorize callback
    // que los incluye en el user object, y el JWT callback los usa para crear la sesión
    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      ipAddress,
      userAgent,
      redirect: false,
    })

    // El signIn de Auth.js lanza una excepción si falla
    // Si llegamos aquí, el login fue exitoso y la sesión fue creada en BD (ver auth.ts callback)
    return successResponse(
      {
        success: true,
        redirectUrl: "/dashboard",
      },
      "Sesión iniciada exitosamente"
    )
  } catch (error) {
    // Errores de validación de Zod
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string[]> = {}

      error.issues.forEach((err) => {
        const path = err.path.join(".")
        if (!fieldErrors[path]) {
          fieldErrors[path] = []
        }
        fieldErrors[path].push(err.message)
      })

      return errorResponse("Error de validación", fieldErrors)
    }

    // Errores de Auth.js
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return errorResponse("Email o contraseña incorrectos")
        default:
          console.error("AuthError en loginUser:", error)
          return errorResponse("Error al iniciar sesión")
      }
    }

    // Error genérico
    console.error("Error desconocido en loginUser:", error)
    return errorResponse("Error al iniciar sesión")
  }
}

// ============================================================================
// LOGOUT DE USUARIOS
// ============================================================================

/**
 * Cerrar sesión del usuario actual - Sistema Híbrido
 *
 * Este action implementa logout con sistema híbrido:
 * 1. Obtiene el sessionToken de la sesión actual
 * 2. Elimina el registro de tabla session (invalida sesión en BD)
 * 3. Cierra la sesión JWT (via Auth.js)
 *
 * @returns Respuesta con resultado del logout
 *
 * @example
 * ```ts
 * const result = await logoutUser()
 *
 * if (result.success) {
 *   // Redirigir al login
 *   redirect("/auth/signin")
 * }
 * ```
 */
export async function logoutUser(): Promise<ActionResponse<void>> {
  try {
    // 1. Obtener sesión actual para extraer sessionToken
    const session = await auth()

    // 2. Si existe sessionToken, eliminar de BD (sistema híbrido)
    if (session && (session as any).sessionToken) {
      const sessionToken = (session as any).sessionToken as string

      try {
        const deleted = await deleteSession(sessionToken)
        if (deleted) {
          console.log(`Sesión ${sessionToken} eliminada de BD`)
        } else {
          console.warn(`Sesión ${sessionToken} no encontrada en BD`)
        }
      } catch (dbError) {
        // Si falla la eliminación en BD, solo logear pero continuar con logout
        console.error("Error al eliminar sesión de BD:", dbError)
      }
    }

    // 3. Cerrar sesión JWT (elimina cookie)
    await signOut({ redirect: false })

    return successResponse(undefined, "Sesión cerrada exitosamente")
  } catch (error) {
    console.error("Error en logoutUser:", error)
    return errorResponse("Error al cerrar sesión")
  }
}
