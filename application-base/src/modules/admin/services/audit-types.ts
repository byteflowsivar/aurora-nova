/**
 * Módulo de Tipos para Sistema de Auditoría - Aurora Nova
 *
 * Define tipos e interfaces para el sistema de auditoría centralizado.
 * Proporciona un registro completo de todas las acciones del sistema para cumplimiento
 * y análisis de seguridad.
 *
 * **Características**:
 * - Registro detallado de cambios (oldValues, newValues)
 * - Información del contexto (IP, User Agent, Request ID)
 * - Capacidad de filtrado avanzado con paginación
 * - Correlación de eventos con Request ID
 * - Metadata flexible para datos adicionales
 * - Información del usuario que realizó la acción
 *
 * **Componentes Principales**:
 * 1. **AuditLogInput** - Datos para registrar una acción en auditoría
 * 2. **AuditLogFilters** - Opciones de filtrado y paginación
 * 3. **AuditLogResult** - Resultado paginado de consultas
 * 4. **AuditLogWithUser** - Log completo con información del usuario
 *
 * **Flujo Típico**:
 * ```
 * Usuario realiza acción
 *   ↓
 * Server Action captura cambios
 *   ↓
 * logAuditEvent(AuditLogInput) registra en BD
 *   ↓
 * queryAuditLogs(AuditLogFilters) consulta logs
 *   ↓
 * Retorna AuditLogResult con paginación
 * ```
 *
 * **Ejemplo de Caso de Uso**:
 * ```typescript
 * // 1. Admin crea nuevo usuario
 * const newUser = await createUser(userData)
 *
 * // 2. Registrar en auditoría
 * await logAuditEvent({
 *   userId: currentUser.id,
 *   action: 'create',
 *   module: 'users',
 *   area: 'admin',
 *   entityType: 'User',
 *   entityId: newUser.id,
 *   newValues: { email: newUser.email, firstName: newUser.firstName },
 *   ipAddress: req.ip,
 *   userAgent: req.headers['user-agent'],
 *   requestId: req.id
 * })
 *
 * // 3. Admin consulta logs
 * const result = await queryAuditLogs({
 *   module: 'users',
 *   startDate: new Date('2024-12-01'),
 *   limit: 20,
 *   offset: 0
 * })
 * ```
 *
 * @module admin/services/audit-types
 * @see {@link ./audit-service.ts} para implementación del servicio
 * @see {@link ../hooks/use-audit-logs.ts} para hook de React
 */

/**
 * Datos de entrada para registrar un evento en la auditoría
 *
 * Interfaz que define los datos capturados cuando ocurre una acción auditada.
 * Se envía al servicio de auditoría para ser registrada en la base de datos.
 * La mayoría de campos son opcionales para flexibilidad (ej: acciones de sistema no tienen userId).
 *
 * **Campos de Identidad**:
 * - `userId`: ID del usuario que realizó la acción (null para acciones del sistema)
 * - `action`: Tipo de acción ("create", "update", "delete", "login", etc)
 * - `module`: Módulo del sistema afectado ("users", "roles", "auth", etc)
 *
 * **Campos de Contexto**:
 * - `area`: Área de la aplicación ("admin", "public", "api")
 * - `entityType`: Tipo de entidad afectada ("User", "Role", "Permission")
 * - `entityId`: ID específico de la entidad
 *
 * **Datos de Cambio**:
 * - `oldValues`: Estado anterior (para updates/deletes)
 * - `newValues`: Estado nuevo (para creates/updates)
 *
 * **Información Técnica**:
 * - `ipAddress`: IP del cliente que hizo la solicitud
 * - `userAgent`: User Agent del navegador/cliente
 * - `requestId`: ID de solicitud para correlacionar eventos
 * - `metadata`: Datos adicionales clave-valor
 *
 * **Ejemplo - Crear Usuario**:
 * ```typescript
 * const auditInput: AuditLogInput = {
 *   userId: 'admin-user-id',
 *   action: 'create',
 *   module: 'users',
 *   area: 'admin',
 *   entityType: 'User',
 *   entityId: newUser.id,
 *   newValues: {
 *     email: newUser.email,
 *     firstName: newUser.firstName,
 *     lastName: newUser.lastName
 *   },
 *   ipAddress: request.headers.get('x-forwarded-for'),
 *   userAgent: request.headers.get('user-agent'),
 *   requestId: crypto.randomUUID(),
 *   metadata: {
 *     source: 'web_ui',
 *     timestamp: new Date().toISOString()
 *   }
 * }
 * ```
 *
 * **Ejemplo - Actualizar Usuario**:
 * ```typescript
 * const auditInput: AuditLogInput = {
 *   userId: 'admin-user-id',
 *   action: 'update',
 *   module: 'users',
 *   area: 'admin',
 *   entityType: 'User',
 *   entityId: user.id,
 *   oldValues: {
 *     firstName: oldUser.firstName,
 *     role: oldUser.role
 *   },
 *   newValues: {
 *     firstName: updatedUser.firstName,
 *     role: updatedUser.role
 *   },
 *   ipAddress: request.headers.get('x-forwarded-for'),
 *   userAgent: request.headers.get('user-agent'),
 *   requestId: crypto.randomUUID()
 * }
 * ```
 *
 * **Ejemplo - Acción del Sistema** (sin userId):
 * ```typescript
 * const auditInput: AuditLogInput = {
 *   action: 'system_check',
 *   module: 'health',
 *   area: 'system',
 *   metadata: {
 *     status: 'ok',
 *     responseTime: '125ms'
 *   }
 * }
 * ```
 *
 * **Patrón de Captura en Server Action**:
 * ```typescript
 * async function updateUserAction(userId: string, data: UpdateUserData) {
 *   // 1. Obtener usuario actual
 *   const oldUser = await db.user.findUnique({ where: { id: userId } })
 *
 *   // 2. Actualizar
 *   const newUser = await db.user.update({ where: { id: userId }, data })
 *
 *   // 3. Registrar en auditoría
 *   await logAuditEvent({
 *     userId: getCurrentUserId(), // Del contexto de sesión
 *     action: 'update',
 *     module: 'users',
 *     area: 'admin',
 *     entityType: 'User',
 *     entityId: userId,
 *     oldValues: {
 *       firstName: oldUser.firstName,
 *       email: oldUser.email
 *     },
 *     newValues: {
 *       firstName: newUser.firstName,
 *       email: newUser.email
 *     },
 *     ipAddress: getRequestIP(), // Del contexto de request
 *     userAgent: getRequestUserAgent(),
 *     requestId: getRequestId()
 *   })
 *
 *   return { success: true, data: newUser }
 * }
 * ```
 *
 * @interface
 * @see {@link AuditLogFilters} para filtrar logs
 * @see {@link AuditLogWithUser} para resultado con usuario
 */
export interface AuditLogInput {
  /** ID del usuario que realizó la acción (null/undefined para acciones del sistema) */
  userId?: string

  /** Tipo de acción realizada (ej: "create", "update", "delete", "login", "logout") */
  action: string

  /** Módulo del sistema afectado (ej: "users", "roles", "auth", "permissions", "system") */
  module: string

  /** Área de la aplicación (ej: "admin", "public", "api") */
  area?: string

  /** Tipo de entidad afectada (ej: "User", "Role", "Permission") */
  entityType?: string

  /** ID de la entidad específica afectada */
  entityId?: string

  /** Estado anterior de la entidad (para updates/deletes, captura cambios) */
  oldValues?: Record<string, unknown>

  /** Estado nuevo de la entidad (para creates/updates) */
  newValues?: Record<string, unknown>

  /** Dirección IP del cliente que originó la solicitud */
  ipAddress?: string

  /** User Agent del navegador/cliente */
  userAgent?: string

  /** ID de solicitud para correlacionar eventos relacionados */
  requestId?: string

  /** Metadata adicional flexible (ej: source, timestamp, additional context) */
  metadata?: Record<string, unknown>
}

/**
 * Opciones de filtrado y paginación para consultar logs de auditoría
 *
 * Interfaz para consultas flexibles de registros de auditoría con múltiples filtros
 * y paginación offset-based. Todos los filtros son opcionales (AND logic cuando se combinan).
 *
 * **Filtros por Identidad**:
 * - `userId`: Filtrar acciones de usuario específico
 * - `module`: Filtrar por módulo del sistema
 * - `action`: Filtrar por tipo de acción
 *
 * **Filtros por Contexto**:
 * - `area`: Filtrar por área de aplicación
 * - `entityType`: Filtrar por tipo de entidad
 * - `entityId`: Filtrar por entidad específica
 * - `requestId`: Filtrar por request (correlaciona eventos)
 *
 * **Filtros Temporales**:
 * - `startDate`: Fecha mínima inclusive
 * - `endDate`: Fecha máxima inclusive
 *
 * **Paginación**:
 * - `limit`: Máximo de resultados (default: 50, max: 500)
 * - `offset`: Cantidad a saltar (default: 0)
 *
 * **Validaciones**:
 * - Si startDate > endDate: error o intercambiar automáticamente
 * - limit debe estar entre 1 y 500
 * - offset debe ser >= 0
 *
 * **Ejemplo - Filtrar por Usuario**:
 * ```typescript
 * const filters: AuditLogFilters = {
 *   userId: 'user-123',
 *   limit: 20,
 *   offset: 0
 * }
 * const result = await queryAuditLogs(filters)
 * // Devuelve todas las acciones del user-123
 * ```
 *
 * **Ejemplo - Filtrar por Rango de Fechas**:
 * ```typescript
 * const filters: AuditLogFilters = {
 *   startDate: new Date('2024-12-01'),
 *   endDate: new Date('2024-12-31'),
 *   module: 'users',
 *   limit: 50
 * }
 * const result = await queryAuditLogs(filters)
 * // Devuelve cambios de usuarios en diciembre
 * ```
 *
 * **Ejemplo - Correlacionar con Request ID**:
 * ```typescript
 * const filters: AuditLogFilters = {
 *   requestId: 'req-xyz-123',
 *   limit: 100
 * }
 * const result = await queryAuditLogs(filters)
 * // Devuelve TODOS los logs de una solicitud específica
 * ```
 *
 * **Ejemplo - Filtro Complejo**:
 * ```typescript
 * const filters: AuditLogFilters = {
 *   userId: 'admin-456',
 *   module: 'users',
 *   action: 'create',
 *   area: 'admin',
 *   entityType: 'User',
 *   startDate: new Date('2024-12-01'),
 *   endDate: new Date('2024-12-31'),
 *   limit: 25,
 *   offset: 50
 * }
 * const result = await queryAuditLogs(filters)
 * // Usuarios creados por admin-456 en diciembre (página 3)
 * ```
 *
 * **Paginación**:
 * ```typescript
 * // Página 1: offset=0, limit=20
 * const page1 = await queryAuditLogs({ limit: 20, offset: 0 })
 *
 * // Página 2: offset=20, limit=20
 * const page2 = await queryAuditLogs({ limit: 20, offset: 20 })
 *
 * // Página N: offset=(N-1)*limit, limit=20
 * const pageN = await queryAuditLogs({ limit: 20, offset: (N-1)*20 })
 * ```
 *
 * @interface
 * @see {@link AuditLogResult} para resultado con paginación
 * @see {@link AuditLogInput} para registrar eventos
 */
export interface AuditLogFilters {
  /** Filtrar por ID del usuario que realizó la acción */
  userId?: string

  /** Filtrar por módulo del sistema */
  module?: string

  /** Filtrar por tipo de acción */
  action?: string

  /** Filtrar por área de la aplicación */
  area?: string

  /** Filtrar por tipo de entidad afectada */
  entityType?: string

  /** Filtrar por ID de entidad específica */
  entityId?: string

  /** Filtrar por ID de solicitud (correlaciona eventos) */
  requestId?: string

  /** Filtrar: timestamp >= startDate (inclusive) */
  startDate?: Date

  /** Filtrar: timestamp <= endDate (inclusive) */
  endDate?: Date

  /** Máximo número de resultados a devolver (default: 50, max: 500) */
  limit?: number

  /** Número de resultados a saltar para paginación (default: 0) */
  offset?: number
}

/**
 * Resultado paginado de una consulta de auditoría
 *
 * Respuesta que contiene logs de auditoría junto con información de paginación.
 * Permite navegar grandes resultados de forma eficiente.
 *
 * **Campos**:
 * - `logs`: Array de registros de auditoría con información del usuario
 * - `total`: Total de registros que coinciden con los filtros (sin paginación)
 * - `count`: Número de registros devueltos en esta respuesta
 * - `limit`: Límite aplicado en la consulta
 * - `offset`: Offset aplicado en la consulta
 * - `hasMore`: true si hay más resultados disponibles
 *
 * **Cálculo de Información de Paginación**:
 * ```typescript
 * const totalPages = Math.ceil(result.total / result.limit)
 * const currentPage = (result.offset / result.limit) + 1
 * const hasMore = result.offset + result.count < result.total
 * ```
 *
 * **Ejemplo**:
 * ```typescript
 * const result: AuditLogResult = {
 *   logs: [
 *     { id: 'log-1', action: 'create', ... },
 *     { id: 'log-2', action: 'update', ... },
 *     // ... 18 more logs
 *   ],
 *   total: 150,        // Hay 150 logs totales
 *   count: 20,         // Esta respuesta devuelve 20
 *   limit: 20,         // Se pidió máximo 20
 *   offset: 0,         // Se saltó 0 (primera página)
 *   hasMore: true      // Hay más después de estos 20
 * }
 * ```
 *
 * **Patrón de Paginación en UI**:
 * ```typescript
 * function AuditLogTable() {
 *   const [page, setPage] = useState(1)
 *   const limit = 20
 *   const offset = (page - 1) * limit
 *
 *   const { data } = useAuditLogs({ limit, offset })
 *
 *   const totalPages = Math.ceil(data.total / data.limit)
 *
 *   return (
 *     <>
 *       <Table data={data.logs} />
 *       <Pagination
 *         currentPage={page}
 *         totalPages={totalPages}
 *         onChange={setPage}
 *       />
 *     </>
 *   )
 * }
 * ```
 *
 * **Uso de hasMore para Infinite Scroll**:
 * ```typescript
 * async function loadMore() {
 *   const newOffset = logs.length
 *   const moreResult = await queryAuditLogs({ limit: 20, offset: newOffset })
 *
 *   if (moreResult.count > 0) {
 *     setLogs([...logs, ...moreResult.logs])
 *   }
 *
 *   if (!moreResult.hasMore) {
 *     setHasMore(false)
 *   }
 * }
 * ```
 *
 * @interface
 * @see {@link AuditLogWithUser} para estructura de cada log
 * @see {@link AuditLogFilters} para opciones de consulta
 */
export interface AuditLogResult {
  /** Array de logs de auditoría con información del usuario */
  logs: AuditLogWithUser[]

  /** Total de registros que coinciden con los filtros (sin paginación) */
  total: number

  /** Número de registros devueltos en esta respuesta */
  count: number

  /** Límite que fue aplicado en la consulta */
  limit: number

  /** Offset que fue aplicado en la consulta */
  offset: number

  /** true si hay más resultados disponibles después de estos */
  hasMore: boolean
}

/**
 * Registro de auditoría completo con información del usuario
 *
 * Representa un evento de auditoría completo incluyendo detalles del usuario que
 * realizó la acción. Es el tipo devuelto por queries de auditoría.
 *
 * **Campos de Evento**:
 * - `id`: Identificador único del log
 * - `timestamp`: Cuándo ocurrió la acción
 * - `userId`: Quién realizó la acción (null para acciones del sistema)
 * - `action`: Tipo de acción realizada
 * - `module`: Módulo afectado
 * - `area`: Área de la aplicación
 * - `entityType`: Tipo de entidad
 * - `entityId`: ID de entidad
 *
 * **Información de Cambios**:
 * - `oldValues`: Estado anterior (null si no se capturó)
 * - `newValues`: Estado nuevo (null si no se capturó)
 *
 * **Información Técnica**:
 * - `ipAddress`: IP del cliente (null si no disponible)
 * - `userAgent`: User Agent del navegador (null si no disponible)
 * - `requestId`: ID de solicitud para correlación (null si no se asignó)
 * - `metadata`: Datos adicionales (null si no hay)
 *
 * **Información del Usuario**:
 * - `user`: Objeto con id, email, name del usuario (null para acciones del sistema)
 *   - Solo campos públicos, no contiene contraseña
 *
 * **Ejemplo**:
 * ```typescript
 * const log: AuditLogWithUser = {
 *   id: 'audit-log-123',
 *   userId: 'user-456',
 *   action: 'update',
 *   module: 'users',
 *   area: 'admin',
 *   entityType: 'User',
 *   entityId: 'user-789',
 *   oldValues: { firstName: 'Juan', role: 'user' },
 *   newValues: { firstName: 'Juan Carlos', role: 'admin' },
 *   ipAddress: '192.168.1.100',
 *   userAgent: 'Mozilla/5.0...',
 *   requestId: 'req-xyz-123',
 *   metadata: { source: 'web_ui' },
 *   timestamp: new Date('2024-12-04T16:30:00Z'),
 *   user: {
 *     id: 'user-456',
 *     email: 'admin@example.com',
 *     name: 'Admin User'
 *   }
 * }
 * ```
 *
 * **Renderización en Tabla**:
 * ```typescript
 * function AuditLogRow({ log }: { log: AuditLogWithUser }) {
 *   return (
 *     <tr>
 *       <td>{log.timestamp.toLocaleString()}</td>
 *       <td>{log.user?.email || 'Sistema'}</td>
 *       <td>{log.action}</td>
 *       <td>{log.module}</td>
 *       <td>{log.entityType} #{log.entityId}</td>
 *       <td>
 *         <details>
 *           <summary>Ver cambios</summary>
 *           {log.oldValues && <pre>Antes: {JSON.stringify(log.oldValues)}</pre>}
 *           {log.newValues && <pre>Después: {JSON.stringify(log.newValues)}</pre>}
 *         </details>
 *       </td>
 *     </tr>
 *   )
 * }
 * ```
 *
 * **Acción del Sistema** (userId y user son null):
 * ```typescript
 * const systemLog: AuditLogWithUser = {
 *   id: 'audit-log-system-1',
 *   userId: null,
 *   action: 'health_check',
 *   module: 'system',
 *   area: null,
 *   entityType: null,
 *   entityId: null,
 *   oldValues: null,
 *   newValues: null,
 *   ipAddress: null,
 *   userAgent: null,
 *   requestId: null,
 *   metadata: { status: 'ok', uptime: '24h' },
 *   timestamp: new Date('2024-12-04T12:00:00Z'),
 *   user: null  // Sin usuario (acción del sistema)
 * }
 * ```
 *
 * @interface
 * @see {@link AuditLogInput} para datos de entrada
 * @see {@link AuditLogResult} para resultado paginado
 */
export interface AuditLogWithUser {
  /** Identificador único del log */
  id: string
  /** ID del usuario que realizó la acción (null para acciones del sistema) */
  userId: string | null
  /** Tipo de acción realizada */
  action: string
  /** Módulo del sistema afectado */
  module: string
  /** Área de la aplicación (null si no especificada) */
  area: string | null
  /** Tipo de entidad afectada (null si no aplica) */
  entityType: string | null
  /** ID de la entidad afectada (null si no aplica) */
  entityId: string | null
  /** Estado anterior de la entidad (null si no se capturó) */
  oldValues: Record<string, unknown> | null
  /** Estado nuevo de la entidad (null si no se capturó) */
  newValues: Record<string, unknown> | null
  /** Dirección IP del cliente (null si no disponible) */
  ipAddress: string | null
  /** User Agent del navegador (null si no disponible) */
  userAgent: string | null
  /** ID de solicitud para correlación (null si no se asignó) */
  requestId: string | null
  /** Metadata adicional (null si no hay) */
  metadata: Record<string, unknown> | null
  /** Cuándo ocurrió la acción */
  timestamp: Date
  /** Información del usuario que realizó la acción (null si no disponible) */
  user: {
    /** ID único del usuario */
    id: string
    /** Email del usuario */
    email: string
    /** Nombre completo del usuario (null si no especificado) */
    name: string | null
  } | null
}
