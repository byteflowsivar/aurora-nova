/**
 * Logger Configurado para Aurora Nova
 *
 * Aurora Nova - Pino Logger Wrapper
 *
 * Proporciona instancia configurada de Pino logger con fallback a console.
 * Evita problemas con workers/threads de Next.js sin sacrificar logging.
 *
 * **Decisiones de Arquitectura**:
 * - NO usa `pino-pretty` (causa problemas en Next.js)
 * - NO usa transports con workers (thread-stream issues)
 * - SI usa stdout directo de Pino (JSON estructurado)
 * - SI usa console como fallback si Pino falla
 *
 * **Propósito**:
 * - Logging estructurado con nivel configurable
 * - Compatible con Next.js (sin workers/threads)
 * - Procesable con herramientas externas (Winston, Datadog, etc)
 * - Safe wrapper previene crashes por errores de logging
 *
 * **Librerías Utilizadas**:
 * - `pino`: Logger ultra-rápido y estructurado
 * - `console`: Fallback si pino falla
 *
 * @module lib/logger
 * @see {@link ./env.ts} para LOG_LEVEL variable
 * @see {@link ./logger/structured-logger.ts} para logger más avanzado con contexto
 * @see {@link https://getpino.io} para documentación de Pino
 *
 * @remarks
 * **Por qué no pino-pretty**:
 * - pino-pretty usa fork/spawn de procesos
 * - En Next.js causas "thread-stream" errors
 * - JSON output es suficientemente legible con jq
 *
 * **Alternativas para Desarrollo**:
 * ```bash
 * # Formatear JSON en la terminal
 * npm run dev | jq .msg
 *
 * # O usar pino-pretty externamente
 * npm run dev | pino-pretty
 * ```
 *
 * **Comparación de Loggers**:
 * - Este archivo: Logger simple Pino (para debug básico)
 * - structured-logger.ts: Logger avanzado con contexto (para producción)
 *
 * @example
 * ```typescript
 * import safeLogger from '@/lib/logger';
 *
 * safeLogger.info('App started');
 * safeLogger.warn('Resource not found', { resourceId: '123' });
 * safeLogger.error('Database error', error);
 * safeLogger.debug('Detailed info', { userId: 'user-123' });
 * ```
 */

import pino from 'pino';
import { env } from './env';

/**
 * Instancia de Pino Logger
 *
 * Configurado con:
 * - Nivel dinámico desde LOG_LEVEL env variable
 * - Sin transports (stdout directo)
 * - JSON estructurado para processing externo
 *
 * @type {pino.Logger}
 *
 * @remarks
 * **Sin Workers**:
 * - Evita thread-stream issues
 * - Compatible con Next.js
 * - Output JSON directo a stdout
 *
 * **Consumo Externo**:
 * Los logs JSON se pueden procesar con:
 * - `jq`: Herramienta CLI para JSON
 * - `pino-pretty`: Formateador en tiempo real
 * - Servicios: Datadog, Loggly, CloudWatch, etc
 */
const pinoLogger = pino({
  level: env.LOG_LEVEL,
  // Sin transport - usa stdout directamente (sin workers)
  // Esto evita los errores de thread-stream
});

/**
 * Wrapper Seguro del Logger
 *
 * Implementa fallback a console si Pino falla internamente.
 * Garantiza que errores de logging no detengan la aplicación.
 *
 * @type {Object}
 * @property {Function} info - Log nivel INFO
 * @property {Function} warn - Log nivel WARN
 * @property {Function} error - Log nivel ERROR
 * @property {Function} debug - Log nivel DEBUG
 *
 * @remarks
 * **Error Handling**:
 * Si Pino genera error interno (raro pero posible), fallback a console.
 * Esto previene que logging roto cause crash de aplicación.
 *
 * **Métodos Disponibles**:
 * Cada método soporta: message, objeto, o combinación
 *
 * **Performance**:
 * - Try/catch mínimo overhead
 * - Directo a Pino en caso normal
 * - Console fallback es rápido
 */
const safeLogger = {
  info: (msg: unknown, ...args: unknown[]) => {
    try {
      if (typeof msg === 'string') {
        pinoLogger.info(msg);
      } else if (typeof msg === 'object' && msg !== null) {
        pinoLogger.info(msg, args[0] as string, ...args.slice(1));
      } else {
        console.log('[INFO]', msg, ...args);
      }
    } catch {
      console.log('[INFO]', msg, ...args);
    }
  },
  warn: (msg: unknown, ...args: unknown[]) => {
    try {
      if (typeof msg === 'string') {
        pinoLogger.warn(msg);
      } else if (typeof msg === 'object' && msg !== null) {
        pinoLogger.warn(msg, args[0] as string, ...args.slice(1));
      } else {
        console.warn('[WARN]', msg, ...args);
      }
    }
    catch {
      console.warn('[WARN]', msg, ...args);
    }
  },
  error: (msg: unknown, ...args: unknown[]) => {
    try {
      if (typeof msg === 'string') {
        pinoLogger.error(msg);
      } else if (typeof msg === 'object' && msg !== null) {
        pinoLogger.error(msg, args[0] as string, ...args.slice(1));
      } else {
        console.error('[ERROR]', msg, ...args);
      }
    }
    catch {
      console.error('[ERROR]', msg, ...args);
    }
  },
  debug: (msg: unknown, ...args: unknown[]) => {
    try {
      if (typeof msg === 'string') {
        pinoLogger.debug(msg);
      } else if (typeof msg === 'object' && msg !== null) {
        pinoLogger.debug(msg, args[0] as string, ...args.slice(1));
      } else {
        console.debug('[DEBUG]', msg, ...args);
      }
    }
    catch {
      console.debug('[DEBUG]', msg, ...args);
    }
  },
};

export default safeLogger;

