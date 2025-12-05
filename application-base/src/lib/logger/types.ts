/**
 * Tipos e Interfaces de Logging Estructurado
 *
 * Aurora Nova - Sistema de Logging Centralizado
 *
 * Define todas las interfaces y tipos para el sistema de logging estructurado.
 * Proporciona type safety para contexto, niveles, y configuración del logger.
 *
 * **Tipos Principales**:
 * - {@link LogContext}: Contexto completo de un log
 * - {@link LogLevel}: Nivel de severidad (debug, info, warn, error, fatal)
 * - {@link LoggerOptions}: Opciones de configuración
 * - {@link IStructuredLogger}: Interfaz del logger
 *
 * **Características**:
 * - Type-safe logging con validación de tipos
 * - Contexto enriquecido (requestId, userId, module, action)
 * - Tracking de performance (duration)
 * - Metadata flexible para datos adicionales
 * - Error tracking con stack traces
 * - Niveles de logging configurables
 *
 * @module lib/logger/types
 * @see {@link ./structured-logger.ts} para implementación
 * @see {@link ./helpers.ts} para creación de contexto
 *
 * @example
 * ```typescript
 * import type { LogContext, LogLevel } from '@/lib/logger/types';
 * import { structuredLogger } from '@/lib/logger/structured-logger';
 *
 * // Crear contexto tipado
 * const context: LogContext = {
 *   requestId: 'req-123',
 *   userId: 'user-456',
 *   module: 'auth',
 *   action: 'login',
 *   metadata: { email: 'user@example.com' }
 * };
 *
 * // Usar con logger
 * structuredLogger.info('Login successful', context);
 * ```
 */

/**
 * Contexto Estructurado para Logging
 *
 * Interfaz que define toda la información a loguear junto con un mensaje.
 * Proporciona contexto completo para debugging y auditoría.
 *
 * **Campos de Tracking de Request**:
 * - `requestId`: ID único del request HTTP (para correlacionar logs)
 * - `userId`: ID del usuario autenticado
 * - `sessionId`: Token de sesión del usuario
 *
 * **Campos de Ubicación**:
 * - `module`: Módulo donde ocurre el evento (auth, users, roles, api, etc)
 * - `action`: Acción específica dentro del módulo (login, create, update, delete)
 *
 * **Campos de Performance**:
 * - `duration`: Tiempo de ejecución en milisegundos (agregado por measure())
 *
 * **Campos de Contexto**:
 * - `metadata`: Objeto flexible para agregar cualquier info adicional
 * - `error`: Información de error (name, message, stack, code)
 *
 * @interface LogContext
 *
 * @remarks
 * **Parcialmente Requerido**:
 * Todos los campos son opcionales excepto `module`.
 * Usar `Partial<LogContext>` cuando no se completan todos los campos.
 *
 * **Metadata Sanitización**:
 * La metadata se sanitiza automáticamente para no loguear datos sensibles
 * (passwords, tokens, apiKeys, etc).
 *
 * **Request ID para Correlación**:
 * El requestId permite correlacionar todos los logs de un mismo request
 * en sistemas distribuidos o con múltiples microservicios.
 *
 * @example
 * ```typescript
 * // Contexto completo
 * const fullContext: LogContext = {
 *   requestId: '550e8400-e29b-41d4-a716-446655440000',
 *   userId: 'user-123',
 *   sessionId: 'session-token-abc',
 *   module: 'users',
 *   action: 'create',
 *   duration: 234,
 *   metadata: {
 *     email: 'newuser@example.com',
 *     role: 'admin',
 *     ipAddress: '192.168.1.1'
 *   }
 * };
 *
 * // Contexto mínimo
 * const minimalContext: Partial<LogContext> = {
 *   module: 'auth'
 * };
 *
 * // Error context (sin campo error)
 * const errorContext: Omit<Partial<LogContext>, 'error'> = {
 *   module: 'api',
 *   action: 'fetch_data',
 *   userId: 'user-456'
 * };
 * // El error se pasa como segundo parámetro a logger.error()
 * ```
 */
export interface LogContext {
  // Request tracking
  requestId?: string;        // UUID único por request
  userId?: string;           // Usuario autenticado
  sessionId?: string;        // Session token

  // Location
  module: string;            // "auth", "users", "roles", "api"
  action?: string;           // "login", "create", "update", "delete"

  // Performance
  duration?: number;         // Tiempo de ejecución en ms

  // Metadata adicional (flexible)
  metadata?: Record<string, unknown>;

  // Error tracking
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Nivel de Severidad del Log
 *
 * Unión de todos los niveles de log soportados por el sistema.
 * Ordenados de menor a mayor severidad.
 *
 * @typedef {('debug' | 'info' | 'warn' | 'error' | 'fatal')} LogLevel
 *
 * **Niveles Disponibles**:
 * - `debug`: Información detallada para debugging (verbose)
 * - `info`: Información sobre el flujo normal de la aplicación
 * - `warn`: Advertencias sobre situaciones anómalas
 * - `error`: Errores que afectan operación pero no detienen la app
 * - `fatal`: Errores críticos que pueden requerir reinicio
 *
 * **Configuración por Entorno**:
 * - **Desarrollo**: debug (loguea todo)
 * - **Producción**: warn o error (menos verbose, mejor performance)
 *
 * @example
 * ```typescript
 * import type { LogLevel } from '@/lib/logger/types';
 *
 * const level: LogLevel = 'info'; // Type-safe
 * structuredLogger[level]('Message'); // ✓ Válido
 *
 * const invalid: LogLevel = 'trace'; // ✗ Error de compilación
 * ```
 *
 * @see {@link ./structured-logger.ts} para métodos de logging
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Configuración de Niveles de Log por Módulo
 *
 * Define qué nivel de log usar para cada módulo específico.
 * Permite control granular de verbosidad por área de la aplicación.
 *
 * @interface ModuleLogLevels
 *
 * **Módulos Soportados**:
 * - `auth`: Sistema de autenticación
 * - `users`: Gestión de usuarios
 * - `roles`: Gestión de roles
 * - `permissions`: Gestión de permisos
 * - `api`: Endpoints REST
 * - `menu`: Menú dinámico
 * - `audit`: Sistema de auditoría
 * - `events`: Sistema de eventos
 * - `default`: Nivel por defecto para otros módulos
 *
 * **Casos de Uso**:
 * - En desarrollo: debug para módulos que estás debugueando, info para el resto
 * - En producción: warn para módulos críticos, error para el resto
 * - Temporalmente: cambiar nivel de un módulo sin afectar otros
 *
 * @example
 * ```typescript
 * const levels: Partial<ModuleLogLevels> = {
 *   auth: 'debug',       // Todo detalle de auth
 *   api: 'info',         // Solo operaciones normales en API
 *   default: 'warn'      // Otros módulos solo si hay problemas
 * };
 * ```
 */
export interface ModuleLogLevels {
  auth: LogLevel;
  users: LogLevel;
  roles: LogLevel;
  permissions: LogLevel;
  api: LogLevel;
  menu: LogLevel;
  audit: LogLevel;
  events: LogLevel;
  default: LogLevel;
}

/**
 * Opciones de Configuración del Logger
 *
 * Parámetros para personalizar el comportamiento del logger.
 *
 * @interface LoggerOptions
 *
 * **Campos**:
 * - `level`: Nivel global de logging (override a todas)
 * - `moduleLogLevels`: Niveles específicos por módulo
 * - `prettyPrint`: Formatos JSON de forma legible (development)
 *
 * @example
 * ```typescript
 * // Configuración simple
 * const options: LoggerOptions = {
 *   level: 'debug'
 * };
 *
 * // Configuración avanzada
 * const advanced: LoggerOptions = {
 *   level: 'info',
 *   moduleLogLevels: {
 *     auth: 'debug',
 *     api: 'warn'
 *   },
 *   prettyPrint: true
 * };
 *
 * const logger = new StructuredLogger(advanced);
 * ```
 */
export interface LoggerOptions {
  level?: LogLevel;
  moduleLogLevels?: Partial<ModuleLogLevels>;
  prettyPrint?: boolean;
}

/**
 * Interfaz del Logger Estructurado
 *
 * Define contrato de métodos disponibles para logging.
 * Implementada por {@link StructuredLogger}.
 *
 * @interface IStructuredLogger
 *
 * **Métodos Principales**:
 * - `debug()`: Logging de nivel debug
 * - `info()`: Logging de nivel info
 * - `warn()`: Logging de nivel warn
 * - `error()`: Logging de error con stack trace
 * - `fatal()`: Logging de error crítico
 * - `measure()`: Medir duración de operación async
 *
 * **Type Safety**:
 * Todos los métodos tienen tipos definidos para parámetros y retorno.
 * Permite que IDE proporcione autocompletado y validación.
 *
 * @example
 * ```typescript
 * import type { IStructuredLogger } from '@/lib/logger/types';
 * import { StructuredLogger } from '@/lib/logger/structured-logger';
 *
 * const logger: IStructuredLogger = new StructuredLogger();
 *
 * logger.info('User logged in', {
 *   module: 'auth',
 *   userId: 'user-123'
 * });
 * ```
 *
 * @see {@link StructuredLogger} para implementación
 */
export interface IStructuredLogger {
  debug(message: string, context?: Partial<LogContext>): void;
  info(message: string, context?: Partial<LogContext>): void;
  warn(message: string, context?: Partial<LogContext>): void;
  error(message: string, error: Error, context?: Omit<Partial<LogContext>, 'error'>): void;
  fatal(message: string, error: Error, context?: Omit<Partial<LogContext>, 'error'>): void;

  measure<T>(
    fn: () => Promise<T>,
    context: Partial<LogContext>
  ): Promise<T>;
}
