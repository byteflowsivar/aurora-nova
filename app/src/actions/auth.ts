/**
 * Server Actions para autenticación
 * Aurora Nova - Módulo Auth
 */

"use server"

import { signIn, signOut } from "@/lib/auth"
import { prisma } from "@/lib/prisma/connection"
import { createUserWithCredentials } from "@/lib/auth-utils"
import { getRoleByName } from "@/lib/prisma/queries"
import {
  registerSchema,
  loginSchema,
  type RegisterInput,
  type LoginInput,
} from "@/lib/validations/auth"
import type { ActionResponse } from "@/types/action-response"
import { successResponse, errorResponse } from "@/types/action-response"
import { AuthError } from "next-auth"
import { z } from "zod"

// ============================================================================
// TIPOS
// ============================================================================

type RegisterResponse = {
  userId: string
  email: string
  firstName: string
  lastName: string
}

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
  input: RegisterInput
): Promise<ActionResponse<RegisterResponse>> {
  try {
    // Validar datos de entrada
    const validatedData = registerSchema.parse(input)

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return errorResponse("Este email ya está registrado")
    }

    // Crear usuario con credenciales
    const user = await createUserWithCredentials({
      email: validatedData.email,
      password: validatedData.password,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      name: `${validatedData.firstName} ${validatedData.lastName}`,
    })

    // Obtener el rol "Usuario" (rol básico por defecto)
    const defaultRole = await getRoleByName("Usuario")

    if (!defaultRole) {
      // Si no existe el rol "Usuario", logeamos el error pero no fallamos el registro
      console.error(
        'ADVERTENCIA: No se encontró el rol "Usuario" en la base de datos. El usuario fue creado sin rol asignado.'
      )
    } else {
      // Asignar rol básico al usuario
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: defaultRole.id,
          createdBy: user.id, // Auto-asignado durante registro
        },
      })
    }

    return successResponse(
      {
        userId: user.id,
        email: user.email,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      },
      "Usuario registrado exitosamente"
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

    // Errores de base de datos
    if (error instanceof Error) {
      // Error de email duplicado (por si acaso)
      if (error.message.includes("unique constraint")) {
        return errorResponse("Este email ya está registrado")
      }

      console.error("Error en registerUser:", error)
      return errorResponse(`Error al registrar usuario: ${error.message}`)
    }

    // Error genérico
    console.error("Error desconocido en registerUser:", error)
    return errorResponse("Error desconocido al registrar usuario")
  }
}

// ============================================================================
// LOGIN DE USUARIOS
// ============================================================================

/**
 * Iniciar sesión con credenciales
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

    // Intentar login con Auth.js
    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    })

    // El signIn de Auth.js lanza una excepción si falla
    // Si llegamos aquí, el login fue exitoso
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
 * Cerrar sesión del usuario actual
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
    await signOut({ redirect: false })

    return successResponse(undefined, "Sesión cerrada exitosamente")
  } catch (error) {
    console.error("Error en logoutUser:", error)
    return errorResponse("Error al cerrar sesión")
  }
}
