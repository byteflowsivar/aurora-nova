/**
 * Módulo de Queries para Gestión de Sesiones - Aurora Nova
 *
 * Proporciona funciones para gestionar sesiones en la base de datos,
 * complementando el sistema JWT para permitir invalidación manual y tracking.
 *
 * **Arquitectura de Sesiones**:
 * - **JWT (Stateless)**: Token firmado con expiración, enviado en cookies
 * - **Database (Stateful)**: Registro de sesiones para invalidación manual y auditoría
 * - **Validación**: Middleware verifica JWT + sesión en BD antes de permitir acceso
 * - **Revocación**: Eliminar sesión revoca acceso aunque JWT sea válido
 *
 * **Casos de Uso**:
 * - Login: crear nueva sesión + generar JWT
 * - Validación: verificar JWT + sesión activa
 * - Logout: eliminar sesión única
 * - "Cerrar en todos los dispositivos": eliminar todas salvo actual
 * - Cambio de contraseña: revoke omnis (todas las sesiones)
 * - Limpieza: eliminar sesiones expiradas (cron job)
 *
 * **Flujos Principales**:
 *
 * **1. LOGIN**:
 * ```
 * POST /api/auth/signin
 * → validateCredentials() → createSession() → Set-Cookie JWT
 * ```
 *
 * **2. VERIFICACIÓN (Middleware)**:
 * ```
 * GET /api/admin/users
 * → middleware: extraer JWT
 * → isSessionValid(jwt_id) → check BD
 * → ✓ acceso o ✗ 401 Unauthorized
 * ```
 *
 * **3. LOGOUT**:
 * ```
 * POST /api/auth/signout
 * → deleteSession(jwt_id) → Clear-Cookie
 * ```
 *
 * **4. REVOKE OMNIBUS** (cambio de contraseña):
 * ```
 * POST /api/user/change-password
 * → changeUserPassword() llamada desde user-queries
 * → deleteAllUserSessions() cierra todos los dispositivos
 * ```
 *
 * **5. LIMPIEZA** (scheduled task):
 * ```
 * Cron job cada hora
 * → cleanExpiredSessions() elimina sesiones con expires < now()
 * ```
 *
 * **Seguridad**:
 * - Sesiones vinculadas a usuario + dispositivo (ipAddress, userAgent)
 * - Expiración configurable (típicamente 30 días)
 * - Revocación inmediata: eliminar BD = logout instantáneo
 * - No se reutilizan sessionTokens
 * - Limpieza automática de sesiones expiradas
 *
 * **Ejemplo de Flujo Completo**:
 * ```typescript
 * // 1. Usuario hace login
 * const { user } = await signInWithCredentials(email, password)
 * const sessionToken = generateJWT(user.id) // JWT con exp = 30 días
 * await createSession({
 *   sessionToken,
 *   userId: user.id,
 *   expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
 *   ipAddress: req.ip,
 *   userAgent: req.headers['user-agent']
 * })
 *
 * // 2. Middleware en cada request
 * const jwt = extractFromCookie() // desde cookie
 * if (!await isSessionValid(jwt)) {
 *   return res.status(401) // logout
 * }
 *
 * // 3. Usuario hace logout
 * await deleteSession(jwt)
 * res.clearCookie('session')
 *
 * // 4. Usuario cambia contraseña (logout omnibus)
 * await changeUserPassword(userId, oldPwd, newPwd)
 * // → internamente llama deleteAllUserSessions(userId)
 * // → usuario desconectado en todos los dispositivos
 * ```
 *
 * @module shared/api/session-queries
 * @see {@link @/lib/prisma/connection.ts} para conexión Prisma
 * @see {@link @/modules/shared/types} para tipos SessionInfo, CreateSessionData
 * @see {@link @/modules/shared/api/user-queries.ts} para changeUserPassword que usa deleteAllUserSessions
 */

import { prisma } from "@/lib/prisma/connection"
import type { CreateSessionData, SessionInfo } from "@/modules/shared/types"
import type { Prisma } from "@prisma/client"

/**
 * Crea una nueva sesión en la base de datos
 *
 * Se llama inmediatamente después de validar credenciales exitosas (login).
 * Genera un registro de sesión que vincula un JWT con un usuario, dispositivo e IP.
 *
 * **Cuándo se Llama**:
 * - Después de `POST /api/auth/signin` exitoso
 * - Después de validar email/password o OAuth
 * - Antes de enviar JWT en cookie al cliente
 *
 * **Comportamiento**:
 * - Crea registro en tabla `session` de BD
 * - Almacena JWT ID (sessionToken) para validación posterior
 * - Vincula a usuario específico y dispositivo
 * - Define expiración (típicamente 30 días desde ahora)
 * - Captura ipAddress y userAgent para auditoría
 *
 * **Datos de Entrada** (CreateSessionData):
 * - `sessionToken`: JWT ID (string único, ej: "usr_123.jti_456")
 * - `userId`: ID del usuario (ej: "user_123")
 * - `expires`: Fecha de expiración (ej: new Date(Date.now() + 30*24*60*60*1000))
 * - `ipAddress`: Dirección IP del cliente (opcional, puede ser null)
 * - `userAgent`: User-Agent del navegador (opcional, puede ser null)
 *
 * **Ejemplo**:
 * ```typescript
 * // En ruta de signin
 * const { user } = await validateCredentials(email, password)
 *
 * // Generar JWT con expiración
 * const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
 * const jwt = generateJWT(user.id, expiresAt)
 * const jwtId = extractJTI(jwt) // ej: "jti_456789"
 *
 * // Crear sesión
 * const session = await createSession({
 *   sessionToken: jwtId,
 *   userId: user.id,
 *   expires: expiresAt,
 *   ipAddress: req.ip,
 *   userAgent: req.headers['user-agent']
 * })
 *
 * // Responder con JWT en cookie
 * res.setHeader('Set-Cookie', `session=${jwt}; Secure; HttpOnly; Path=/`)
 * return res.json({ success: true })
 * ```
 *
 * **Seguridad**:
 * - ipAddress y userAgent opcionales pero recomendados (auditoría)
 * - sessionToken debe ser único (generado por JWT library)
 * - expires deben ser absoluto (no relativo)
 * - No guardar contraseña en sesión (nunca)
 *
 * **Performance**:
 * - Operación rápida (INSERT simple)
 * - No requiere transacción (sesión independiente)
 * - índice en sessionToken para búsquedas posteriores
 *
 * @async
 * @param {CreateSessionData} data - Datos de la sesión a crear
 * @returns {Promise<SessionInfo>} Sesión creada con id, createdAt, updatedAt
 *
 * @example
 * ```typescript
 * const session = await createSession({
 *   sessionToken: 'jti_xyz123',
 *   userId: 'user_456',
 *   expires: new Date('2025-01-05'),
 *   ipAddress: '192.168.1.100',
 *   userAgent: 'Mozilla/5.0...'
 * })
 * // SessionInfo { id: 1, sessionToken: 'jti_xyz123', userId: 'user_456', ... }
 * ```
 *
 * @see {@link isSessionValid} para verificar sesión en middleware
 * @see {@link deleteSession} para logout (eliminar sesión)
 * @see {@link getUserSessions} para listar todas las sesiones del usuario
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
 * Verifica si una sesión existe y es válida (activa y no expirada)
 *
 * Se usa en middleware de autenticación para validar JWT.
 * **Importante**: Esta es la verificación de BD que complementa la verificación JWT.
 *
 * **Verificación de Dos Capas**:
 * 1. **JWT**: Middleware verifica firma y expiración del token
 * 2. **BD**: Esta función verifica que sesión existe y no ha sido revocada
 *
 * **Flujo Típico en Middleware**:
 * ```
 * GET /api/admin/users
 * 1. Extraer JWT de cookie
 * 2. Verificar firma JWT (no expirado)
 * 3. Extraer sessionToken del JWT
 * 4. Llamar isSessionValid(sessionToken) ← Esta función
 * 5. Si false → 401 Unauthorized (logout)
 * 6. Si true → continuar request
 * ```
 *
 * **Cuándo Retorna false**:
 * - Sesión no existe en BD (nunca se creó)
 * - Sesión fue eliminada (logout o revocación manual)
 * - Sesión ha expirado (expires < now())
 *
 * **Cuándo Retorna true**:
 * - Sesión existe en BD
 * - expires > now() (aún no ha expirado)
 *
 * **Revocación Inmediata**:
 * ```typescript
 * // Usuario está logueado (JWT válido + sesión activa)
 * await isSessionValid(jwt) // true
 *
 * // Admin elimina sesión del usuario (seguridad)
 * await deleteSession(jwt)
 *
 * // Ahora el usuario está desconectado aunque JWT sea válido
 * await isSessionValid(jwt) // false ← revocación inmediata
 * ```
 *
 * **Performance**:
 * - Consulta rápida (búsqueda por PK, select único campo)
 * - No requiere JOINs
 * - Cacheable en middleware (con cautela)
 *
 * **Ejemplo**:
 * ```typescript
 * // En middleware
 * const sessionToken = extractFromJWT(req.cookies.session)
 *
 * if (!await isSessionValid(sessionToken)) {
 *   // Sesión inválida o expirada
 *   res.clearCookie('session')
 *   return res.status(401).json({ error: 'Sesión expirada' })
 * }
 *
 * // Continuar
 * next()
 * ```
 *
 * @async
 * @param {string} sessionToken - Token de sesión (JWT ID, ej: "jti_456")
 * @returns {Promise<boolean>} true si sesión existe y expires > now(), false en caso contrario
 *
 * @example
 * ```typescript
 * // Sesión válida
 * await isSessionValid('jti_xyz123') // true
 *
 * // Sesión expirada o no existe
 * await isSessionValid('jti_invalid') // false
 * ```
 *
 * @see {@link createSession} para crear sesión (login)
 * @see {@link deleteSession} para eliminar sesión (logout/revocación)
 * @see {@link getSession} para obtener detalles completos de sesión
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
 * Retorna todos los detalles de una sesión: usuario, dispositivo, IP, fechas, etc.
 * Útil para auditoría, verificación de dispositivo y detalles de sesión.
 *
 * **Información Retornada** (SessionInfo):
 * - `id`: ID de la sesión en BD
 * - `sessionToken`: JWT ID único
 * - `userId`: ID del usuario propietario
 * - `expires`: Fecha de expiración
 * - `ipAddress`: IP de origen (puede ser null)
 * - `userAgent`: Navegador/dispositivo (puede ser null)
 * - `createdAt`: Cuándo se creó la sesión (login)
 * - `updatedAt`: Última actualización
 *
 * **Casos de Uso**:
 * - Mostrar "Mis dispositivos activos" en settings del usuario
 * - Auditoría: verificar detalles de quién está logueado
 * - Validación de dispositivo: comparar IP/userAgent con valor actual
 * - Revocación selectiva: ver sesiones antes de cerrar algunas
 *
 * **Ejemplo - Listar Dispositivos Activos**:
 * ```typescript
 * // Usuario quiere ver en qué dispositivos está logueado
 * const sessions = await getUserSessions(userId)
 * const devices = await Promise.all(
 *   sessions.map(async (s) => {
 *     const full = await getSession(s.sessionToken)
 *     return {
 *       deviceName: parseUserAgent(full.userAgent),
 *       ip: full.ipAddress,
 *       createdAt: full.createdAt,
 *       expires: full.expires,
 *       current: full.sessionToken === currentSessionToken
 *     }
 *   })
 * )
 * ```
 *
 * **Null Return**:
 * - Sesión no existe (nunca se creó o fue eliminada)
 * - Token inválido/no encontrado
 *
 * @async
 * @param {string} sessionToken - Token de sesión (JWT ID)
 * @returns {Promise<SessionInfo | null>} Información completa o null si no existe
 *
 * @example
 * ```typescript
 * const session = await getSession('jti_xyz123')
 * // SessionInfo {
 * //   id: 42,
 * //   sessionToken: 'jti_xyz123',
 * //   userId: 'user_456',
 * //   expires: Date,
 * //   ipAddress: '192.168.1.100',
 * //   userAgent: 'Mozilla/5.0...',
 * //   createdAt: Date,
 * //   updatedAt: Date
 * // }
 *
 * // No existe
 * const notFound = await getSession('jti_invalid')
 * // null
 * ```
 *
 * @see {@link getUserSessions} para listar todas las sesiones de un usuario
 * @see {@link isSessionValid} para verificación rápida de validez
 */
export async function getSession(
  sessionToken: string
): Promise<SessionInfo | null> {
  return await prisma.session.findUnique({
    where: { sessionToken },
  })
}

/**
 * Elimina una sesión específica (logout único dispositivo)
 *
 * Revoca el acceso de un dispositivo específico eliminando su sesión de BD.
 * Aunque el JWT sea válido, la sesión deletreada causará logout inmediato.
 *
 * **Cuándo se Llama**:
 * - Usuario hace logout manualmente (POST /api/auth/signout)
 * - Admin revoca acceso de un usuario desde panel de control
 * - Seguridad: detecta actividad sospechosa
 *
 * **Comportamiento**:
 * - Busca sesión por sessionToken (PK)
 * - Si existe: elimina registro de BD
 * - Si no existe: no lanza error, retorna false
 * - Operación inmediata: user está desconectado al instante
 *
 * **Diferencia con deleteAllUserSessions**:
 * - `deleteSession()`: elimina UNA sesión específica
 * - `deleteAllUserSessions()`: elimina TODAS las sesiones del usuario
 *
 * **Seguridad**:
 * - Logout inmediato: no depende de expiración JWT
 * - Revocación manual: admin puede desconectar usuarios
 * - Auditable: registro en BD (se eliminó fecha X, IP Y)
 * - Idempotente: llamar 2 veces no causa error
 *
 * **Ejemplo - Logout Manual**:
 * ```typescript
 * // En ruta POST /api/auth/signout
 * const sessionToken = extractFromJWT(req.cookies.session)
 *
 * const deleted = await deleteSession(sessionToken)
 * if (!deleted) {
 *   console.warn('Sesión no encontrada:', sessionToken)
 * }
 *
 * // Limpiar cookie
 * res.clearCookie('session')
 * return res.json({ success: true })
 * ```
 *
 * **Ejemplo - Admin Revoca Acceso**:
 * ```typescript
 * // Admin elimina sesión de usuario específico
 * const sessions = await getUserSessions(userId)
 * const desktopSession = sessions.find(s => s.ipAddress === '192.168.1.1')
 *
 * if (desktopSession) {
 *   const revoked = await deleteSession(desktopSession.sessionToken)
 *   if (revoked) {
 *     await logAudit('SESSION_REVOKED', { userId, sessionId: desktopSession.id })
 *   }
 * }
 * ```
 *
 * **Nota sobre Errores**:
 * - Si sesión no existe: retorna false (no lanza error)
 * - Útil para logout sin verificación previa
 *
 * @async
 * @param {string} sessionToken - Token de sesión a eliminar (JWT ID)
 * @returns {Promise<boolean>} true si se eliminó, false si no existía
 *
 * @example
 * ```typescript
 * // Logout exitoso
 * const success = await deleteSession('jti_xyz123')
 * // true
 *
 * // Sesión no existe
 * const success = await deleteSession('jti_invalid')
 * // false
 * ```
 *
 * @see {@link createSession} para crear sesión (login)
 * @see {@link deleteAllUserSessions} para logout omnibus (todos los dispositivos)
 * @see {@link deleteOtherUserSessions} para cerrar otros dispositivos
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
 * Lista todas las sesiones de un usuario (activas o expiradas)
 *
 * Retorna sesiones ordenadas por más recientes primero.
 * Útil para mostrar "Mis dispositivos" en settings o auditoría.
 *
 * **Parámetros**:
 * - `userId`: ID del usuario
 * - `includeExpired`: Por defecto false (solo activas). Si true, incluye sesiones expiradas.
 *
 * **Comportamiento**:
 * - `includeExpired: false`: retorna solo sesiones con `expires > now()`
 * - `includeExpired: true`: retorna todas las sesiones del usuario
 * - Ordenadas por `createdAt DESC` (más recientes primero)
 *
 * **Casos de Uso**:
 * - Mostrar "Dispositivos activos" en settings (defecto false)
 * - Auditoría: historial completo de sesiones (true)
 * - Contar sesiones activas para limites (false)
 * - Análisis: cuáles dispositivos fueron usados (true)\n *
 * **Ejemplo - Mis Dispositivos**:
 * ```typescript
 * // Usuario ve en qué dispositivos está logueado
 * const sessions = await getUserSessions(userId)
 * // [
 * //   { sessionToken: 'jti_1', ipAddress: '192.168.1.1', createdAt: now, expires: +30d },
 * //   { sessionToken: 'jti_2', ipAddress: '10.0.0.1', createdAt: now-5d, expires: +25d }
 * // ]
 * ```
 *
 * **Ejemplo - Auditoría Completa**:
 * ```typescript
 * // Admin quiere ver TODO el historial (incluso expiradas)
 * const allSessions = await getUserSessions(userId, true)
 * // Incluye sesiones de hace 90 días que ya expiraron
 * ```
 *
 * @async
 * @param {string} userId - ID del usuario
 * @param {boolean} [includeExpired=false] - Si incluir sesiones expiradas
 * @returns {Promise<SessionInfo[]>} Array de sesiones, ordenadas por createdAt DESC
 *
 * @example
 * ```typescript
 * // Solo activas (defecto)
 * const active = await getUserSessions(userId)
 * // [...sesiones con expires > now()]
 *
 * // Todas incluyendo expiradas
 * const all = await getUserSessions(userId, true)
 * // [...todas las sesiones]
 * ```
 *
 * @see {@link countActiveSessions} para contar sin traer detalles
 * @see {@link deleteOtherUserSessions} para eliminar todas salvo actual
 * @see {@link deleteAllUserSessions} para eliminar todas
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
 * Elimina todas las sesiones de un usuario EXCEPTO la actual
 *
 * Implementa "Cerrar sesión en otros dispositivos" sin desconectar el usuario actual.
 * Revoca acceso en todos los otros dispositivos mientras mantiene activo el actual.
 *
 * **Cuándo se Llama**:
 * - Usuario hace clic en "Cerrar sesión en otros dispositivos" en settings
 * - Seguridad: usuario descubre actividad sospechosa en otro dispositivo
 *
 * **Parámetros**:
 * - `userId`: ID del usuario
 * - `currentSessionToken`: JWT ID del dispositivo actual (no se elimina)
 *
 * **Comportamiento**:
 * - Busca todas las sesiones del usuario
 * - Excluye la sesión actual (currentSessionToken)
 * - Elimina todas las demás
 * - Retorna cantidad eliminada
 *
 * **Ejemplo - Settings del Usuario**:
 * ```typescript
 * // POST /api/user/sessions/logout-others
 * const currentToken = extractFromJWT(req.cookies.session)
 * const userId = req.user.id
 *
 * const closed = await deleteOtherUserSessions(userId, currentToken)
 * console.log(`Cerradas ${closed} sesiones en otros dispositivos`)
 *
 * // Response
 * return res.json({
 *   success: true,
 *   message: `${closed} dispositivos desconectados`,
 *   yourSessionStays: true
 * })
 * ```
 *
 * **Seguridad**:
 * - currentSessionToken excluido: usuario mantiene su acceso
 * - Revocación inmediata de otros: sin esperar a expiración
 * - Auditable: sabe cuáles sesiones se eliminaron
 *
 * **Diferencia con deleteAllUserSessions**:
 * - `deleteOtherUserSessions()`: elimina todos EXCEPTO actual
 * - `deleteAllUserSessions()`: elimina TODOS incluyendo actual
 *
 * @async
 * @param {string} userId - ID del usuario
 * @param {string} currentSessionToken - Token de sesión actual (no se elimina)
 * @returns {Promise<number>} Cantidad de sesiones eliminadas
 *
 * @example
 * ```typescript
 * const count = await deleteOtherUserSessions('user_456', 'jti_xyz123')
 * console.log(`Eliminadas ${count} sesiones`)  // Ej: "Eliminadas 3 sesiones"
 * ```
 *
 * @see {@link deleteAllUserSessions} para eliminar todas incluyendo actual
 * @see {@link deleteSession} para eliminar una sesión específica
 * @see {@link getUserSessions} para listar antes de eliminar
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
 * Elimina TODAS las sesiones de un usuario (incluyendo la actual)
 *
 * Implementa "revocación omnibus": desconecta al usuario en TODOS los dispositivos.
 * Se usa en eventos de seguridad crítica donde el usuario debe reautenticarse.
 *
 * **Cuándo se Llama**:
 * - Usuario cambia contraseña (changeUserPassword() lo llama internamente)
 * - Detección de actividad sospechosa / intentos de acceso no autorizado
 * - Admin suspende/desactiva cuenta de usuario
 * - Usuario solicita "cerrar sesión en todos los dispositivos" (incluyendo actual)
 *
 * **Comportamiento**:
 * - Elimina TODOS los registros de sesión del usuario
 * - No excluye la sesión actual
 * - Usuario será desconectado en el siguiente request
 * - Retorna cantidad total de sesiones eliminadas
 *
 * **Diferencia con deleteOtherUserSessions**:
 * - `deleteOtherUserSessions()`: elimina todos EXCEPTO actual
 * - `deleteAllUserSessions()`: elimina TODOS incluyendo actual
 *
 * **Caso de Uso: Cambio de Contraseña**:
 * ```typescript
 * // En changeUserPassword() de user-queries.ts
 * // Transacción:
 * // 1. Actualizar hash de contraseña
 * // 2. deleteAllUserSessions(userId) ← logout omnibus
 * const sessionsRevoked = await deleteAllUserSessions(userId)
 * console.log(`${sessionsRevoked} sesiones revocadas`)
 * // Usuario desconectado de todos los dispositivos
 * // Debe hacer login nuevamente con nueva contraseña
 * ```
 *
 * **Caso de Uso: Seguridad Crítica**:
 * ```typescript
 * // Admin detecta acceso sospechoso de IP desconocida
 * // Opción: desconectar al usuario inmediatamente
 * const affected = await deleteAllUserSessions(userId)
 * await logAudit('OMNIBUS_REVOKE', {
 *   userId,
 *   reason: 'Suspicious activity detected',
 *   sessionsRevoked: affected
 * })
 * ```
 *
 * **Seguridad**:
 * - Logout inmediato en todos los dispositivos
 * - Sin posibilidad de uso de JWT anterior (sesión no existe en BD)
 * - Força a usuario a reautenticarse
 * - Auditable: cuántas sesiones se revocaron
 *
 * **Performance**:
 * - Operación rápida (DELETE por userId)
 * - Índice en userId acelera query
 *
 * @async
 * @param {string} userId - ID del usuario
 * @returns {Promise<number>} Cantidad total de sesiones eliminadas
 *
 * @example
 * ```typescript
 * const total = await deleteAllUserSessions('user_456')
 * console.log(`${total} sesiones revocadas`) // Ej: "5 sesiones revocadas"
 * // Usuario está desconectado en todos los dispositivos
 * ```
 *
 * @see {@link deleteOtherUserSessions} para eliminar todos excepto actual
 * @see {@link deleteSession} para eliminar una sesión específica
 * @see {@link changeUserPassword} en user-queries que usa esta función
 */
export async function deleteAllUserSessions(userId: string): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { userId },
  })

  return result.count
}

/**
 * Limpia sesiones expiradas de la base de datos
 *
 * Elimina registros de sesión que han expirado (expires < now()).
 * Se debe ejecutar como tarea programada (cron job) para mantenimiento.
 *
 * **Cuándo se Ejecuta**:
 * - Cron job automático cada X horas (ej: cada 1-6 horas)
 * - Comando manual de mantenimiento: `npm run db:cleanup-sessions`
 * - Durante backup o mantenimiento de BD
 *
 * **Comportamiento**:
 * - Busca sesiones con `expires < now()`
 * - Las elimina de la BD (no son usadas de todas formas)
 * - Retorna cantidad eliminada
 *
 * **Por Qué Limpiar**:
 * - Sesiones expiradas no son accesibles (JWT inválido)
 * - Ocupan espacio en BD (datos "muertos")
 * - Ralentizan queries si hay millones de registros
 * - Buena práctica: mantener BD limpia
 *
 * **Frecuencia Recomendada**:
 * - Cada 6 horas para aplicaciones medianas
 * - Cada 24 horas para aplicaciones pequeñas
 * - Cada 1 hora para aplicaciones de alto volumen
 *
 * **Ejemplo - Cron Job**:
 * ```typescript
 * // En lib/cron.ts
 * import cron from 'node-cron'
 *
 * // Ejecutar cada 6 horas
 * cron.schedule('0 *\/6 * * *', async () => {
 *   const cleaned = await cleanExpiredSessions()
 *   console.log(`Cleaned ${cleaned} expired sessions`)
 * })
 * ```
 *
 * **Ejemplo - Manual**:
 * ```bash
 * # En package.json scripts
 * "scripts": {
 *   "db:cleanup": "ts-node scripts/cleanup-sessions.ts"
 * }
 *
 * # Ejecutar
 * npm run db:cleanup
 * # "Cleaned 1,234 expired sessions"
 * ```
 *
 * **Seguridad**:
 * - No afecta sesiones activas (expires > now())
 * - No revoca acceso de usuarios (solo elimina datos viejos)
 * - Seguro ejecutar sin afectar usuarios logueados
 *
 * @async
 * @returns {Promise<number>} Cantidad de sesiones expiradas eliminadas
 *
 * @example
 * ```typescript
 * const cleaned = await cleanExpiredSessions()
 * console.log(`Cleaned ${cleaned} sessions`) // Ej: "Cleaned 1234 sessions"
 * ```
 *
 * @see {@link countActiveSessions} para contar sesiones activas (no expiradas)
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
 * Cuenta las sesiones ACTIVAS de un usuario (no expiradas)
 *
 * Retorna cantidad de sesiones donde `expires > now()`.
 * Útil para limitar dispositivos concurrentes o auditoría.
 *
 * **Casos de Uso**:
 * - Contar sesiones activas sin traer todos los detalles
 * - Implementar límite: máximo 5 dispositivos simultáneos
 * - Auditoría: cuántos dispositivos están activos ahora
 * - Validación: antes de permitir crear nueva sesión
 *
 * **Rendimiento vs getUserSessions**:
 * - `countActiveSessions()`: retorna solo número (COUNT query, muy rápido)
 * - `getUserSessions()`: retorna objetos completos (SELECT query)
 * - Usar count cuando solo importa cantidad
 *
 * **Ejemplo - Limitar Dispositivos**:
 * ```typescript
 * // POST /api/auth/signin
 * const maxDevices = 5
 * const count = await countActiveSessions(userId)
 *
 * if (count >= maxDevices) {
 *   return res.status(429).json({
 *     error: `Ya tienes ${count} sesiones activas`,
 *     message: 'Cierra sesión en otro dispositivo primero'
 *   })
 * }
 *
 * // Permitir nuevo login
 * await createSession({...})
 * ```
 *
 * **Ejemplo - Auditoría**:
 * ```typescript
 * // Reportar: cuántos usuarios logueados en este momento
 * const userIds = [...]
 * const activeCounts = await Promise.all(
 *   userIds.map(uid => countActiveSessions(uid))
 * )
 * const totalActive = activeCounts.reduce((a,b) => a+b, 0)
 * console.log(`Total usuarios activos: ${totalActive}`)
 * ```
 *
 * @async
 * @param {string} userId - ID del usuario
 * @returns {Promise<number>} Cantidad de sesiones activas (expires > now())
 *
 * @example
 * ```typescript
 * const count = await countActiveSessions('user_456')
 * console.log(`${count} sesiones activas`) // Ej: "3 sesiones activas"
 * ```
 *
 * @see {@link getUserSessions} para obtener detalles completos de sesiones
 * @see {@link createSession} que puede usar esta función para validar límites
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
