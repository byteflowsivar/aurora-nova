/**
 * Server Actions para Autenticación - Sistema Híbrido JWT + Database
 *
 * Aurora Nova - Módulo de Autenticación de Servidor
 *
 * Implementa Server Actions para operaciones de autenticación con sistema híbrido:
 *
 * **Operaciones Disponibles**:
 * - {@link registerUser}: Registrar nuevo usuario en el sistema
 * - {@link loginUser}: Iniciar sesión con credenciales (JWT + BD)
 * - {@link logoutUser}: Cerrar sesión actual
 * - {@link requestPasswordReset}: Solicitar reinicio de contraseña
 * - {@link validatePasswordResetToken}: Validar token de reset
 *
 * **Sistema Híbrido JWT + Database**:
 * Combina dos estrategias de autenticación:
 * ```
 * JWT (JSON Web Token):
 * - Token encriptado válido por 30 días
 * - Validación rápida sin consultas a BD
 * - Contiene permisos y datos del usuario
 * - Almacenado en cookie HTTP-only
 *
 * Database Sessions:
 * - Registro en tabla `session` de cada sesión activa
 * - Permite invalidación manual (logout)
 * - Rastreo de IP y User-Agent para seguridad
 * - Permite logout remoto y gestión multi-dispositivo
 * ```
 *
 * **Flujo de Autenticación**:
 * ```
 * 1. registerUser() → Crea usuario con contraseña hasheada
 * 2. loginUser() → Llama Auth.js signIn()
 * 3. Auth.js authorize() → Valida credenciales
 * 4. Auth.js jwt callback → Crea JWT + sesión en BD
 * 5. Auth.js session callback → Enriquece sesión con permisos
 * 6. logoutUser() → Elimina sesión de BD + invalida JWT
 * ```
 *
 * **Validación y Seguridad**:
 * - Validación con Zod schema (loginSchema, registerSchema)
 * - Contraseñas hasheadas con bcryptjs (12 rounds)
 * - CSRF protection automática de Auth.js
 * - IP y User-Agent guardados para anomaly detection
 * - Anti-enumeration en password reset
 * - Tokens de reset hasheados en BD
 *
 * **Integración con Logger y Events**:
 * - Logging estructurado de cada operación
 * - Eventos emitidos para email, auditoría, webhooks
 * - Contexto enriquecido con metadata
 * - Medición de performance de login
 *
 * **Errores Manejados**:
 * - ZodError: Validación de entrada
 * - AuthError: Credenciales inválidas
 * - Errores de BD: Registro duplicado, timeout
 * - Errores genéricos: Manejo robusto sin exponer detalles
 *
 * @module actions/auth
 * @see {@link ../lib/auth.ts} para configuración de Auth.js
 * @see {@link ../lib/auth-utils.ts} para funciones auxiliares
 * @see {@link ../lib/logger/structured-logger.ts} para logging
 * @see {@link ../lib/events/event-bus.ts} para eventos
 *
 * @example
 * ```typescript
 * // En un Client Component
 * 'use client';
 * import { loginUser, registerUser, logoutUser } from '@/actions/auth';
 *
 * export function LoginForm() {
 *   const [error, setError] = useState('');
 *
 *   async function handleLogin(formData: LoginInput) {
 *     const result = await loginUser(formData);
 *
 *     if (result.success) {
 *       redirect(result.data.redirectUrl);
 *     } else {
 *       setError(result.error);
 *     }
 *   }
 *
 *   async function handleLogout() {
 *     const result = await logoutUser();
 *     if (result.success) {
 *       redirect('/admin/auth/signin');
 *     }
 *   }
 *
 *   // ... componente UI
 * }
 * ```
 */

"use server"

import { signIn, signOut, auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma/connection"
import { deleteSession } from "@/modules/shared/api"
import {
  loginSchema,
  type LoginInput,
  registerSchema,
} from "@/modules/shared/validations"
import type { ActionResponse } from "@/modules/shared/types"
import { successResponse, errorResponse } from "@/modules/shared/types"
import { AuthError } from "next-auth"
import { headers } from "next/headers"
import { hash } from "bcryptjs"
import { structuredLogger } from "@/lib/logger/structured-logger"
import { getLogContext, enrichContext } from "@/lib/logger/helpers"
import { eventBus, SystemEvent } from "@/lib/events"
import { EventArea } from "@/lib/events/event-area"
import { z } from "zod";

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
 * Crea un nuevo usuario con contraseña hasheada y emite evento para email de bienvenida.
 * Válida datos de entrada, verifica email único, y usa bcryptjs para hash seguro.
 *
 * @async
 * @param input - Objeto con datos del usuario a registrar (validado por registerSchema)
 * @param input.email - Email único del usuario (será validado contra BD)
 * @param input.password - Contraseña en texto plano (será hasheada con bcryptjs)
 * @param input.confirmPassword - Confirmación de contraseña (validada con schema)
 * @param input.firstName - Nombre del usuario (será usado para nombre completo)
 * @param input.lastName - Apellido del usuario (será usado para nombre completo)
 *
 * @returns {Promise<ActionResponse>} Respuesta tipada:
 *   - Si éxito: { success: true, data: { userId, firstName, lastName, email } }
 *   - Si error: { success: false, error: "mensaje de error" }
 *
 * **Pasos de Ejecución**:
 * 1. Obtener contexto de log (module, action, requestId, userId)
 * 2. Validar datos con registerSchema (email, password match, etc)
 * 3. Verificar email no existe (prevenir duplicados)
 * 4. Hashear contraseña con bcryptjs (rounds: 12)
 * 5. Crear usuario en BD con relación credentials
 * 6. Emitir evento USER_REGISTERED para listeners (email, auditoría)
 * 7. Retornar datos del usuario creado
 *
 * **Eventos Emitidos**:
 * - SystemEvent.USER_REGISTERED: Dispara listeners para:
 *   - Enviar email de bienvenida
 *   - Registrar en auditoría
 *   - Notificar webhooks externos
 *
 * **Validación**:
 * - Email válido y único
 * - Password cumple requisitos (min length, complejidad, etc)
 * - Password y confirmPassword coinciden
 * - firstName y lastName no están vacíos
 *
 * **Seguridad**:
 * - Contraseña hasheada con bcryptjs (12 rounds)
 * - Email verificado único en BD (constraint)
 * - Errores no exponen detalles internos
 * - Logging de intentos fallidos
 *
 * **Errores Posibles**:
 * - ZodError: Validación de datos falla
 * - Email en uso: Usuario con ese email ya existe
 * - Error de BD: Timeout, constraint violation, etc
 * - Error desconocido: Fallo en servidor
 *
 * @throws No lanza excepciones directamente (todas capturadas y logueadas)
 *
 * @example
 * ```typescript
 * // Uso básico
 * const result = await registerUser({
 *   email: "nuevo@example.com",
 *   password: "SecurePass123!",
 *   confirmPassword: "SecurePass123!",
 *   firstName: "Juan",
 *   lastName: "Pérez"
 * });
 *
 * if (result.success) {
 *   console.log("Nuevo usuario creado:", result.data.userId);
 *   // Redirigir a login
 *   redirect('/admin/auth/signin');
 * } else {
 *   console.error("Error:", result.error);
 *   // Mostrar error al usuario
 * }
 *
 * // Uso en formulario React
 * export function RegisterForm() {
 *   const [isPending, startTransition] = useTransition();
 *
 *   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
 *     e.preventDefault();
 *     const formData = new FormData(e.currentTarget);
 *
 *     startTransition(async () => {
 *       const result = await registerUser({
 *         email: formData.get('email') as string,
 *         password: formData.get('password') as string,
 *         confirmPassword: formData.get('confirmPassword') as string,
 *         firstName: formData.get('firstName') as string,
 *         lastName: formData.get('lastName') as string,
 *       });
 *
 *       if (result.success) {
 *         redirect('/admin/auth/signin');
 *       }
 *     });
 *   };
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 *
 * @see {@link loginUser} para iniciar sesión después de registrar
 * @see {@link ../modules/shared/validations/auth.ts} para registerSchema
 * @see {@link ../lib/auth-utils.ts} para funciones de autenticación
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

    // Dispatch event for welcome email, etc.
    await eventBus.dispatch(
      SystemEvent.USER_REGISTERED,
      {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      {
        requestId: context.requestId,
        userId: user.id,
        area: EventArea.PUBLIC,
      }
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
 * Inicia sesión de un usuario utilizando el sistema híbrido (JWT + Sesión en BD).
 *
 * Esta acción valida las credenciales, y si son correctas, invoca a Auth.js (`signIn`)
 * para crear una sesión. El callback `jwt` de Auth.js se encarga de crear
 * tanto el JWT encriptado como el registro de la sesión en la base de datos.
 *
 * @async
 * @param {LoginInput} input - Objeto con las credenciales del usuario.
 * @param {string} input.email - Email del usuario.
 * @param {string} input.password - Contraseña del usuario.
 * @returns {Promise<ActionResponse<LoginResponse>>} Una promesa que resuelve a un objeto de respuesta.
 *   - En caso de éxito: `{ success: true, data: { success: true, redirectUrl: '/admin/dashboard' } }`
 *   - En caso de error de validación: `{ success: false, error: 'Error de validación', fieldErrors: {...} }`
 *   - En caso de error de credenciales: `{ success: false, error: 'Email o contraseña incorrectos' }`
 * @throws {AuthError} Capturado internamente. Se lanza por `signIn` si las credenciales son incorrectas.
 * @throws {z.ZodError} Capturado internamente. Se lanza si la entrada no pasa la validación de `loginSchema`.
 *
 * @remarks
 * **Flujo Híbrido**:
 * 1.  Valida los datos de entrada con `loginSchema`.
 * 2.  Obtiene la IP y User-Agent de las cabeceras de la petición.
 * 3.  Llama a `signIn('credentials', ...)` de Auth.js, pasando las credenciales y la metadata (IP, User-Agent).
 * 4.  Auth.js ejecuta el `authorize` callback: valida la contraseña contra el hash en la BD.
 * 5.  Si es válido, Auth.js ejecuta el `jwt` callback: crea el JWT y, crucialmente, crea una entrada en la tabla `Session` en la BD.
 * 6.  Si `signIn` finaliza sin errores, la sesión está creada y se retorna una respuesta de éxito.
 *
 * **Seguridad**:
 * - Utiliza `AuthError` para manejar errores de autenticación de forma segura, sin revelar si el usuario existe o no.
 * - La metadata (IP, User-Agent) se almacena para auditoría y para permitir la gestión de sesiones multi-dispositivo.
 * - Toda la lógica de creación de cookies y JWT es manejada por Auth.js, que está configurado con `httpOnly` y encriptación.
 *
 * @example
 * ```typescript
 * // En un formulario de login de un Client Component
 * const handleSubmit = async (formData: LoginInput) => {
 *   const result = await loginUser(formData);
 *   if (result.success && result.data?.redirectUrl) {
 *     window.location.href = result.data.redirectUrl;
 *   } else {
 *     setFormError(result.error);
 *   }
 * };
 * ```
 * @see {@link ../lib/auth.ts} para la configuración completa de Auth.js y sus callbacks.
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
        redirectUrl: "/admin/dashboard",
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
 * Cierra la sesión del usuario actual en el sistema híbrido.
 *
 * Esta acción realiza dos operaciones clave:
 * 1.  Elimina el registro de la sesión de la base de datos, invalidándola para futuras peticiones.
 * 2.  Llama a `signOut()` de Auth.js para eliminar la cookie JWT del navegador.
 *
 * @async
 * @returns {Promise<ActionResponse<void>>} Una promesa que resuelve a un objeto de respuesta indicando el resultado.
 *   - En caso de éxito: `{ success: true, message: 'Sesión cerrada exitosamente' }`
 *   - En caso de error: `{ success: false, error: 'Error al cerrar sesión' }`
 * @throws {Error} No lanza errores directamente, pero los captura y registra.
 *
 * @remarks
 * **Flujo Híbrido de Logout**:
 * 1.  Obtiene la sesión actual con `auth()` para acceder al `sessionToken` y `userId`.
 * 2.  Si se encuentra un `sessionToken`, se emite el evento `USER_LOGGED_OUT` para auditoría.
 * 3.  Se llama a `deleteSession(sessionToken)` para eliminar la sesión de la tabla `sessions` en la BD. Esto es lo que permite el "logout remoto" y la invalidación real.
 * 4.  Finalmente, se llama a `signOut()` de Auth.js, que se encarga de borrar la cookie de sesión del cliente.
 *
 * **Seguridad**:
 * - Al eliminar la sesión de la base de datos, se asegura que el `sessionToken` (aunque el JWT siga siendo teóricamente válido) no pueda ser usado para autenticar peticiones que requieran validación contra la base de datos.
 * - El logging y el evento de auditoría permiten un seguimiento de todas las acciones de logout.
 *
 * @example
 * ```typescript
 * // En un botón de "Cerrar Sesión" en un Client Component
 * import { logoutUser } from '@/actions/auth';
 *
 * const handleLogout = async () => {
 *   await logoutUser();
 *   // Redirigir al usuario a la página de login.
 *   window.location.href = '/admin/auth/signin';
 * };
 * ```
 * @see {@link deleteSession}
 * @see {@link ../lib/auth.ts}
 */
export async function logoutUser(): Promise<ActionResponse<void>> {
  try {
    // 1. Obtener sesión actual para extraer sessionToken
    const session = await auth()

    // 2. Si existe sessionToken, eliminar de BD (sistema híbrido)
    if (session && session.sessionToken) {
      const sessionToken = session.sessionToken;
      const userId = session.user?.id;

      if (userId) {
        // Determinar el área basándose en los permisos del usuario
        // Si tiene permisos administrativos → ADMIN
        // Si no → SYSTEM (asume logout de usuario público o del sistema)
        const isAdminUser = session.user?.permissions && Array.isArray(session.user.permissions) && session.user.permissions.some(perm => {
          // Considerar admin si tiene permisos de usuario, rol, sistema o auditoría
          return perm.startsWith('user:') || perm.startsWith('role:') || perm.startsWith('system:') || perm.startsWith('audit:');
        });

        const logoutArea = isAdminUser ? EventArea.ADMIN : EventArea.SYSTEM;

        // Dispatch logout event for auditing, notifications, etc.
        await eventBus.dispatch(
          SystemEvent.USER_LOGGED_OUT,
          {
            userId,
            sessionId: sessionToken,
          },
          {
            userId,
            area: logoutArea,
          }
        );
      }

      try {
        const deleted = await deleteSession(sessionToken);
        if (deleted) {
          structuredLogger.info(`Session ${sessionToken} deleted from DB`, {
            module: 'auth',
            action: 'logout',
            userId: userId,
          });
        } else {
          structuredLogger.warn(`Session ${sessionToken} not found in DB`, {
            module: 'auth',
            action: 'logout',
            userId: userId,
          });
        }
      } catch (dbError) {
        // If it fails, log but continue with JWT logout
        structuredLogger.error('Error deleting session from DB', dbError as Error, {
          module: 'auth',
          action: 'logout',
          userId: userId,
        });
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


const RequestResetSchema = z.object({
  email: z.string().email({ message: 'Por favor, introduce un email válido.' }),
});

/**
 * Inicia el proceso de reseteo de contraseña para un usuario.
 *
 * Si el email proporcionado existe en la base de datos, esta función genera un token
 * de reseteo seguro, lo almacena hasheado en la base de datos y emite un evento
 * para que se envíe un correo electrónico al usuario con el enlace de reseteo.
 *
 * @async
 * @param {object} values - Objeto que contiene el email del usuario.
 * @param {string} values.email - El email para el cual se solicita el reseteo.
 * @returns {Promise<ActionResponse<null>>} Una promesa que resuelve a un objeto de respuesta.
 *   - **Importante**: Siempre retorna una respuesta exitosa para prevenir la enumeración de usuarios,
 *     incluso si el email no existe. `{ success: true, data: null, message: 'Si tu cuenta existe...' }`
 * @throws {Error} No lanza errores directamente, los captura y retorna una respuesta de error genérica.
 *
 * @remarks
 * **Flujo**:
 * 1.  Valida el formato del email.
 * 2.  Busca al usuario por su email.
 * 3.  **Si el usuario existe**:
 *     a. Genera un token aleatorio y seguro (`crypto.getRandomValues`).
 *     b. Hashea el token (`SHA-256`) antes de guardarlo en la BD.
 *     c. Crea un registro en `PasswordResetToken` con el token hasheado y una fecha de expiración (30 minutos).
 *     d. Emite el evento `PASSWORD_RESET_REQUESTED`, pasando el token en texto plano para que pueda ser incluido en el email.
 * 4.  **Si el usuario no existe**, no hace nada.
 * 5.  Retorna un mensaje genérico de éxito en ambos casos.
 *
 * **Seguridad (Anti-Enumeración)**:
 * La función está diseñada para no revelar si un email está registrado o no en el sistema.
 * Al devolver siempre una respuesta de éxito, un atacante no puede usar esta funcionalidad
 * para descubrir qué emails son válidos.
 *
 * @example
 * ```typescript
 * // En un formulario de "Olvidé mi contraseña"
 * const handleRequestReset = async (email: string) => {
 *   const result = await requestPasswordReset({ email });
 *   // Muestra siempre el mensaje de éxito al usuario, sin importar el resultado real.
 *   setFeedbackMessage(result.message);
 * };
 * ```
 * @see {@link validatePasswordResetToken}
 * @see {@link SystemEvent.PASSWORD_RESET_REQUESTED}
 */
export async function requestPasswordReset(
  values: z.infer<typeof RequestResetSchema>
): Promise<ActionResponse<null>> {
  const context = await getLogContext('auth', 'requestPasswordReset');
  structuredLogger.info('Password reset requested', context);

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

      // Dispatch event to send password reset email
      await eventBus.dispatch(
        SystemEvent.PASSWORD_RESET_REQUESTED,
        {
          userId: user.id,
          email: user.email,
          token,
          expiresAt,
        },
        {
          requestId: context.requestId,
          userId: user.id,
          area: EventArea.PUBLIC,
        }
      );
    }

    // Anti-Enumeration: Siempre devolvemos éxito
    return successResponse(null, 'Si tu cuenta existe, recibirás un correo con instrucciones.');

  } catch (error) {
    structuredLogger.error('Error in requestPasswordReset', error as Error, context);
    return errorResponse('Ocurrió un error en el servidor.');
  }
}


// ============================================================================
// VALIDACIÓN DE TOKEN DE REINICIO DE CONTRASEÑA
// ============================================================================

/**
 * Valida un token de reinicio de contraseña proporcionado por el usuario.
 *
 * Esta función hashea el token recibido y lo compara con los tokens hasheados
 * almacenados en la base de datos. También verifica que el token no haya expirado.
 *
 * @async
 * @param {string} token - El token de reinicio de contraseña (en texto plano) extraído de la URL.
 * @returns {Promise<boolean>} Una promesa que resuelve a `true` si el token es válido y no ha expirado, o `false` en caso contrario.
 *
 * @remarks
 * **Flujo de Validación**:
 * 1.  Hashea el `token` de entrada usando SHA-256 para poder compararlo con el valor en la BD.
 * 2.  Busca en la tabla `PasswordResetToken` un registro que coincida con el `hashedToken`.
 * 3.  Si no se encuentra ningún registro, el token es inválido. Retorna `false`.
 * 4.  Si se encuentra, comprueba si la fecha actual es posterior a `expiresAt`.
 * 5.  Si el token ha expirado, lo elimina de la BD para invalidarlo permanentemente y retorna `false`.
 * 6.  Si el token es válido y no ha expirado, retorna `true`.
 *
 * @example
 * ```typescript
 * // En la página de reseteo de contraseña, al cargar la página.
 * // El token se extrae de los parámetros de la URL.
 * const urlToken = searchParams.get('token');
 * const isTokenValid = await validatePasswordResetToken(urlToken);
 *
 * if (!isTokenValid) {
 *   // Muestra un error y deshabilita el formulario.
 *   setUiState('invalid_token');
 * }
 * ```
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
