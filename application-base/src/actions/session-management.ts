/**
 * Server Actions para gestión de sesiones
 * Aurora Nova - Sistema Híbrido JWT + Database
 *
 * Estas acciones permiten a los usuarios gestionar sus sesiones activas:
 * - Listar sesiones activas con detalles de dispositivo
 * - Invalidar sesión específica (logout remoto)
 * - Cerrar todas las sesiones (excepto la actual)
 * - Cerrar todas las sesiones (incluyendo la actual)
 */

"use server"

import { auth } from "@/lib/auth"
import {
  getUserSessions,
  deleteSession,
  deleteOtherUserSessions,
  deleteAllUserSessions,
  countActiveSessions,
} from "@/modules/shared/api"
import { parseUserAgent } from "@/modules/shared/utils"
import type { SessionDetails, SessionOperationResult } from "@/modules/shared/types"

// ============================================================================
// LISTAR SESIONES
// ============================================================================

/**
 * Obtiene todas las sesiones activas del usuario autenticado, enriquecidas con detalles del dispositivo.
 * Ordena las sesiones, colocando la actual primero.
 *
 * @async
 * @returns {Promise<SessionDetails[]>} Una promesa que resuelve a un array de sesiones detalladas. Retorna un array vacío si el usuario no está autenticado o en caso de error.
 * @throws {Error} No lanza errores directamente, pero los registra en la consola. Un array vacío puede indicar un error interno.
 *
 * @remarks
 * **Flujo**:
 * 1. Obtiene la sesión actual del usuario via `auth()`.
 * 2. Si no hay sesión, retorna un array vacío.
 * 3. Llama a `getUserSessions` para obtener las sesiones activas de la base de datos.
 * 4. Itera sobre cada sesión para parsear el `userAgent` y añadir información de navegador, OS y dispositivo.
 * 5. Marca la sesión que coincide con el `sessionToken` actual.
 * 6. Ordena la lista para que la sesión actual siempre esté al principio.
 *
 * **Seguridad**:
 * - La función depende de `auth()` para obtener el `userId` de forma segura.
 * - Solo retorna sesiones del usuario autenticado.
 *
 * @example
 * ```typescript
 * // En un Server Component o API route
 * const sessions = await getCurrentUserSessions();
 * console.log(sessions);
 * // Output:
 * // [
 * //   { sessionToken: 'abc', ..., isCurrent: true, browser: 'Chrome', ... },
 * //   { sessionToken: 'def', ..., isCurrent: false, browser: 'Firefox', ... }
 * // ]
 * ```
 */
export async function getCurrentUserSessions(): Promise<SessionDetails[]> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return []
    }

    const userId = session.user.id
    const currentSessionToken = session.sessionToken

    // Obtener sesiones activas (no expiradas)
    const sessions = await getUserSessions(userId, false)

    // Enriquecer con información parseada y marcar sesión actual
    const enrichedSessions: SessionDetails[] = sessions.map((s) => {
      const parsedUA = s.userAgent ? parseUserAgent(s.userAgent) : {}

      return {
        ...s,
        isCurrent: s.sessionToken === currentSessionToken,
        browser: parsedUA.browser,
        os: parsedUA.os,
        device: parsedUA.device,
      }
    })

    // Ordenar: sesión actual primero, luego por fecha (más recientes primero)
    return enrichedSessions.sort((a, b) => {
      if (a.isCurrent) return -1
      if (b.isCurrent) return 1
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
  } catch (error) {
    console.error("Error getting user sessions:", error)
    return []
  }
}

/**
 * Obtiene el conteo de sesiones activas para el usuario autenticado.
 *
 * @async
 * @returns {Promise<number>} Una promesa que resuelve al número de sesiones activas. Retorna 0 si el usuario no está autenticado o en caso de error.
 * @throws {Error} No lanza errores directamente, pero los registra en la consola. Un retorno de 0 puede indicar un error.
 *
 * @remarks
 * **Flujo**:
 * 1. Obtiene la sesión actual del usuario via `auth()`.
 * 2. Si no hay sesión, retorna 0.
 * 3. Llama a `countActiveSessions` con el `userId` para obtener el conteo desde la base de datos.
 *
 * @example
 * ```typescript
 * // En un Server Component o API route
 * const sessionCount = await getActiveSessionCount();
 * console.log(`Tienes ${sessionCount} sesiones activas.`);
 * ```
 */
export async function getActiveSessionCount(): Promise<number> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return 0
    }

    return await countActiveSessions(session.user.id)
  } catch (error) {
    console.error("Error counting active sessions:", error)
    return 0
  }
}

// ============================================================================
// INVALIDAR SESIONES
// ============================================================================

/**
 * Invalida una sesión específica de un usuario (logout remoto).
 * Esta acción está diseñada para permitir a un usuario cerrar una sesión en otro dispositivo.
 *
 * @async
 * @param {string} sessionToken - El token de la sesión que se desea invalidar.
 * @returns {Promise<SessionOperationResult>} Un objeto indicando el éxito o fracaso de la operación.
 * @throws {Error} No lanza errores directamente, pero los registra y retorna un objeto de error.
 *
 * @remarks
 * **Validaciones**:
 * - El usuario debe estar autenticado.
 * - El `sessionToken` a invalidar no puede ser el de la sesión actual.
 * - La sesión a invalidar debe existir y pertenecer al usuario autenticado.
 *
 * **Flujo**:
 * 1. Obtiene la sesión actual para verificar la autenticación.
 * 2. Compara el `sessionToken` proporcionado con el de la sesión actual para evitar auto-cierre.
 * 3. Verifica que la sesión a eliminar realmente pertenece al usuario.
 * 4. Llama a `deleteSession` para eliminar el registro de la base de datos.
 *
 * **Seguridad**:
 * - Un usuario solo puede invalidar sus propias sesiones. La verificación `sessionExists` previene que un usuario intente adivinar tokens de otros.
 * - Previene que el usuario se bloquee a sí mismo al no permitir invalidar la sesión actual.
 *
 * @example
 * ```typescript
 * // Desde el cliente, al hacer click en "Cerrar sesión en este dispositivo"
 * const result = await invalidateSession('some_other_session_token');
 * if (result.success) {
 *   alert(result.message);
 * } else {
 *   alert(result.error);
 * }
 * ```
 */
export async function invalidateSession(
  sessionToken: string
): Promise<SessionOperationResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return {
        success: false,
        error: "No autenticado",
      }
    }

    const currentSessionToken = session.sessionToken

    // Prevenir que el usuario cierre su propia sesión actual
    if (sessionToken === currentSessionToken) {
      return {
        success: false,
        error: "No puedes invalidar tu sesión actual. Usa logout en su lugar.",
      }
    }

    // Verificar que la sesión pertenece al usuario actual
    // (por seguridad, aunque deleteSession ya falla si no existe)
    const userSessions = await getUserSessions(session.user.id, false)
    const sessionExists = userSessions.some((s) => s.sessionToken === sessionToken)

    if (!sessionExists) {
      return {
        success: false,
        error: "Sesión no encontrada o ya expirada",
      }
    }

    // Eliminar sesión de BD
    const deleted = await deleteSession(sessionToken)

    if (deleted) {
      return {
        success: true,
        message: "Sesión cerrada exitosamente",
      }
    } else {
      return {
        success: false,
        error: "No se pudo eliminar la sesión",
      }
    }
  } catch (error) {
    console.error("Error invalidating session:", error)
    return {
      success: false,
      error: "Error al invalidar sesión",
    }
  }
}

/**
 * Cierra todas las sesiones del usuario autenticado, EXCEPTO la actual.
 * Ideal para la funcionalidad "Cerrar sesión en todos los demás dispositivos".
 *
 * @async
 * @returns {Promise<SessionOperationResult>} Un objeto con el resultado de la operación, incluyendo el número de sesiones cerradas.
 * @throws {Error} No lanza errores directamente, pero los registra y retorna un objeto de error.
 *
 * @remarks
 * **Flujo**:
 * 1. Obtiene la sesión actual para identificar al usuario y el `sessionToken` a excluir.
 * 2. Si no hay sesión o token, retorna un error.
 * 3. Llama a `deleteOtherUserSessions`, que ejecuta una consulta en la base de datos para eliminar todas las sesiones del `userId` que no coincidan con el `currentSessionToken`.
 *
 * **Seguridad**:
 * - La operación está limitada al `userId` de la sesión activa, garantizando que un usuario no pueda afectar a otros.
 * - Es una acción segura que no interrumpe la sesión actual del usuario.
 *
 * @example
 * ```typescript
 * // En la página de configuración de seguridad del usuario
 * const result = await closeAllOtherSessions();
 * if (result.success) {
 *   alert(result.message); // ej: "3 sesión(es) cerrada(s) exitosamente"
 * } else {
 *   alert(result.error);
 * }
 * ```
 */
export async function closeAllOtherSessions(): Promise<SessionOperationResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return {
        success: false,
        error: "No autenticado",
      }
    }

    const userId = session.user.id
    const currentSessionToken = session.sessionToken

    if (!currentSessionToken) {
      return {
        success: false,
        error: "No se pudo identificar la sesión actual",
      }
    }

    // Eliminar todas las sesiones excepto la actual
    const count = await deleteOtherUserSessions(userId, currentSessionToken)

    return {
      success: true,
      message: `${count} sesión(es) cerrada(s) exitosamente`,
    }
  } catch (error) {
    console.error("Error closing other sessions:", error)
    return {
      success: false,
      error: "Error al cerrar sesiones",
    }
  }
}

/**
 * Cierra TODAS las sesiones activas del usuario, incluyendo la actual.
 * Es una medida de seguridad drástica, útil después de un cambio de contraseña o si se sospecha de una brecha de seguridad.
 *
 * @async
 * @returns {Promise<SessionOperationResult>} Un objeto con el resultado de la operación, incluyendo el número total de sesiones cerradas.
 * @throws {Error} No lanza errores directamente, pero los registra y retorna un objeto de error.
 *
 * @remarks
 * **Flujo**:
 * 1. Obtiene la sesión actual para identificar al usuario.
 * 2. Llama a `deleteAllUserSessions`, que elimina todos los registros de sesión asociados al `userId`.
 *
 * **Seguridad**:
 * - Esta es una acción destructiva que forzará al usuario a iniciar sesión de nuevo en todos sus dispositivos.
 * - Es la medida recomendada cuando se necesita invalidar todas las credenciales de sesión de forma inmediata.
 *
 * **Nota**: Como esta acción también cierra la sesión actual, el cliente debe estar preparado para redirigir al usuario a la página de login.
 *
 * @example
 * ```typescript
 * // Después de que un usuario cambia su contraseña
 * const result = await closeAllSessions();
 * if (result.success) {
 *   // Forzar logout en el cliente y redirigir a /login
 *   signOut({ redirect: true, callbackUrl: "/login" });
 * } else {
 *   alert(result.error);
 * }
 * ```
 */
export async function closeAllSessions(): Promise<SessionOperationResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return {
        success: false,
        error: "No autenticado",
      }
    }

    const userId = session.user.id

    // Eliminar TODAS las sesiones del usuario
    const count = await deleteAllUserSessions(userId)

    return {
      success: true,
      message: `${count} sesión(es) cerrada(s). Por favor inicia sesión nuevamente.`,
    }
  } catch (error) {
    console.error("Error closing all sessions:", error)
    return {
      success: false,
      error: "Error al cerrar todas las sesiones",
    }
  }
}
