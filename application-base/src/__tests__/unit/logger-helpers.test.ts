/**
 * Tests unitarios para logger helpers
 * Aurora Nova - Logging System Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { createLogContext, enrichContext } from '@/lib/logger/helpers';
import type { LogContext } from '@/lib/logger/types';

// Mock next-auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
    sessionToken: 'test-session-token',
  })),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => {
      if (name === 'x-request-id') return 'test-request-id';
      if (name === 'user-agent') return 'test-user-agent';
      return null;
    },
  })),
}));

describe('Logger Helpers', () => {
  describe('createLogContext()', () => {
    it('should create basic log context', () => {
      const context = createLogContext('test_module', 'test_action');

      expect(context).toEqual({
        module: 'test_module',
        action: 'test_action',
        metadata: undefined,
      });
    });

    it('should create context with metadata', () => {
      const metadata = {
        userId: '123',
        email: 'test@example.com',
      };

      const context = createLogContext('test_module', 'test_action', metadata);

      expect(context).toEqual({
        module: 'test_module',
        action: 'test_action',
        metadata,
      });
    });

    it('should create context without action', () => {
      const context = createLogContext('test_module');

      expect(context).toEqual({
        module: 'test_module',
        action: undefined,
        metadata: undefined,
      });
    });
  });

  describe('enrichContext()', () => {
    it('should enrich context with additional metadata', () => {
      const baseContext: Partial<LogContext> = {
        module: 'test_module',
        action: 'test_action',
      };

      const additionalMetadata = {
        userId: '123',
        email: 'test@example.com',
      };

      const enriched = enrichContext(baseContext, additionalMetadata);

      expect(enriched).toEqual({
        module: 'test_module',
        action: 'test_action',
        metadata: additionalMetadata,
      });
    });

    it('should merge metadata when base context has metadata', () => {
      const baseContext: Partial<LogContext> = {
        module: 'test_module',
        metadata: {
          existingField: 'existing_value',
        },
      };

      const additionalMetadata = {
        newField: 'new_value',
      };

      const enriched = enrichContext(baseContext, additionalMetadata);

      expect(enriched.metadata).toEqual({
        existingField: 'existing_value',
        newField: 'new_value',
      });
    });

    it('should override existing metadata fields', () => {
      const baseContext: Partial<LogContext> = {
        module: 'test_module',
        metadata: {
          field: 'old_value',
        },
      };

      const additionalMetadata = {
        field: 'new_value',
      };

      const enriched = enrichContext(baseContext, additionalMetadata);

      expect(enriched.metadata?.field).toBe('new_value');
    });

    it('should handle empty additional metadata', () => {
      const baseContext: Partial<LogContext> = {
        module: 'test_module',
        metadata: {
          existingField: 'value',
        },
      };

      const enriched = enrichContext(baseContext, {});

      expect(enriched.metadata).toEqual({
        existingField: 'value',
      });
    });

    it('should preserve all context fields', () => {
      const baseContext: Partial<LogContext> = {
        module: 'test_module',
        action: 'test_action',
        requestId: 'req-123',
        userId: 'user-456',
        sessionId: 'session-789',
      };

      const enriched = enrichContext(baseContext, { newField: 'value' });

      expect(enriched).toEqual({
        module: 'test_module',
        action: 'test_action',
        requestId: 'req-123',
        userId: 'user-456',
        sessionId: 'session-789',
        metadata: {
          newField: 'value',
        },
      });
    });
  });

  describe('edge cases', () => {
    it('should handle null metadata gracefully', () => {
      const context = createLogContext('test_module', 'test_action', undefined);

      expect(context.metadata).toBeUndefined();
    });

    it('should handle complex metadata objects', () => {
      const complexMetadata = {
        nested: {
          deeply: {
            nested: 'value',
          },
        },
        array: [1, 2, 3],
        date: new Date('2024-01-01'),
      };

      const context = createLogContext('test_module', 'test_action', complexMetadata);

      expect(context.metadata).toEqual(complexMetadata);
    });

    it('should handle special characters in module and action names', () => {
      const context = createLogContext('test-module:v2', 'test_action/create');

      expect(context.module).toBe('test-module:v2');
      expect(context.action).toBe('test_action/create');
    });
  });
});
