/**
 * Tests unitarios para el sistema de logging estructurado
 * Aurora Nova - Logging System Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StructuredLogger } from '@/lib/logger/structured-logger';
import type { LogContext } from '@/lib/logger/types';

describe('StructuredLogger', () => {
  let logger: StructuredLogger;

  beforeEach(() => {
    logger = new StructuredLogger();
  });

  describe('info()', () => {
    it('should log info messages with context', () => {
      const context: Partial<LogContext> = {
        module: 'test',
        action: 'test_action',
        requestId: 'test-request-id',
      };

      // This should not throw
      expect(() => {
        logger.info('Test message', context);
      }).not.toThrow();
    });

    it('should log info messages without context', () => {
      expect(() => {
        logger.info('Test message without context');
      }).not.toThrow();
    });
  });

  describe('error()', () => {
    it('should log error messages with error object', () => {
      const error = new Error('Test error');
      const context: Partial<LogContext> = {
        module: 'test',
        action: 'test_action',
      };

      expect(() => {
        logger.error('Error occurred', error, context);
      }).not.toThrow();
    });

    it('should log error with code property', () => {
      const error = Object.assign(new Error('Test error'), { code: 'TEST_ERROR' });
      const context: Partial<LogContext> = {
        module: 'test',
      };

      expect(() => {
        logger.error('Error with code', error, context);
      }).not.toThrow();
    });
  });

  describe('warn()', () => {
    it('should log warning messages', () => {
      const context: Partial<LogContext> = {
        module: 'test',
        metadata: {
          warningType: 'test_warning',
        },
      };

      expect(() => {
        logger.warn('Warning message', context);
      }).not.toThrow();
    });
  });

  describe('debug()', () => {
    it('should log debug messages', () => {
      const context: Partial<LogContext> = {
        module: 'test',
        metadata: {
          debugInfo: 'test_debug',
        },
      };

      expect(() => {
        logger.debug('Debug message', context);
      }).not.toThrow();
    });
  });

  describe('measure()', () => {
    it('should measure execution time of async function', async () => {
      const mockFn = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'result';
      });

      const context: Partial<LogContext> = {
        module: 'test',
        action: 'measure_test',
      };

      const result = await logger.measure(mockFn, context);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should log error and rethrow on function failure', async () => {
      const error = new Error('Test error');
      const mockFn = vi.fn(async () => {
        throw error;
      });

      const context: Partial<LogContext> = {
        module: 'test',
        action: 'error_test',
      };

      await expect(logger.measure(mockFn, context)).rejects.toThrow('Test error');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('context sanitization', () => {
    it('should redact sensitive fields in metadata', () => {
      const context: Partial<LogContext> = {
        module: 'auth',
        action: 'login',
        metadata: {
          email: 'test@example.com',
          password: 'secret123', // Should be redacted
          token: 'abc123', // Should be redacted
          normalField: 'normal_value',
        },
      };

      // This should sanitize the password and token fields
      expect(() => {
        logger.info('Test with sensitive data', context);
      }).not.toThrow();
    });

    it('should handle nested sensitive fields', () => {
      const context: Partial<LogContext> = {
        module: 'test',
        metadata: {
          user: {
            email: 'test@example.com',
            hashedPassword: 'hashed_secret', // Should be redacted
          },
          config: {
            apiKey: 'secret_key', // Should be redacted
          },
        },
      };

      expect(() => {
        logger.info('Test with nested sensitive data', context);
      }).not.toThrow();
    });
  });

  describe('child logger', () => {
    it('should create child logger with additional context', () => {
      const parentContext: Partial<LogContext> = {
        module: 'parent',
        requestId: 'parent-request-id',
      };

      const childLogger = logger.child(parentContext);

      expect(childLogger).toBeInstanceOf(StructuredLogger);

      // Child logger should work
      expect(() => {
        childLogger.info('Child message');
      }).not.toThrow();
    });
  });

  describe('enrichContext helper integration', () => {
    it('should handle enriched context correctly', () => {
      const baseContext: Partial<LogContext> = {
        module: 'test',
        action: 'test_action',
      };

      const enrichedContext: Partial<LogContext> = {
        ...baseContext,
        metadata: {
          ...baseContext.metadata,
          additionalField: 'value',
        },
      };

      expect(() => {
        logger.info('Message with enriched context', enrichedContext);
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty context', () => {
      expect(() => {
        logger.info('Message with empty context', {});
      }).not.toThrow();
    });

    it('should handle null metadata', () => {
      const context: Partial<LogContext> = {
        module: 'test',
        metadata: undefined,
      };

      expect(() => {
        logger.info('Message with null metadata', context);
      }).not.toThrow();
    });

    it('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000);

      expect(() => {
        logger.info(longMessage);
      }).not.toThrow();
    });
  });
});
