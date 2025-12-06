/**
 * Tipos para Gestión de Sesiones - Aurora Nova
 *
 * Define interfaces para el sistema híbrido de sesiones que combina:
 * - **JWT**: Token autofirmado para autenticación rápida (sin consultas a BD)
 * - **Database**: Tabla sessions para gestión manual y control de acceso
 *
 * **Arquitectura Híbrida**:
 * ```
 * Login exitoso
 *   ↓
 * NextAuth genera JWT (firmado con AUTH_SECRET)
 *   ↓
 * Se guarda sesión en BD con sessionToken=JWT.jti (JTI = JWT ID)
 *   ↓
 * Client recibe cookie con JWT
 *   ↓
 * En cada request: JWT valida (firma), se consulta BD para validar sesión activa
 *   ↓
 * Logout: se elimina sesión de BD, JWT sigue válido pero se rechaza
 * (recomendado: invalidar JWT en cliente también)
 * ```
 *
 * **Ventajas**:
 * - ✓ JWT sin BD: rápido para validación básica
 * - ✓ BD para control fino: logout omnibus, revocación rápida
 * - ✓ IP/UserAgent: detectar actividad sospechosa
 * - ✓ Múltiples sesiones: gestionar dispositivos del usuario
 *
 * **Flujos Típicos**:
 * 1. **Login**: Crear JWT + guardar en sesiones table
 * 2. **Validación**: JWT válido + sesión existe en BD = autenticado
 * 3. **Logout Simple**: Eliminar sesión de BD (JWT sigue válido hasta expirar)
 * 4. **Logout Omnibus**: Eliminar todas las sesiones del usuario (logout de todos los dispositivos)
 * 5. **Listar Dispositivos**: Mostrar todas las sesiones activas (con browser/OS parseado)
 *
 * **Columnas de Base de Datos** (sesiones table):
 * ```sql
 * CREATE TABLE sessions (
 *   sessionToken VARCHAR PRIMARY KEY,  -- JWT JTI (ID único del token)
 *   userId UUID NOT NULL,              -- FK a users.id
 *   expires TIMESTAMP NOT NULL,        -- Fecha de expiración (default: 30 días)
 *   createdAt TIMESTAMP DEFAULT now(), -- Cuándo se creó la sesión
 *   ipAddress VARCHAR,                 -- IP del cliente (para seguridad)
 *   userAgent VARCHAR,                 -- User-Agent del navegador (para identificar dispositivo)
 *   FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
 * )
 * ```
 *
 * **Interfaces Incluidas**:
 * - `SessionInfo`: Información básica de una sesión (de la BD)
 * - `CreateSessionData`: Datos necesarios para crear sesión (desde JWT)
 * - `SessionDetails`: SessionInfo + detalles parseados (para UI)
 * - `ListSessionsOptions`: Opciones para listar sesiones del usuario
 * - `SessionOperationResult`: Resultado de operación (create, delete, etc)
 *
 * @module shared/types/session
 * @see {@link ../api/session-queries.ts} para funciones de BD (listSessions, deleteSession, etc)
 * @see {@link ../utils/session-utils.ts} para helpers (generateSessionToken, parseUserAgent, etc)
 * @see {@link ../../../lib/auth/auth.ts} para NextAuth callbacks que usan estas interfaces
 */

/**
 * Información Completa de una Sesión de Base de Datos
 *
 * Representa un registro de sesión almacenado en la tabla sessions.
 * Se usa para gestionar, auditar y validar sesiones activas del usuario.
 *
 * **Origen**: Recuperado desde BD (query `SELECT * FROM sessions WHERE ...`)
 *
 * **Uso Típico**:
 * - Listar sesiones activas del usuario (para UI "Tu Dispositivos")
 * - Validar que sesión sea activa (en session callback)
 * - Auditar acceso (IP, device, timestamp)
 * - Logout de dispositivos específicos
 *
 * **Ciclo de Vida**:
 * 1. Se crea al hacer login (junto con JWT)
 * 2. Persiste en BD hasta `expires`
 * 3. Se elimina manualmente (logout) o automáticamente (expires)
 *
 * @interface SessionInfo
 * @example
 * ```typescript
 * // Desde BD
 * const session: SessionInfo = {
 *   sessionToken: '550e8400-e29b-41d4-a716-446655440000', // UUID v4 (JWT.jti)
 *   userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 *   expires: new Date('2025-01-04T12:00:00Z'), // 30 días desde login
 *   createdAt: new Date('2024-12-05T12:00:00Z'),
 *   ipAddress: '192.168.1.100',
 *   userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0'
 * }
 * ```
 */
export interface SessionInfo {
  /**
   * ID único de sesión (JWT ID)
   *
   * Es el `jti` claim del JWT generado por NextAuth.
   * Usado como PRIMARY KEY en tabla sessions para asociar JWT con BD.
   * UUID v4 generado automáticamente por NextAuth.
   *
   * **Propósito**:
   * - Identificar sesión único en BD
   * - Prevenir reutilización de JWT revocado
   * - Logout omnibus: borrar todos los sessionToken del usuario
   *
   * @type {string}
   * @required
   * @example '550e8400-e29b-41d4-a716-446655440000'
   */
  sessionToken: string

  /**
   * ID del usuario (Foreign Key)
   *
   * UUID del usuario propietario de esta sesión.
   * Permite asociar sesión con usuario, auditar acceso, listar dispositivos.
   *
   * **Uso**:
   * - Agrupar sesiones por usuario
   * - Validar que usuario sea el dueño de sesión
   * - Logout omnibus (borrar todas sesiones del usuario)
   *
   * @type {string}
   * @required
   * @example 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
   */
  userId: string

  /**
   * Fecha de expiración de la sesión
   *
   * Cuándo esta sesión deja de ser válida.
   * Default: 30 días desde createdAt (configurable en auth config).
   * Después de esta fecha, JWT es rechazado aunque sea válido.
   *
   * **Gestión**:
   * - Validar en session callback: `if (session.expires > now) { valid }`
   * - Limpiar sesiones expiradas (batch job recomendado)
   * - Usuario puede extender (refresh token) o crear nueva
   *
   * **Nota**: NextAuth TAMBIÉN expira JWT con `exp` claim.
   * Si BD.expires < JWT.exp, la BD expira primero (control fino).
   *
   * @type {Date}
   * @required
   * @example new Date('2025-01-04T12:00:00Z')
   */
  expires: Date

  /**
   * Fecha de creación de la sesión
   *
   * Cuándo el usuario hizo login y se creó esta sesión.
   * Útil para auditoría, timeline, y detectar sesiones antiguas.
   *
   * **Cálculos**:
   * - Edad de sesión: `now - createdAt`
   * - Tiempo restante: `expires - now`
   * - Default expiry: 30 días (expires = createdAt + 30 days)
   *
   * @type {Date}
   * @required
   * @example new Date('2024-12-05T12:00:00Z')
   */
  createdAt: Date

  /**
   * Dirección IP del cliente que creó la sesión
   *
   * IP pública del navegador que hizo login.
   * Usado para auditoría, detectar cambios geográficos, prevenir account takeover.
   *
   * **Obtención**:
   * - En NextAuth callback: `req.headers['x-forwarded-for']` o similar
   * - Ver auth.ts para extracción de IP
   *
   * **Casos de Uso**:
   * - Mostrar "accediste desde 192.168.1.100 el 5 dic a las 12:00"
   * - Alerta: "acceso desde IP desconocida (París)"
   * - Logout forzado si IP sospechosa
   *
   * **Nota**: Nullable porque algunos clientes pueden no reportar IP
   * (proxies, VPNs, navegadores privados).
   *
   * @type {string | null}
   * @optional
   * @example '192.168.1.100' or null
   */
  ipAddress: string | null

  /**
   * User-Agent del navegador que creó la sesión
   *
   * Información completa del navegador/dispositivo del cliente.
   * Usado para identificar tipo de dispositivo (desktop, mobile, tablet).
   * Se parsea con `parseUserAgent()` para obtener browser, OS, device.
   *
   * **Obtención**:
   * - En NextAuth callback: `req.headers['user-agent']`
   * - Ver auth.ts para captura
   *
   * **Formato Raw** (ejemplo):
   * ```
   * Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
   * (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
   * ```
   *
   * **Después de Parsear** (en SessionDetails):
   * ```
   * browser: 'Chrome 131.0'
   * os: 'Windows 10'
   * device: 'desktop'
   * ```
   *
   * **Nota**: Nullable porque algunos clientes pueden tener UA vacío.
   *
   * @type {string | null}
   * @optional
   * @example 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0'
   * @see {@link SessionDetails} para versión parseada
   */
  userAgent: string | null
}

/**
 * Datos para Crear una Nueva Sesión en Base de Datos
 *
 * Parámetros necesarios para guardar una sesión en la tabla sessions.
 * Se usa en el JWT callback de NextAuth cuando el login es exitoso.
 *
 * **Origen**: Se construye en NextAuth JWT callback
 *
 * **Flujo**:
 * ```typescript
 * async callbacks.jwt({ token, user, account }) {
 *   // En primer login: user existe
 *   if (user) {
 *     const createData: CreateSessionData = {
 *       sessionToken: token.jti, // JWT ID único
 *       userId: user.id,
 *       expires: token.exp (convertida a Date),
 *       ipAddress: req.headers['x-forwarded-for'],
 *       userAgent: req.headers['user-agent']
 *     }
 *     await createSession(createData)
 *   }
 *   return token
 * }
 * ```
 *
 * @interface CreateSessionData
 * @example
 * ```typescript
 * const createData: CreateSessionData = {
 *   sessionToken: '550e8400-e29b-41d4-a716-446655440000',
 *   userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 *   expires: new Date('2025-01-04T12:00:00Z'),
 *   ipAddress: '192.168.1.100',
 *   userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0'
 * }
 * ```
 *
 * @see {@link SessionInfo} tipo después de crear en BD
 * @see {@link ../api/session-queries.ts} función createSession()
 */
export interface CreateSessionData {
  /**
   * ID único del JWT (JWT ID)
   *
   * El claim `jti` del JWT generado por NextAuth.
   * UUID v4 que identifica de forma única este token.
   * Se usa como PRIMARY KEY en la tabla sessions para asociar JWT con BD.
   *
   * **Origen**: `token.jti` en JWT callback
   *
   * **Propósito**:
   * - Asociar JWT con sesión de BD
   * - Logout omnibus: obtener todos los sessionToken del usuario
   * - Validación: confirmar que sessionToken existe en BD
   *
   * @type {string}
   * @required
   * @example '550e8400-e29b-41d4-a716-446655440000'
   */
  sessionToken: string

  /**
   * ID del usuario propietario de la sesión
   *
   * UUID del usuario que está haciendo login.
   * Se asigna como Foreign Key a users.id.
   *
   * **Origen**: `user.id` en JWT callback
   *
   * @type {string}
   * @required
   * @example 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
   */
  userId: string

  /**
   * Fecha de expiración de la sesión
   *
   * Cuándo esta sesión deja de ser válida.
   * Típicamente 30 días desde ahora.
   *
   * **Origen**: Calculada como `now + SESSION_EXPIRY_DAYS` en JWT callback
   * (o desde `token.exp`)
   *
   * **Gestión**:
   * - BD valida: `if (session.expires > now) { valid }`
   * - JWT también valida con su `exp` claim
   * - Limpiar expiradas con batch job (recomendado)
   *
   * @type {Date}
   * @required
   * @example new Date('2025-01-04T12:00:00Z')
   */
  expires: Date

  /**
   * Dirección IP del cliente (opcional)
   *
   * IP pública del navegador que hace login.
   * Usado para auditoría y detectar accesos sospechosos.
   *
   * **Obtención**:
   * - NextAuth callback: `req.headers['x-forwarded-for'] || req.headers['x-real-ip']`
   * - En desarrollo local: probablemente '127.0.0.1' o '::1'
   *
   * **Nota**: Nullable porque algunos proxies/VPNs no reportan IP.
   * En tal caso, guardar como null.
   *
   * @type {string}
   * @optional
   * @example '192.168.1.100'
   */
  ipAddress?: string

  /**
   * User-Agent del navegador/cliente (opcional)
   *
   * Información completa del navegador y dispositivo.
   * Usado para identificar tipo de dispositivo (desktop/mobile/tablet).
   *
   * **Obtención**:
   * - NextAuth callback: `req.headers['user-agent']`
   *
   * **Parsing**:
   * - Se guarda raw aquí (para auditoría)
   * - Se parsea con `parseUserAgent()` cuando se recupera (para UI)
   * - Ver SessionDetails para versión parseada
   *
   * **Nota**: Nullable porque algunos clientes pueden tener UA vacío.
   *
   * @type {string}
   * @optional
   * @example 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0'
   * @see {@link SessionDetails} versión parseada con browser, os, device
   */
  userAgent?: string
}

/**
 * Información de Sesión Enriquecida para Interfaz de Usuario
 *
 * Extiende SessionInfo con campos parseados del userAgent.
 * Se usa para mostrar al usuario "Tus Dispositivos" con información legible.
 *
 * **Origen**: Se crea en el cliente/servidor parseando SessionInfo
 *
 * **Construcción**:
 * ```typescript
 * async function getSessionDetails(sessionInfo: SessionInfo): SessionDetails {
 *   const parsed = parseUserAgent(sessionInfo.userAgent)
 *   return {
 *     ...sessionInfo,
 *     isCurrent: sessionInfo.sessionToken === currentSessionToken,
 *     browser: parsed.browser,     // 'Chrome 131.0'
 *     os: parsed.os,               // 'Windows 10'
 *     device: parsed.device        // 'desktop'
 *   }
 * }
 * ```
 *
 * **Uso Típico** (UI):
 * ```tsx
 * // Mostrar sesión enriquecida al usuario
 * <div>
 *   <p>{session.browser} en {session.os}</p>
 *   <p>IP: {session.ipAddress}</p>
 *   <p>Creado: {session.createdAt.toLocaleString()}</p>
 *   <button onClick={() => logoutDevice(session.sessionToken)}>
 *     Cerrar sesión
 *   </button>
 * </div>
 * ```
 *
 * @interface SessionDetails
 * @extends SessionInfo
 * @example
 * ```typescript
 * const details: SessionDetails = {
 *   // Heredados de SessionInfo
 *   sessionToken: '550e8400-e29b-41d4-a716-446655440000',
 *   userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 *   expires: new Date('2025-01-04T12:00:00Z'),
 *   createdAt: new Date('2024-12-05T12:00:00Z'),
 *   ipAddress: '192.168.1.100',
 *   userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0',
 *   // Nuevos - parseados
 *   isCurrent: true,
 *   browser: 'Chrome 131.0',
 *   os: 'Windows 10',
 *   device: 'desktop'
 * }
 * ```
 *
 * @see {@link SessionInfo} para versión sin parsear
 * @see {@link ../utils/session-utils.ts} función parseUserAgent()
 */
export interface SessionDetails extends SessionInfo {
  /**
   * Si es la sesión actual del usuario
   *
   * Indica si esta sesión es la que está usando el usuario ahora mismo.
   * Se usa para highlight en la UI ("Esta sesión").
   *
   * **Cálculo**:
   * ```typescript
   * isCurrent = sessionToken === currentSessionToken
   * // currentSessionToken = del JWT actual del usuario
   * ```
   *
   * **Uso**:
   * - Mostrar "Esta sesión (actual)" en la UI
   * - Deshabilitar botón "Cerrar sesión" en dispositivo actual
   * - Resaltar (color, icono) en lista de dispositivos
   *
   * @type {boolean}
   * @required
   * @example true or false
   */
  isCurrent: boolean

  /**
   * Navegador y versión (parseado del userAgent)
   *
   * Nombre del navegador y versión extraído del userAgent raw.
   * Ej: "Chrome 131.0", "Firefox 133.0", "Safari 18.1.1"
   *
   * **Obtención**:
   * - parseUserAgent() analiza el userAgent raw
   * - Detecta navegador, versión
   * - Soporta: Chrome, Firefox, Safari, Edge, Opera, etc.
   *
   * **Uso**:
   * - Mostrar al usuario "Chrome 131.0 en Windows 10"
   * - Detectar navegadores obsoletos (seguridad)
   * - Analytics: qué navegadores usan los usuarios
   *
   * **Nota**: Opcional porque userAgent puede ser null o no parseble.
   *
   * @type {string}
   * @optional
   * @example 'Chrome 131.0' or 'Firefox 133.0'
   * @see {@link ../utils/session-utils.ts} función parseUserAgent()
   */
  browser?: string

  /**
   * Sistema operativo (parseado del userAgent)
   *
   * Nombre del SO y versión extraído del userAgent raw.
   * Ej: "Windows 10", "macOS 15.1", "Ubuntu 22.04", "iOS 18.1"
   *
   * **Obtención**:
   * - parseUserAgent() analiza el userAgent raw
   * - Detecta SO: Windows, macOS, Linux, iOS, Android, etc.
   *
   * **Uso**:
   * - Mostrar al usuario "Chrome en Windows 10"
   * - Detectar patrones de dispositivo
   * - Analytics: qué dispositivos usan los usuarios
   *
   * **Nota**: Opcional porque userAgent puede ser null.
   *
   * @type {string}
   * @optional
   * @example 'Windows 10' or 'macOS 15.1'
   * @see {@link ../utils/session-utils.ts} función parseUserAgent()
   */
  os?: string

  /**
   * Tipo de dispositivo (parseado del userAgent)
   *
   * Categoría del dispositivo: 'desktop', 'mobile', 'tablet', 'unknown'
   * Se infiere del userAgent analizando patrones conocidos.
   *
   * **Obtención**:
   * - parseUserAgent() detecta:
   *   - "Mobile" en UA → mobile
   *   - "Tablet" o "iPad" → tablet
   *   - Sin móvil/tablet → desktop
   *   - No parseble → unknown
   *
   * **Uso**:
   * - Mostrar icono según dispositivo (📱 mobile, 💻 desktop)
   * - Seguridad: alerta si login desde tipo nuevo (ej: tablet si siempre desktop)
   * - Analytics: distribution de dispositivos
   *
   * **Nota**: Opcional porque userAgent puede ser null.
   *
   * @type {string}
   * @optional
   * @example 'desktop' | 'mobile' | 'tablet' | 'unknown'
   * @see {@link ../utils/session-utils.ts} función parseUserAgent()
   */
  device?: string
}

/**
 * Opciones para Listar Sesiones de un Usuario
 *
 * Parámetros de configuración para la consulta listSessions().
 * Permite filtrar y controlar qué sesiones se recuperan.
 *
 * **Uso Típico**:
 * ```typescript
 * // En página "Tus Dispositivos"
 * const options: ListSessionsOptions = {
 *   userId: currentUser.id,
 *   includeExpired: false,        // Solo sesiones activas
 *   currentSessionToken: jwt.jti  // Para marcar "esta sesión"
 * }
 * const sessions = await listSessions(options)
 * ```
 *
 * @interface ListSessionsOptions
 * @example
 * ```typescript
 * const options: ListSessionsOptions = {
 *   userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 *   includeExpired: false,
 *   currentSessionToken: '550e8400-e29b-41d4-a716-446655440000'
 * }
 * ```
 *
 * @see {@link ../api/session-queries.ts} función listSessions(options)
 */
export interface ListSessionsOptions {
  /**
   * ID del usuario propietario de las sesiones
   *
   * Sesiones a recuperar: todas las de este userId.
   *
   * **Validación**:
   * - Debe ser UUID válido
   * - Usuario debe existir en BD
   * - Usuario actual debe coincidir con userId (por seguridad)
   *
   * @type {string}
   * @required
   * @example 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
   */
  userId: string

  /**
   * Incluir sesiones expiradas en la lista
   *
   * Si false (default): solo retorna sesiones activas (expires > now)
   * Si true: retorna todas las sesiones (activas + expiradas)
   *
   * **Default**: false
   *
   * **Casos de Uso**:
   * - false: Para "Tus Dispositivos" (mostrar solo dispositivos activos)
   * - true: Para auditoría (historial completo de accesos)
   *
   * @type {boolean}
   * @optional
   * @default false
   * @example false
   */
  includeExpired?: boolean

  /**
   * Token de sesión actual (para marcar en UI)
   *
   * El sessionToken del usuario actual (desde JWT.jti).
   * Se usa para marcar cuál es la sesión actual en la respuesta.
   *
   * **Origen**:
   * - En servidor: `(await getServerSession()).sessionToken`
   * - En cliente: `session.sessionToken` (si está disponible)
   *
   * **Usado para**:
   * - Marcar sesión actual como "Esta sesión (actual)"
   * - Opcionalmente: deshabilitar botón "Cerrar sesión" en dispositivo actual
   *
   * **Nota**: Opcional, si no se proporciona ninguna sesión se marca como actual.
   *
   * @type {string}
   * @optional
   * @example '550e8400-e29b-41d4-a716-446655440000'
   * @see {@link SessionDetails} para campo isCurrent en respuesta
   */
  currentSessionToken?: string
}

/**
 * Resultado de Operaciones de Sesión (create, delete, logout)
 *
 * Respuesta estándar para operaciones que no retornan datos específicos,
 * solo éxito/error de la operación.
 *
 * **Uso Típico**:
 * ```typescript
 * // Logout de dispositivo específico
 * const result = await deleteSession(sessionToken)
 * if (result.success) {
 *   console.log(result.message) // "Sesión cerrada"
 * } else {
 *   console.error(result.error) // "Sesión no encontrada"
 * }
 * ```
 *
 * **Operaciones que retornan esto**:
 * - createSession()
 * - deleteSession() (logout de dispositivo)
 * - logoutAll() (logout de todos los dispositivos)
 *
 * @interface SessionOperationResult
 * @example
 * ```typescript
 * // Éxito
 * const result: SessionOperationResult = {
 *   success: true,
 *   message: 'Sesión cerrada correctamente'
 * }
 *
 * // Error
 * const result: SessionOperationResult = {
 *   success: false,
 *   error: 'Sesión no encontrada'
 * }
 * ```
 *
 * @see {@link ../api/session-queries.ts} para funciones que retornan esto
 */
export interface SessionOperationResult {
  /**
   * Si la operación fue exitosa
   *
   * true = operación completada sin errores
   * false = operación falló (ver campo error)
   *
   * @type {boolean}
   * @required
   * @example true or false
   */
  success: boolean

  /**
   * Mensaje descriptivo de éxito (opcional)
   *
   * Mensaje amigable para mostrar al usuario en caso de éxito.
   * Ej: "Sesión cerrada correctamente", "Dispositivo removido"
   *
   * **Nota**: Solo presente si success=true.
   *
   * @type {string}
   * @optional
   * @example 'Sesión cerrada correctamente'
   */
  message?: string

  /**
   * Mensaje descriptivo de error (opcional)
   *
   * Mensaje de error técnico/amigable para mostrar si operación falla.
   * Ej: "Sesión no encontrada", "Error al eliminar de BD"
   *
   * **Seguridad**:
   * - En desarrollo: puede ser mensaje técnico
   * - En producción: usar mensajes genéricos (no exponer detalles de BD)
   *
   * **Nota**: Solo presente si success=false.
   *
   * @type {string}
   * @optional
   * @example 'Sesión no encontrada'
   */
  error?: string
}
