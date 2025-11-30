/**
 * Logger Module
 * Aurora Nova - Structured Logging System
 *
 * Main exports for the logging system
 */

// Main logger instance
export { structuredLogger } from './structured-logger';

// Helper functions
export { getLogContext, getApiLogContext, createLogContext, enrichContext } from './helpers';

// Request ID utilities
export { generateRequestId, getOrGenerateRequestId, REQUEST_ID_HEADER } from './request-id';

// Types
export type { LogContext, LogLevel, IStructuredLogger } from './types';
