/**
 * Structured Logger Implementation
 *
 * Aurora Nova - Sistema profesional de logging estructurado
 *
 * Proporciona logging estructurado basado en Pino con:
 * - Contexto enriquecido (module, action, userId, requestId)
 * - Sanitización automática de datos sensibles
 * - Medición de performance (duración de operaciones)
 * - Niveles de log: debug, info, warn, error, fatal
 * - Soporte para Error objects con stack traces
 * - Child loggers con contexto adicional
 *
 * @module lib/logger/structured-logger
 * @see {@link LogContext} para tipos de contexto disponibles
 * @see {@link LogLevel} para niveles de log disponibles
 */

import pino from 'pino';
import { env } from '../env';
import type {
  LogContext,
  LogLevel,
  IStructuredLogger,
  LoggerOptions,
} from './types';

/**
 * StructuredLogger - Sistema de logging estructurado
 *
 * Clase wrapper alrededor de Pino que proporciona:
 * - Logging consistente con contexto automático
 * - Sanitización de datos sensibles en logs
 * - Medición automática de performance
 * - Child loggers para contexto adicional
 * - Manejo robusto de errores
 *
 * @implements {IStructuredLogger}
 *
 * @example
 * ```typescript
 * import { structuredLogger } from '@/lib/logger'
 *
 * // Log simple
 * structuredLogger.info('Operation started', {
 *   module: 'auth',
 *   action: 'login',
 *   userId: 'user-123'
 * })
 *
 * // Log con error
 * try {
 *   await riskyOperation()
 * } catch (error) {
 *   structuredLogger.error('Operation failed', error as Error, {
 *     module: 'auth',
 *     action: 'login'
 *   })
 * }
 *
 * // Medir performance
 * const result = await structuredLogger.measure(
 *   async () => fetchUserData(userId),
 *   { module: 'users', action: 'fetch_data' }
 * )
 * ```
 */
class StructuredLogger implements IStructuredLogger {
  /** Instancia de logger Pino interno */
  private logger: pino.Logger;

  /**
   * Crear nueva instancia del logger
   *
   * @param options - Opciones de configuración
   * @param options.level - Nivel mínimo de log (default: env.LOG_LEVEL)
   *
   * @example
   * ```typescript
   * const logger = new StructuredLogger({ level: 'debug' });
   * ```
   */
  constructor(options?: LoggerOptions) {
    this.logger = pino({
      level: options?.level ?? env.LOG_LEVEL,
      formatters: {
        level: (label) => ({ level: label }),
        bindings: () => ({}), // Remove default bindings (hostname, pid)
      },
      // Serializers for complex objects
      serializers: {
        error: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
      },
      // Timestamps in ISO format
      timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    });
  }

  /**
   * Log a nivel DEBUG
   *
   * Usado para información detallada y verbose para debugging.
   * No aparece en logs de producción si nivel es > debug.
   *
   * @param message - Mensaje a loguear
   * @param context - Contexto adicional (opcional)
   *
   * @example
   * ```typescript
   * logger.debug('Processing user data', {
   *   module: 'users',
   *   action: 'process',
   *   userId: 'user-123',
   *   metadata: { recordsProcessed: 42 }
   * })
   * ```
   */
  debug(message: string, context?: Partial<LogContext>): void {
    this.log('debug', message, context);
  }

  /**
   * Log a nivel INFO
   *
   * Información importante sobre el flujo normal de la aplicación.
   * Eventos significativos que deben registrarse.
   *
   * @param message - Mensaje a loguear
   * @param context - Contexto adicional (opcional)
   *
   * @example
   * ```typescript
   * logger.info('User logged in successfully', {
   *   module: 'auth',
   *   action: 'login',
   *   userId: 'user-123'
   * })
   * ```
   */
  info(message: string, context?: Partial<LogContext>): void {
    this.log('info', message, context);
  }

  /**
   * Log a nivel WARN
   *
   * Advertencias que no impiden la ejecución pero requieren atención.
   * Situaciones anómalas que podrían indicar problemas.
   *
   * @param message - Mensaje a loguear
   * @param context - Contexto adicional (opcional)
   *
   * @example
   * ```typescript
   * logger.warn('Slow query detected', {
   *   module: 'database',
   *   action: 'query',
   *   metadata: { duration: 2500, threshold: 1000 }
   * })
   * ```
   */
  warn(message: string, context?: Partial<LogContext>): void {
    this.log('warn', message, context);
  }

  /**
   * Log a nivel ERROR
   *
   * Errores que afectan la ejecución pero permiten que continúe.
   * Excepciones capturadas que deben ser registradas.
   *
   * @param message - Mensaje descriptivo del error
   * @param error - Objeto Error que se loguea (incluye stack)
   * @param context - Contexto adicional (sin campo error)
   *
   * @example
   * ```typescript
   * try {
   *   await saveUser(userData);
   * } catch (error) {
   *   logger.error('Failed to save user', error as Error, {
   *     module: 'users',
   *     action: 'create',
   *     userId: 'user-123'
   *   })
   * }
   * ```
   */
  error(
    message: string,
    error: Error,
    context?: Omit<Partial<LogContext>, 'error'>
  ): void {
    this.log('error', message, {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as Error & { code?: string }).code,
      },
    });
  }

  /**
   * Log a nivel FATAL
   *
   * Errores críticos que pueden requerir reinicio de la aplicación.
   * Situaciones en las que la aplicación no puede continuar.
   *
   * @param message - Mensaje descriptivo del error crítico
   * @param error - Objeto Error que se loguea
   * @param context - Contexto adicional (sin campo error)
   *
   * @example
   * ```typescript
   * try {
   *   await initializeDatabase();
   * } catch (error) {
   *   logger.fatal('Database initialization failed', error as Error, {
   *     module: 'database',
   *     action: 'init'
   *   })
   *   // Posiblemente llamar a process.exit(1)
   * }
   * ```
   */
  fatal(
    message: string,
    error: Error,
    context?: Omit<Partial<LogContext>, 'error'>
  ): void {
    this.log('fatal', message, {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as Error & { code?: string }).code,
      },
    });
  }

  /**
   * Medir duración de operación async y loguear performance
   *
   * Ejecuta una función async, mide su duración, loguea el resultado
   * (éxito o error) con el tiempo de ejecución incluido.
   *
   * @typeParam T - Tipo del valor retornado por la función
   * @param fn - Función async a ejecutar y medir
   * @param context - Contexto de la operación para el log
   *
   * @returns {Promise<T>} El resultado de ejecutar fn()
   *
   * @throws Relanza cualquier error lanzado por fn()
   *
   * @example
   * ```typescript
   * // Medir operación exitosa
   * const user = await logger.measure(
   *   async () => {
   *     return await fetchUserData(userId);
   *   },
   *   { module: 'users', action: 'fetch_data', userId }
   * );
   * // Loguea: "Operation completed" con duration: 234ms
   *
   * // Medir operación que falla
   * try {
   *   await logger.measure(
   *     async () => {
   *       throw new Error('Network timeout');
   *     },
   *     { module: 'api', action: 'call' }
   *   );
   * } catch (error) {
   *   // Error está logueado automáticamente con duration
   * }
   * ```
   */
  async measure<T>(
    fn: () => Promise<T>,
    context: Partial<LogContext>
  ): Promise<T> {
    const start = Date.now();
    const logContext = { ...context };

    try {
      const result = await fn();
      const duration = Date.now() - start;

      this.info('Operation completed', {
        ...logContext,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      this.error('Operation failed', error as Error, {
        ...logContext,
        duration,
      });

      throw error;
    }
  }

  /**
   * Método interno para loguear a nivel especificado
   *
   * Centraliza la lógica de logging para todos los niveles (debug, info, warn, error, fatal).
   * Maneja sanitización automática del contexto y fallback a console si Pino falla.
   *
   * @private
   * @param level - Nivel de log (debug, info, warn, error, fatal)
   * @param message - Mensaje a loguear
   * @param context - Contexto adicional a incluir en el log (será sanitizado)
   *
   * @remarks
   * Este método:
   * - Sanitiza el contexto para evitar loguear datos sensibles
   * - Usa Pino para loguear a través de this.logger[level]
   * - Si Pino falla, fallback a console.log/error/warn
   * - Nunca lanza excepciones (manejo robusto de errores)
   *
   * @internal
   *
   * @example
   * ```typescript
   * // Llamado internamente por info(), error(), etc
   * this.log('info', 'User logged in', {
   *   module: 'auth',
   *   userId: 'user-123'
   * });
   * ```
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Partial<LogContext>
  ): void {
    try {
      const logData = {
        msg: message,
        ...this.sanitizeContext(context),
      };

      this.logger[level](logData);
    } catch {
      // Fallback to console if pino fails
      console[level === 'fatal' ? 'error' : level](
        `[${level.toUpperCase()}]`,
        message,
        context
      );
    }
  }

  /**
   * Sanitizar contexto para prevenir logging de datos sensibles
   *
   * Procesa el contexto del log para asegurar que los datos sensibles
   * (passwords, tokens, keys) no se loguean accidentalmente.
   * Delega la sanitización del metadata a sanitizeMetadata().
   *
   * @private
   * @param context - Contexto potencialmente con datos sensibles
   *
   * @returns {Partial<LogContext> | undefined} Contexto sanitizado, o undefined si entrada es falsy
   *
   * @remarks
   * Proceso de sanitización:
   * 1. Si no hay contexto, retorna undefined (early return)
   * 2. Crea copia superficial del contexto
   * 3. Si existe metadata, delega sanitización recursiva a sanitizeMetadata()
   * 4. Retorna contexto sanitizado
   *
   * @internal
   *
   * @example
   * ```typescript
   * // Entrada con datos sensibles
   * const context = {
   *   module: 'auth',
   *   userId: 'user-123',
   *   metadata: {
   *     apiKey: 'secret-key-123',
   *     username: 'john.doe'
   *   }
   * };
   *
   * // Resultado sanitizado
   * const sanitized = this.sanitizeContext(context);
   * // Output:
   * // {
   * //   module: 'auth',
   * //   userId: 'user-123',
   * //   metadata: {
   * //     apiKey: '[REDACTED]',
   * //     username: 'john.doe'
   * //   }
   * // }
   * ```
   *
   * @see {@link sanitizeMetadata} para lógica recursiva de sanitización
   */
  private sanitizeContext(
    context?: Partial<LogContext>
  ): Partial<LogContext> | undefined {
    if (!context) return undefined;

    const sanitized = { ...context };

    // Sanitize metadata if present
    if (sanitized.metadata) {
      sanitized.metadata = this.sanitizeMetadata(sanitized.metadata);
    }

    return sanitized;
  }

  /**
   * Sanitizar metadata para remover campos sensibles (recursivamente)
   *
   * Procesa recursivamente un objeto metadata para identificar y redactar
   * campos sensibles basándose en nombres de claves conocidas.
   * Protege contra logging accidental de passwords, tokens, API keys, etc.
   *
   * @private
   * @param metadata - Objeto metadata potencialmente con datos sensibles
   *
   * @returns {Record<string, unknown>} Objeto metadata sanitizado con valores sensibles redactados
   *
   * @remarks
   * Campos detectados como sensibles:
   * - password, hashedPassword
   * - token, accessToken, refreshToken, sessionToken
   * - secret, apiKey
   *
   * La detección es case-insensitive e incluye:
   * - Nombres exactos (ej: 'password')
   * - Nombres compuestos (ej: 'userPassword', 'oldPassword')
   *
   * Procesa objetos anidados recursivamente pero NO modifica arrays.
   *
   * @internal
   *
   * @example
   * ```typescript
   * // Entrada con múltiples campos sensibles
   * const metadata = {
   *   userId: 'user-123',
   *   username: 'john.doe',
   *   password: 'SuperSecret123!',
   *   userPassword: 'AnotherSecret456!',
   *   api: {
   *     apiKey: 'sk_live_abc123',
   *     endpoint: 'https://api.example.com',
   *     accessToken: 'token_xyz789'
   *   },
   *   tags: ['public', 'important']
   * };
   *
   * // Resultado sanitizado
   * const sanitized = this.sanitizeMetadata(metadata);
   * // Output:
   * // {
   * //   userId: 'user-123',
   * //   username: 'john.doe',
   * //   password: '[REDACTED]',
   * //   userPassword: '[REDACTED]',
   * //   api: {
   * //     apiKey: '[REDACTED]',
   * //     endpoint: 'https://api.example.com',
   * //     accessToken: '[REDACTED]'
   * //   },
   * //   tags: ['public', 'important']  // Arrays no se modifican
   * // }
   * ```
   *
   * @see {@link sanitizeContext} para sanitización del nivel superior
   */
  private sanitizeMetadata(
    metadata: Record<string, unknown>
  ): Record<string, unknown> {
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'accessToken',
      'refreshToken',
      'sessionToken',
      'hashedPassword',
    ];

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      // Check if field is sensitive
      const isSensitive = sensitiveFields.some((field) =>
        key.toLowerCase().includes(field.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeMetadata(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Crear un child logger con contexto adicional
   *
   * Crea una nueva instancia de StructuredLogger que hereda el contexto
   * del logger padre y agrega contexto adicional. Útil para operaciones
   * donde quieres agregar información específica a todos los logs dentro
   * de un scope (ej: userId, requestId, module).
   *
   * @param context - Contexto adicional para todos los logs del child logger
   *
   * @returns {StructuredLogger} Nueva instancia de logger con contexto combinado
   *
   * @remarks
   * Casos de uso típicos:
   * - Crear child logger para una operación específica (ej: en request handler)
   * - Pasar userId/requestId a un scope de logs
   * - Agregar contexto de módulo a un conjunto de operaciones
   * - Anidar loggers en operaciones complejas
   *
   * El contexto del padre y del child se combinan automáticamente.
   * El contexto es sanitizado antes de pasar a Pino.
   *
   * @example
   * ```typescript
   * // En un request handler
   * const logger = structuredLogger.child({
   *   module: 'auth',
   *   requestId: 'req-123',
   *   userId: 'user-456'
   * });
   *
   * // Todos los logs con este logger incluirán estos campos
   * logger.info('Processing login', { action: 'verify_credentials' });
   * // Output incluye: { module: 'auth', requestId: 'req-123', userId: 'user-456', action: 'verify_credentials' }
   *
   * // Puede crear child logger desde otro child logger
   * const operationLogger = logger.child({
   *   operation: 'password_reset',
   *   timestamp: new Date().toISOString()
   * });
   * operationLogger.info('Password reset initiated');
   * // Output incluye toda la cadena de contextos
   * ```
   *
   * @see {@link structuredLogger} para la instancia global singleton
   * @see {@link LogContext} para campos de contexto disponibles
   */
  child(context: Partial<LogContext>): StructuredLogger {
    const childLogger = new StructuredLogger();
    childLogger.logger = this.logger.child(this.sanitizeContext(context) ?? {});
    return childLogger;
  }
}

/**
 * Instancia global singleton del StructuredLogger
 *
 * Exporta una única instancia de StructuredLogger que debe usarse
 * en toda la aplicación para logging estructurado consistente.
 *
 * @type {StructuredLogger}
 *
 * @remarks
 * Esta es la instancia principal recomendada para usar en toda la aplicación.
 * Usar siempre esta instancia en lugar de crear nuevas instancias de StructuredLogger.
 *
 * @example
 * ```typescript
 * import { structuredLogger } from '@/lib/logger/structured-logger';
 *
 * // Logging simple
 * structuredLogger.info('User login successful', {
 *   module: 'auth',
 *   userId: 'user-123'
 * });
 *
 * // Logging con error
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   structuredLogger.error('Operation failed', error as Error, {
 *     module: 'data',
 *     action: 'fetch_data'
 *   });
 * }
 *
 * // Medir performance
 * const result = await structuredLogger.measure(
 *   async () => await fetchUserData(userId),
 *   { module: 'users', action: 'fetch_data', userId }
 * );
 *
 * // Child logger con contexto
 * const requestLogger = structuredLogger.child({
 *   requestId: 'req-789',
 *   userId: 'user-123'
 * });
 * requestLogger.info('Request started');
 * ```
 *
 * @see {@link StructuredLogger} para documentación de métodos disponibles
 */
export const structuredLogger = new StructuredLogger();

/**
 * Clase StructuredLogger exportada para testing
 *
 * Exporta la clase StructuredLogger para permitir creación de instancias
 * adicionales en tests o casos especiales donde se necesita aislamiento.
 *
 * @remarks
 * En la mayoría de casos, usar {@link structuredLogger} singleton.
 * Solo crear nuevas instancias en tests que necesiten isolamiento completo.
 *
 * @example
 * ```typescript
 * import { StructuredLogger } from '@/lib/logger/structured-logger';
 *
 * // En tests
 * describe('MyModule', () => {
 *   let logger: StructuredLogger;
 *
 *   beforeEach(() => {
 *     logger = new StructuredLogger({ level: 'debug' });
 *   });
 *
 *   it('should log events', () => {
 *     logger.info('Test message');
 *     // Assertions...
 *   });
 * });
 * ```
 *
 * @see {@link structuredLogger} para usar la instancia global
 */
export { StructuredLogger };
