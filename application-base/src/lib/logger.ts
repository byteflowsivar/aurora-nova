import pino from 'pino';
import { env } from './env';

/**
 * Logger configurado para Aurora Nova
 *
 * IMPORTANTE: No usamos pino-pretty ni transports con workers porque
 * causan problemas con thread-stream en Next.js y otros entornos.
 *
 * En desarrollo, usamos el formateo JSON básico de pino (sin workers).
 * Los logs se pueden leer fácilmente o procesarse con herramientas externas.
 */
const pinoLogger = pino({
  level: env.LOG_LEVEL,
  // Sin transport - usa stdout directamente (sin workers)
  // Esto evita los errores de thread-stream
});

/**
 * Wrapper seguro del logger que maneja errores internos de pino
 * Si pino falla (por problemas con workers), usa console como fallback
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

