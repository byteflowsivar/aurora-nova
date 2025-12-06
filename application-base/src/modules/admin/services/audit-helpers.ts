/**
 * Módulo de Helpers para Auditoría - Aurora Nova
 *
 * Utilidades para auditoría manual en casos no cubiertos por eventos automáticos.
 * Proporciona helpers para extraer contexto de request y registrar operaciones.
 *
 * **Arquitectura**:
 * - **getAuditContext()**: Extrae IP, User-Agent, Request-ID de headers
 * - **auditOperation()**: Wrapper que ejecuta operación + registra auditoría
 * - **auditEntityChange()**: Registra cambios de entidad (oldValues → newValues)
 *
 * **Contexto de Auditoría** (extraído de request):
 * - **userId**: ID del usuario que realiza la acción
 * - **ipAddress**: IP del cliente (x-forwarded-for → x-real-ip)
 * - **userAgent**: Navegador/cliente del usuario
 * - **requestId**: UUID v7 para correlacionar request con logs
 *
 * **Casos de Uso**:
 * - Operaciones batch (bulk delete, bulk update)
 * - Generación de reportes/exports
 * - Cambios de configuración
 * - Migraciones de datos
 * - Operaciones complejas sin eventos automáticos
 *
 * **Ejemplo - Auditar Batch Delete**:
 * ```typescript
 * const deletedCount = await auditOperation(
 *   {
 *     userId: session.user.id,
 *     action: 'batch_delete',
 *     module: 'users',
 *     metadata: { reason: 'Cleanup inactive users', days: 365 }
 *   },
 *   async () => {
 *     const result = await prisma.user.deleteMany({
 *       where: { lastLoginAt: { lt: oneYearAgo } }
 *     })
 *     return result.count
 *   }
 * )
 * // Registra: DELETE 150 usuarios, duración 2.3s, IP 192.168.1.1
 * ```
 *
 * **Ejemplo - Auditar Cambio de Entidad**:
 * ```typescript
 * await auditEntityChange(
 *   {
 *     userId: session.user.id,
 *     action: 'update',
 *     module: 'users',
 *     entityType: 'User',
 *     entityId: user.id
 *   },
 *   { email: 'old@example.com', role: 'user' },
 *   { email: 'new@example.com', role: 'admin' }
 * )
 * // Registra: email old→new, role user→admin
 * ```
 *
 * **Características**:
 * - 'use server': Solo se ejecuta en servidor (seguro)
 * - Extrae IP de proxies/load balancers correctamente
 * - Tracking de duración de operaciones
 * - UUIDs v7 para request-id (sortable, mejor que v4)
 * - Logging dual: BD (auditService) + logs (structuredLogger)
 * - Manejo completo de errores
 *
 * @module admin/services/audit-helpers
 * @see {@link @/modules/admin/services/audit-service} para persistencia
 * @see {@link @/lib/logger/structured-logger} para logging
 */

'use server';

import { headers } from 'next/headers';
import { v7 as uuidv7 } from 'uuid';
import { auditService } from './audit-service';
import { AuditLogInput } from './audit-types';
import { structuredLogger } from '@/lib/logger/structured-logger';

/**
 * Contexto de auditoría extraído de la request de Next.js
 *
 * Contiene información del cliente y request para auditoría:
 * - Quién realiza la acción (userId)
 * - De dónde (ipAddress)
 * - Con qué dispositivo (userAgent)
 * - Qué request (requestId para correlacionar logs)
 *
 * @interface AuditContext
 * @property {string} [userId] - ID del usuario que realiza la acción (opcional si anónimo)
 * @property {string} [ipAddress] - Dirección IP del cliente (extraída de x-forwarded-for o x-real-ip)
 * @property {string} [userAgent] - User-Agent del navegador/cliente
 * @property {string} requestId - UUID v7 único para esta request (generado o de x-request-id)
 */
export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
}

/**
 * Opciones para registrar una operación en auditoría
 *
 * Especifica qué se audita: quién, qué acción, en qué módulo, etc.
 * Los campos de contexto (ipAddress, userAgent, requestId) son opcionales:
 * si no se proporcionan, se extraen automáticamente de la request.
 *
 * @interface AuditOperationOptions
 * @property {string} [userId] - ID del usuario que realiza la acción
 * @property {string} action - Acción (ej: 'create', 'update', 'delete', 'export', 'batch_delete')
 * @property {string} module - Módulo (ej: 'users', 'roles', 'reports', 'settings')
 * @property {string} [entityType] - Tipo de entidad (ej: 'User', 'Role', 'Report')
 * @property {string} [entityId] - ID de la entidad específica
 * @property {string} [ipAddress] - IP del cliente (se extrae si no se proporciona)
 * @property {string} [userAgent] - User-Agent (se extrae si no se proporciona)
 * @property {string} [requestId] - Request ID para correlacionar (se genera si no existe)
 * @property {Record<string, unknown>} [metadata] - Datos adicionales (formato libre)
 */
export interface AuditOperationOptions {
  userId?: string;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Extrae contexto de auditoría de la request actual
 *
 * Obtiene información del cliente y request de los headers de Next.js:
 * - **IP Address**: x-forwarded-for (proxies) → x-real-ip → undefined
 * - **User-Agent**: Navegador/dispositivo del cliente
 * - **Request-ID**: x-request-id existente o genera UUID v7 nuevo
 *
 * **Headers Procesados**:
 * - `x-forwarded-for`: Lista de IPs de proxies/load balancers (toma primera)
 * - `x-real-ip`: IP alternativa si x-forwarded-for no existe
 * - `user-agent`: Navegador/cliente
 * - `x-request-id`: ID único para correlacionar request (opcional)
 *
 * **Cuándo Usar**:
 * - Obtener contexto manualmente cuando auditOperation no se ajusta
 * - Enriquecer logs con contexto de request
 * - Debugging: verificar qué datos se están capturando
 *
 * **Comportamiento en Error**:
 * Si no estamos en contexto de request (ej. cron job, background task):
 * - Registra advertencia en logs
 * - Retorna contexto minimal (solo requestId generado)
 * - No lanza error (sigue ejecutándose)
 *
 * **Ejemplo - Uso Manual**:
 * ```typescript
 * // En src/app/api/reports/export/route.ts
 * const context = await getAuditContext(session.user.id)
 * const buffer = await generatePDF()
 *
 * await auditService.log({
 *   ...context,
 *   action: 'export',
 *   module: 'reports',
 *   entityType: 'Report',
 *   metadata: { format: 'pdf', size: buffer.length }
 * })
 * ```
 *
 * **Ejemplo - Con Fallback**:
 * ```typescript
 * // Usar contexto extraído, o proporcionar defaults
 * const context = await getAuditContext(userId)
 * await auditService.log({
 *   userId: context.userId || userId,
 *   ipAddress: context.ipAddress || '0.0.0.0',
 *   userAgent: context.userAgent || 'unknown',
 *   requestId: context.requestId,
 *   action: 'custom',
 *   module: 'custom'
 * })
 * ```
 *
 * @async
 * @param {string} [userId] - ID del usuario (opcional, se retorna así)
 * @returns {Promise<AuditContext>} Contexto con IP, User-Agent, Request-ID
 *
 * @example
 * ```typescript
 * const context = await getAuditContext(session.user.id)
 * // {
 * //   userId: 'user_123',
 * //   ipAddress: '192.168.1.1',
 * //   userAgent: 'Mozilla/5.0...',
 * //   requestId: 'f47ac10b-58cc-4372...'
 * // }
 * ```
 */
export async function getAuditContext(userId?: string): Promise<AuditContext> {
  try {
    const headersList = await headers();

    // Obtener IP address (priorizar x-forwarded-for para proxies/load balancers)
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ipAddress =
      forwardedFor?.split(',')[0].trim() || realIp || undefined;

    // Obtener User Agent
    const userAgent = headersList.get('user-agent') || undefined;

    // Obtener o generar Request ID
    const existingRequestId = headersList.get('x-request-id');
    const requestId = existingRequestId || uuidv7();

    return {
      userId,
      ipAddress,
      userAgent,
      requestId,
    };
  } catch (error) {
    // En caso de error (ej. no estamos en un request context), retornar valores por defecto
    structuredLogger.warn(
      'Failed to get audit context',
      {
        module: 'audit',
        action: 'get_context_failed',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      }
    );

    return {
      userId,
      requestId: uuidv7(),
    };
  }
}

/**
 * Wrapper para ejecutar operación con auditoría automática
 *
 * **Patrón Wrapper**: Ejecuta operación + registra auditoría automáticamente.
 * Simplifica auditoría de operaciones complejas sin eventos automáticos.
 *
 * **Características**:
 * - Ejecuta función async y retorna su resultado
 * - Registra éxito/error automáticamente
 * - Mide duración de operación (performance tracking)
 * - Extrae contexto si no se proporciona (IP, User-Agent, Request-ID)
 * - Logging dual: BD (auditService) + logs (structuredLogger)
 * - Propaga errores al caller (no silencia excepciones)
 *
 * **Flujo**:
 * ```
 * auditOperation(options, async () => {
 *   // Tu operación aquí
 *   const result = await db.operation()
 *   return result
 * })
 * → Ejecuta
 * → Mide duración
 * → Si éxito: registra { success: true, duration, ... }
 * → Si error: registra { success: false, error, duration, ... } + re-lanza
 * ```
 *
 * **Cuándo Usar**:
 * - Operaciones batch (bulk delete, bulk update, bulk import)
 * - Generación de reportes/exports
 * - Migraciones de datos
 * - Cambios de configuración masivos
 * - Cualquier operación sin eventos automáticos
 *
 * **Ejemplo 1 - Batch Delete**:
 * ```typescript
 * // POST /api/admin/users/cleanup
 * const result = await auditOperation(
 *   {
 *     userId: session.user.id,
 *     action: 'batch_delete',
 *     module: 'users',
 *     metadata: { reason: 'Cleanup inactive users', daysInactive: 365 }
 *   },
 *   async () => {
 *     const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
 *     const result = await prisma.user.deleteMany({
 *       where: { lastLoginAt: { lt: oneYearAgo } }
 *     })
 *     return result.count // Retorna número de usuarios eliminados
 *   }
 * )
 * console.log(`Eliminados ${result} usuarios`) // Registra en auditoría automáticamente
 * ```
 *
 * **Ejemplo 2 - Exportación de Datos**:
 * ```typescript
 * // POST /api/admin/reports/export
 * const pdfBuffer = await auditOperation(
 *   {
 *     userId: session.user.id,
 *     action: 'export',
 *     module: 'reports',
 *     entityType: 'Report',
 *     entityId: reportId,
 *     metadata: { format: 'pdf', filters: { date: '2024-01' } }
 *   },
 *   async () => {
 *     return await generateReportPDF(reportId, filters)
 *   }
 * )
 * res.setHeader('Content-Type', 'application/pdf')
 * res.send(pdfBuffer)
 * // Registra export + duración automáticamente
 * ```
 *
 * **Ejemplo 3 - Con Manejo de Errores**:
 * ```typescript
 * try {
 *   await auditOperation(
 *     {
 *       userId: session.user.id,
 *       action: 'import',
 *       module: 'data',
 *       metadata: { source: 'csv', rows: 1000 }
 *     },
 *     async () => {
 *       // Importar datos
 *       await importCSV(file)
 *     }
 *   )
 * } catch (error) {
 *   // Error registrado en auditoría automáticamente
 *   // Aquí ya se registró: { success: false, error: error.message, ... }
 *   return res.status(400).json({ error: error.message })
 * }
 * ```
 *
 * **Metadata Automática Agregada**:
 * ```typescript
 * {
 *   duration: 2345,       // Duración en ms
 *   success: true/false,  // Éxito o error
 *   error?: string        // Mensaje de error si falló
 * }
 * ```
 *
 * @async
 * @template T - Tipo de retorno de la operación
 * @param {AuditOperationOptions} options - Opciones de auditoría
 * @param {() => Promise<T>} operation - Función async a ejecutar
 * @returns {Promise<T>} Resultado de la operación
 * @throws {Error} Re-lanza cualquier error de la operación (después de registrar)
 *
 * @example
 * ```typescript
 * const count = await auditOperation(
 *   { userId: 'user_123', action: 'delete', module: 'items' },
 *   async () => {
 *     const result = await prisma.item.deleteMany({ where: { archived: true } })
 *     return result.count
 *   }
 * )
 * ```
 */
export async function auditOperation<T>(
  options: AuditOperationOptions,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    // Obtener contexto de la request si no se proporcionó
    let auditData: AuditLogInput = {
      userId: options.userId,
      action: options.action,
      module: options.module,
      entityType: options.entityType,
      entityId: options.entityId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      requestId: options.requestId,
      metadata: options.metadata,
    };

    // Si no se proporcionó IP/UserAgent/RequestID, obtenerlos del contexto
    if (!options.ipAddress || !options.userAgent || !options.requestId) {
      const context = await getAuditContext(options.userId);
      auditData = {
        ...auditData,
        ipAddress: auditData.ipAddress || context.ipAddress,
        userAgent: auditData.userAgent || context.userAgent,
        requestId: auditData.requestId || context.requestId,
      };
    }

    // Ejecutar la operación
    const result = await operation();

    // Calcular duración
    const duration = Date.now() - startTime;

    // Registrar auditoría exitosa
    await auditService.log({
      ...auditData,
      metadata: {
        ...auditData.metadata,
        duration,
        success: true,
      },
    });

    structuredLogger.info('Audit operation completed', {
      module: options.module,
      action: options.action,
      userId: options.userId,
      requestId: auditData.requestId,
      duration,
    });

    return result;
  } catch (error) {
    // Calcular duración incluso en caso de error
    const duration = Date.now() - startTime;

    // Registrar auditoría de error
    const context = await getAuditContext(options.userId);
    await auditService.log({
      userId: options.userId,
      action: options.action,
      module: options.module,
      entityType: options.entityType,
      entityId: options.entityId,
      ipAddress: options.ipAddress || context.ipAddress,
      userAgent: options.userAgent || context.userAgent,
      requestId: options.requestId || context.requestId,
      metadata: {
        ...options.metadata,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    structuredLogger.error(
      'Audit operation failed',
      error instanceof Error ? error : new Error(String(error)),
      {
        module: options.module,
        action: options.action,
        userId: options.userId,
        requestId: options.requestId || context.requestId,
        duration,
      }
    );

    // Re-lanzar el error para que el caller pueda manejarlo
    throw error;
  }
}

/**
 * Registra cambios de entidad (oldValues → newValues)
 *
 * **Caso de Uso**: Auditar qué cambió en una entidad durante una actualización.
 * Registra "antes" y "después" para comparación fácil.
 *
 * **Cuándo Usar**:
 * - Actualización de perfil de usuario (nombre, email, etc)
 * - Cambios de configuración (settings, preferences)
 * - Actualización de permiso/rol
 * - Cambios de estado de recurso
 * - Cualquier UPDATE importante
 *
 * **Información Registrada**:
 * - `oldValues`: Valores ANTES del cambio ({ email: 'old@...' })
 * - `newValues`: Valores DESPUÉS del cambio (new{ email: 'new@...' })
 * - Contexto: usuario, IP, User-Agent, Request-ID
 * - Metadata: parámetros adicionales
 *
 * **Ventaja vs auditOperation**:
 * - `auditOperation()`: ejecuta operación + registra
 * - `auditEntityChange()`: registra cambios sin ejecutar (más simple para updates)
 *
 * **Ejemplo 1 - Actualización de Perfil**:
 * ```typescript
 * // POST /api/user/profile
 * const oldProfile = await getProfile(userId)
 *
 * const updated = await updateProfile(userId, {
 *   firstName: req.body.firstName,
 *   lastName: req.body.lastName
 * })
 *
 * await auditEntityChange(
 *   {
 *     userId,
 *     action: 'update',
 *     module: 'users',
 *     entityType: 'User',
 *     entityId: userId
 *   },
 *   {
 *     firstName: oldProfile.firstName,
 *     lastName: oldProfile.lastName
 *   },
 *   {
 *     firstName: updated.firstName,
 *     lastName: updated.lastName
 *   }
 * )
 * // Registra: firstName "Juan" → "Juan Carlos"
 * //           lastName "Pérez" → "García"
 * ```
 *
 * **Ejemplo 2 - Cambio de Permiso**:
 * ```typescript
 * // POST /api/admin/users/:id/permissions
 * const oldPermissions = user.permissions
 *
 * const updated = await updateUserPermissions(userId, newPermissions)
 *
 * await auditEntityChange(
 *   {
 *     userId: session.user.id,
 *     action: 'update_permissions',
 *     module: 'permissions',
 *     entityType: 'UserPermissions',
 *     entityId: userId
 *   },
 *   { permissions: oldPermissions },
 *   { permissions: newPermissions }
 * )
 * // Registra: permissions [admin, user] → [admin, editor]
 * ```
 *
 * **Ejemplo 3 - Cambio de Configuración**:
 * ```typescript
 * // PATCH /api/admin/settings
 * const oldSettings = await getSettings()
 *
 * const newSettings = await updateSettings({
 *   maintenanceMode: true,
 *   maxLoginAttempts: 5
 * })
 *
 * await auditEntityChange(
 *   {
 *     userId: session.user.id,
 *     action: 'update',
 *     module: 'settings',
 *     entityType: 'SystemSettings'
 *   },
 *   { maintenanceMode: false, maxLoginAttempts: 3 },
 *   { maintenanceMode: true, maxLoginAttempts: 5 }
 * )
 * // Registra cambios de configuración
 * ```
 *
 * **Notas**:
 * - Registra contexto automáticamente (IP, User-Agent, etc)
 * - oldValues y newValues son formato libre (any fields)
 * - Útil para UI: mostrar qué cambió exactamente
 * - Para operaciones complejas, usar `auditOperation()` en lugar
 *
 * @async
 * @param {AuditOperationOptions} options - Opciones de auditoría (userId, action, module, etc)
 * @param {Record<string, unknown>} oldValues - Valores antes del cambio
 * @param {Record<string, unknown>} newValues - Valores después del cambio
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await auditEntityChange(
 *   { userId: 'user_123', action: 'update', module: 'users', entityType: 'User', entityId: 'user_456' },
 *   { email: 'old@example.com' },
 *   { email: 'new@example.com' }
 * )
 * ```
 *
 * @see {@link auditOperation} para auditar operaciones complejas
 * @see {@link getAuditContext} para obtener contexto manualmente
 */
export async function auditEntityChange(
  options: AuditOperationOptions,
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
): Promise<void> {
  const context = await getAuditContext(options.userId);

  await auditService.log({
    userId: options.userId,
    action: options.action,
    module: options.module,
    entityType: options.entityType,
    entityId: options.entityId,
    ipAddress: options.ipAddress || context.ipAddress,
    userAgent: options.userAgent || context.userAgent,
    requestId: options.requestId || context.requestId,
    oldValues,
    newValues,
    metadata: options.metadata,
  });

  structuredLogger.info('Entity change audited', {
    module: options.module,
    action: options.action,
    userId: options.userId,
    requestId: options.requestId || context.requestId,
    metadata: {
        entityType: options.entityType,
        entityId: options.entityId,
    }
  });
}
