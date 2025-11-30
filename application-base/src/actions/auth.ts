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
  registerSchema,
} from "@/lib/validations/auth"
import type { ActionResponse } from "@/types/action-response"
import { successResponse, errorResponse } from "@/types/action-response"
import { AuthError } from "next-auth"
import { z } from "zod"
import { headers } from "next/headers"
import { hash } from "bcryptjs"
import { structuredLogger } from "@/lib/logger/structured-logger"
import { getLogContext, enrichContext } from "@/lib/logger/helpers"

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
  values: z.infer<typeof registerSchema>
): Promise<ActionResponse<{ userId: string; firstName: string | null; lastName: string | null; email: string; }>> {
  const context = await getLogContext('auth', 'register');

  structuredLogger.info('Starting user registration', context);

  const validatedFields = registerSchema.safeParse(values);

  if (!validatedFields.success) {
    structuredLogger.warn('Invalid registration fields', {
      ...context,
      metadata: {
        errors: validatedFields.error.issues.map(i => i.message),
      },
    });
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
      structuredLogger.warn('Registration attempt for existing email',
        enrichContext(context, { email })
      );
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

    structuredLogger.info('User registered successfully',
      enrichContext(context, {
        userId: user.id,
        email: user.email,
      })
    );

    return {
      success: true,
      data: {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    };
  } catch (error) {
    structuredLogger.error('Error during user registration', error as Error, context);
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
  const context = await getLogContext('auth', 'login');

  structuredLogger.info('Login attempt started',
    enrichContext(context, { email: input.email })
  );

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
    await structuredLogger.measure(
      async () => {
        await signIn("credentials", {
          email: validatedData.email,
          password: validatedData.password,
          ipAddress,
          userAgent,
          redirect: false,
        });
      },
      enrichContext(context, {
        email: validatedData.email,
        ipAddress,
      })
    );

    // El signIn de Auth.js lanza una excepción si falla
    // Si llegamos aquí, el login fue exitoso y la sesión fue creada en BD (ver auth.ts callback)
    structuredLogger.info('Login successful',
      enrichContext(context, {
        email: validatedData.email,
        ipAddress,
      })
    );

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
      structuredLogger.warn('Login validation failed',
        enrichContext(context, {
          email: input.email,
          errors: error.issues.map(i => i.message),
        })
      );

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
      structuredLogger.warn('Login authentication failed',
        enrichContext(context, {
          email: input.email,
          errorType: error.type,
        })
      );

      switch (error.type) {
        case "CredentialsSignin":
          return errorResponse("Email o contraseña incorrectos")
        default:
          structuredLogger.error("AuthError en loginUser", error, context);
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
    if (session && session.sessionToken) {
      const sessionToken = session.sessionToken

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

// ============================================================================
// SOLICITUD DE REINICIO DE CONTRASEÑA (SERVER ACTION)
// ============================================================================
import Mustache from 'mustache';
import fs from 'fs/promises';
import path from 'path';
import { sendEmail } from '@/lib/email';

const RequestResetSchema = z.object({
  email: z.string().email({ message: 'Por favor, introduce un email válido.' }),
});

export async function requestPasswordReset(
  values: z.infer<typeof RequestResetSchema>
): Promise<ActionResponse<null>> {
  try {
    const validatedFields = RequestResetSchema.safeParse(values);
    if (!validatedFields.success) {
      return errorResponse('Email inválido.');
    }
    const { email } = validatedFields.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Generar un token seguro usando crypto.getRandomValues
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const token = Buffer.from(randomBytes).toString('hex');
      
      const hashed = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
      const hashedToken = Buffer.from(hashed).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: { userId: user.id, token: hashedToken, expiresAt },
      });

      const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;
      
      // Leer la plantilla Mustache
      const templatePath = path.join(process.cwd(), 'src/lib/email/templates', 'password-reset.mustache');
      const template = await fs.readFile(templatePath, 'utf8');
      
      // Renderizar la plantilla con Mustache
      const emailHtml = Mustache.render(template, { resetLink });

      await sendEmail({
        to: email,
        subject: 'Restablece tu contraseña en Aurora Nova',
        html: emailHtml,
      });
    }

    // Anti-Enumeration: Siempre devolvemos éxito
    return successResponse(null, 'Si tu cuenta existe, recibirás un correo con instrucciones.');

  } catch (error) {
    console.error('Error en requestPasswordReset:', error);
    return errorResponse('Ocurrió un error en el servidor.');
  }
}


// ============================================================================
// VALIDACIÓN DE TOKEN DE REINICIO DE CONTRASEÑA
// ============================================================================

/**
 * Valida un token de reinicio de contraseña.
 * @param token - El token proporcionado por el usuario desde la URL.
 * @returns {Promise<boolean>} - `true` si el token es válido, `false` en caso contrario.
 */
export async function validatePasswordResetToken(token: string): Promise<boolean> {
  try {
    // Usar la API web estándar para hashear, que es compatible con Edge y Node.js
    const hashed = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const hashedToken = Buffer.from(hashed).toString('hex');

    const dbToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
    });

    if (!dbToken) {
      return false;
    }

    // Comprobar si el token ha expirado
    if (new Date() > dbToken.expiresAt) {
      await prisma.passwordResetToken.delete({ where: { id: dbToken.id } });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error al validar el token de reinicio de contraseña:', error);
    return false;
  }
}
