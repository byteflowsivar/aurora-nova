/**
 * Logger Helpers
 * Aurora Nova - Logging System
 *
 * Helper functions to easily create log contexts in Server Actions and API Routes
 */

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import type { LogContext } from './types';

/**
 * Get structured log context for Server Actions
 *
 * Automatically extracts:
 * - Request ID from headers
 * - User ID from session
 * - Session ID from session
 *
 * @param module - Module name (e.g., "auth", "users", "roles")
 * @param action - Action name (e.g., "login", "create", "update")
 * @returns Partial log context with request and user information
 *
 * @example
 * ```ts
 * export async function loginUser(credentials: LoginInput) {
 *   const context = await getLogContext('auth', 'login');
 *   structuredLogger.info('Login attempt', context);
 * }
 * ```
 */
export async function getLogContext(
  module: string,
  action?: string
): Promise<Partial<LogContext>> {
  try {
    const [session, headersList] = await Promise.all([
      auth(),
      headers(),
    ]);

    return {
      requestId: headersList.get('x-request-id') ?? undefined,
      userId: session?.user?.id,
      sessionId: session?.sessionToken,
      module,
      action,
    };
  } catch (error) {
    // If we can't get context, return minimal context
    return {
      module,
      action,
      metadata: {
        contextError: (error as Error).message,
      },
    };
  }
}

/**
 * Get log context for API Routes
 *
 * Similar to getLogContext but optimized for Next.js API routes
 *
 * @param module - Module name
 * @param action - Action name
 * @param request - Optional NextRequest object to extract additional context
 * @returns Partial log context
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const context = await getApiLogContext('users', 'list', request);
 *   structuredLogger.info('Fetching users', context);
 * }
 * ```
 */
export async function getApiLogContext(
  module: string,
  action?: string,
  request?: Request
): Promise<Partial<LogContext>> {
  try {
    const [session, headersList] = await Promise.all([
      auth(),
      headers(),
    ]);

    const context: Partial<LogContext> = {
      requestId: headersList.get('x-request-id') ?? undefined,
      userId: session?.user?.id,
      sessionId: session?.sessionToken,
      module,
      action,
    };

    // Add request metadata if request object is provided
    if (request) {
      context.metadata = {
        method: request.method,
        url: request.url,
        userAgent: headersList.get('user-agent') ?? undefined,
      };
    }

    return context;
  } catch (error) {
    return {
      module,
      action,
      metadata: {
        contextError: (error as Error).message,
      },
    };
  }
}

/**
 * Create a log context with metadata
 *
 * Utility to quickly create a context with custom metadata
 *
 * @param module - Module name
 * @param action - Action name
 * @param metadata - Custom metadata object
 * @returns Log context
 *
 * @example
 * ```ts
 * const context = createLogContext('users', 'create', {
 *   email: 'user@example.com',
 *   role: 'admin'
 * });
 * ```
 */
export function createLogContext(
  module: string,
  action?: string,
  metadata?: Record<string, unknown>
): Partial<LogContext> {
  return {
    module,
    action,
    metadata,
  };
}

/**
 * Enrich existing context with additional metadata
 *
 * @param context - Existing log context
 * @param metadata - Additional metadata to add
 * @returns Enriched context
 *
 * @example
 * ```ts
 * const baseContext = await getLogContext('auth', 'login');
 * const enrichedContext = enrichContext(baseContext, {
 *   email: credentials.email,
 *   provider: 'credentials'
 * });
 * ```
 */
export function enrichContext(
  context: Partial<LogContext>,
  metadata: Record<string, unknown>
): Partial<LogContext> {
  return {
    ...context,
    metadata: {
      ...context.metadata,
      ...metadata,
    },
  };
}
