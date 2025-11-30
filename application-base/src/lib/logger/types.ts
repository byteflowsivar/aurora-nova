/**
 * Logger Types and Interfaces
 * Aurora Nova - Structured Logging System
 */

/**
 * Structured log context with request tracking and metadata
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
 * Niveles de log soportados
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Configuración de niveles de log por módulo
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
 * Opciones para el logger
 */
export interface LoggerOptions {
  level?: LogLevel;
  moduleLogLevels?: Partial<ModuleLogLevels>;
  prettyPrint?: boolean;
}

/**
 * Interfaz del logger estructurado
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
