/**
 * Queries de Prisma para gestión de sesiones
 * Aurora Nova - Sistema Híbrido JWT + Database
 *
 * Este módulo proporciona funciones para gestionar sesiones en la base de datos,
 * complementando el sistema JWT para permitir invalidación manual y tracking.
 */

import { prisma } from "@/lib/prisma/connection"
import type { CreateSessionData, SessionInfo } from "@/modules/shared/types"
import type { Prisma } from "@prisma/client"

/**
 * Crea una nueva sesión en la base de datos
 * Se llama al hacer login exitoso
 *
 * @param data - Datos de la sesión (sessionToken es el JWT ID)
 * @returns La sesión creada
 */
export async function createSession(
  data: CreateSessionData
): Promise<SessionInfo> {
  const session = await prisma.session.create({
    data: {
      sessionToken: data.sessionToken,
      userId: data.userId,
      expires: data.expires,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    },
  })

  return session
}

/**
 * Verifica si una sesión existe y es válida
 * Se usa en middleware para validar JWT contra BD
 *
 * @param sessionToken - Token de sesión (JWT ID)
 * @returns true si la sesión existe y no ha expirado
 */
export async function isSessionValid(
  sessionToken: string
): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { sessionToken },
    select: { expires: true },
  })

  if (!session) return false

  // Verificar que no esté expirada
  return session.expires > new Date()
}

/**
 * Obtiene información completa de una sesión
 *
 * @param sessionToken - Token de sesión
 * @returns Información de la sesión o null si no existe
 */
export async function getSession(
  sessionToken: string
): Promise<SessionInfo | null> {
  return await prisma.session.findUnique({
    where: { sessionToken },
  })
}

/**
 * Elimina una sesión específica (logout)
 *
 * @param sessionToken - Token de sesión a eliminar
 * @returns true si se eliminó, false si no existía
 */
export async function deleteSession(
  sessionToken: string
): Promise<boolean> {
  try {
    await prisma.session.delete({
      where: { sessionToken },
    })
    return true
  } catch {
    // Si no existe, Prisma lanza error
    return false
  }
}

/**
 * Lista todas las sesiones activas de un usuario
 *
 * @param userId - ID del usuario
 * @param includeExpired - Si incluir sesiones expiradas (default: false)
 * @returns Array de sesiones
 */
type SessionWhereInput = Prisma.Args<typeof prisma.session, 'findMany'>['where']

export async function getUserSessions(
  userId: string,
  includeExpired: boolean = false
): Promise<SessionInfo[]> {
  const where: SessionWhereInput = { userId }

  if (!includeExpired) {
    where.expires = {
      gt: new Date(), // Mayor que fecha actual
    }
  }

  return await prisma.session.findMany({
    where,
    orderBy: {
      createdAt: "desc", // Más recientes primero
    },
  })
}

/**
 * Elimina todas las sesiones de un usuario excepto la actual
 * Útil para "Cerrar sesión en todos los dispositivos"
 *
 * @param userId - ID del usuario
 * @param currentSessionToken - Token de la sesión actual (no se elimina)
 * @returns Número de sesiones eliminadas
 */
export async function deleteOtherUserSessions(
  userId: string,
  currentSessionToken: string
): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      userId,
      sessionToken: {
        not: currentSessionToken,
      },
    },
  })

  return result.count
}

/**
 * Elimina todas las sesiones de un usuario (incluyendo la actual)
 * Útil para acciones de seguridad (cambio de contraseña, etc.)
 *
 * @param userId - ID del usuario
 * @returns Número de sesiones eliminadas
 */
export async function deleteAllUserSessions(userId: string): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { userId },
  })

  return result.count
}

/**
 * Limpia sesiones expiradas de la base de datos
 * Se puede ejecutar como tarea programada (cron job)
 *
 * @returns Número de sesiones eliminadas
 */
export async function cleanExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expires: {
        lt: new Date(), // Menor que fecha actual
      },
    },
  })

  return result.count
}

/**
 * Cuenta las sesiones activas de un usuario
 *
 * @param userId - ID del usuario
 * @returns Número de sesiones activas
 */
export async function countActiveSessions(userId: string): Promise<number> {
  return await prisma.session.count({
    where: {
      userId,
      expires: {
        gt: new Date(),
      },
    },
  })
}
