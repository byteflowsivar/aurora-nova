/**
 * Structured Logger Implementation
 * Aurora Nova - Logging System
 *
 * This logger provides structured logging with context, request tracking,
 * and performance measurement capabilities.
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
 * StructuredLogger class
 * Wrapper around Pino with enhanced context and error handling
 */
class StructuredLogger implements IStructuredLogger {
  private logger: pino.Logger;

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
   * Log a debug message
   */
  debug(message: string, context?: Partial<LogContext>): void {
    this.log('debug', message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Partial<LogContext>): void {
    this.log('info', message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Partial<LogContext>): void {
    this.log('warn', message, context);
  }

  /**
   * Log an error message with error object
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
   * Log a fatal error message
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
   * Measure execution time of an async function and log performance
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
   * Internal log method
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
   * Sanitize context to prevent logging sensitive data
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
   * Sanitize metadata to remove sensitive fields
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
   * Create a child logger with additional context
   */
  child(context: Partial<LogContext>): StructuredLogger {
    const childLogger = new StructuredLogger();
    childLogger.logger = this.logger.child(this.sanitizeContext(context) ?? {});
    return childLogger;
  }
}

// Export singleton instance
export const structuredLogger = new StructuredLogger();

// Export class for testing
export { StructuredLogger };
