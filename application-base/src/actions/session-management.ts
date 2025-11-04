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
} from "@/lib/prisma/session-queries"
import { parseUserAgent } from "@/lib/utils/session-utils"
import type { SessionDetails, SessionOperationResult } from "@/lib/types/session"

// ============================================================================
// LISTAR SESIONES
// ============================================================================

/**
 * Obtiene todas las sesiones activas del usuario actual con detalles
 * Incluye información parseada del navegador, OS y dispositivo
 *
 * @returns Lista de sesiones con detalles enriquecidos
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
 * Obtiene el conteo de sesiones activas del usuario actual
 *
 * @returns Número de sesiones activas
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
 * Invalida una sesión específica (logout remoto)
 * Útil para "Cerrar sesión en otro dispositivo"
 *
 * IMPORTANTE: No puede invalidar la sesión actual del usuario
 *
 * @param sessionToken - Token de la sesión a invalidar
 * @returns Resultado de la operación
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
 * Cierra todas las sesiones del usuario EXCEPTO la actual
 * Útil para "Cerrar sesión en todos los demás dispositivos"
 *
 * @returns Resultado con número de sesiones cerradas
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
 * Cierra TODAS las sesiones del usuario (incluyendo la actual)
 * Útil para situaciones de seguridad (ej: cambio de contraseña)
 *
 * NOTA: El usuario deberá hacer login nuevamente
 *
 * @returns Resultado con número de sesiones cerradas
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
