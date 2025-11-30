/**
 * Request ID Middleware Utilities
 * Aurora Nova - Logging System
 *
 * Utilities for generating and propagating request IDs across the application
 */

import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';

/**
 * Header name for request ID
 */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Generate a unique request ID
 *
 * @returns UUID v4 string
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Get or generate request ID from request headers
 *
 * If the request already has a request ID (from a proxy or client),
 * use it. Otherwise, generate a new one.
 *
 * @param request - Next.js request object
 * @returns Request ID string
 */
export function getOrGenerateRequestId(request: NextRequest): string {
  const existingId = request.headers.get(REQUEST_ID_HEADER);
  return existingId ?? generateRequestId();
}

/**
 * Add request ID to request headers
 *
 * Creates a new Headers object with the request ID added
 *
 * @param request - Next.js request object
 * @param requestId - Request ID to add
 * @returns New Headers object
 */
export function addRequestIdToHeaders(
  request: NextRequest,
  requestId: string
): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);
  return requestHeaders;
}
