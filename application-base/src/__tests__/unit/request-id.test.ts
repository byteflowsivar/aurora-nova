/**
 * Tests unitarios para request ID utilities
 * Aurora Nova - Logging System Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateRequestId,
  getOrGenerateRequestId,
  addRequestIdToHeaders,
  REQUEST_ID_HEADER,
} from '@/lib/logger/request-id';
import type { NextRequest } from 'next/server';

describe('Request ID Utilities', () => {
  describe('generateRequestId()', () => {
    it('should generate a valid UUID v4', () => {
      const requestId = generateRequestId();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(requestId).toMatch(uuidRegex);
    });

    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      const id3 = generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });
  });

  describe('getOrGenerateRequestId()', () => {
    it('should use existing request ID from headers', () => {
      const existingId = 'existing-request-id';
      const mockRequest = {
        headers: {
          get: (name: string) => (name === REQUEST_ID_HEADER ? existingId : null),
        },
      } as unknown as NextRequest;

      const requestId = getOrGenerateRequestId(mockRequest);

      expect(requestId).toBe(existingId);
    });

    it('should generate new request ID when not in headers', () => {
      const mockRequest = {
        headers: {
          get: () => null,
        },
      } as unknown as NextRequest;

      const requestId = getOrGenerateRequestId(mockRequest);

      // Should be a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(requestId).toMatch(uuidRegex);
    });
  });

  describe('addRequestIdToHeaders()', () => {
    it('should add request ID to request headers', () => {
      const requestId = 'test-request-id';
      const mockHeaders = new Headers();

      const mockRequest = {
        headers: mockHeaders,
      } as unknown as NextRequest;

      const newHeaders = addRequestIdToHeaders(mockRequest, requestId);

      expect(newHeaders.get(REQUEST_ID_HEADER)).toBe(requestId);
    });

    it('should preserve existing headers', () => {
      const requestId = 'test-request-id';
      const mockHeaders = new Headers({
        'content-type': 'application/json',
        'authorization': 'Bearer token',
      });

      const mockRequest = {
        headers: mockHeaders,
      } as unknown as NextRequest;

      const newHeaders = addRequestIdToHeaders(mockRequest, requestId);

      expect(newHeaders.get(REQUEST_ID_HEADER)).toBe(requestId);
      expect(newHeaders.get('content-type')).toBe('application/json');
      expect(newHeaders.get('authorization')).toBe('Bearer token');
    });

    it('should override existing request ID', () => {
      const oldRequestId = 'old-request-id';
      const newRequestId = 'new-request-id';
      const mockHeaders = new Headers();
      mockHeaders.set(REQUEST_ID_HEADER, oldRequestId);

      const mockRequest = {
        headers: mockHeaders,
      } as unknown as NextRequest;

      const newHeaders = addRequestIdToHeaders(mockRequest, newRequestId);

      expect(newHeaders.get(REQUEST_ID_HEADER)).toBe(newRequestId);
    });
  });

  describe('REQUEST_ID_HEADER constant', () => {
    it('should be the correct header name', () => {
      expect(REQUEST_ID_HEADER).toBe('x-request-id');
    });
  });
});
