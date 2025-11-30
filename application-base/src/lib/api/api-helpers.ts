/**
 * API Route Helpers
 * Aurora Nova - Standardized API utilities
 *
 * Helpers para manejar errores y logging en API routes de forma estandarizada
 */

import { NextResponse } from 'next/server';
import { structuredLogger } from '@/lib/logger/structured-logger';
import { getApiLogContext } from '@/lib/logger/helpers';
import { ZodError } from 'zod';
import { Prisma } from '@/lib/prisma/generated';

/**
 * Handle API errors with structured logging
 *
 * @param error - The error object
 * @param module - Module name (e.g., "users", "roles")
 * @param action - Action name (e.g., "list", "create", "update")
 * @param request - Optional request object for context
 * @returns NextResponse with appropriate error response
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   try {
 *     // ... your logic
 *   } catch (error) {
 *     return handleApiError(error, 'users', 'list', request);
 *   }
 * }
 * ```
 */
export async function handleApiError(
  error: unknown,
  module: string,
  action: string,
  request?: Request
): Promise<NextResponse> {
  const context = await getApiLogContext(module, action, request);

  // Zod validation errors
  if (error instanceof ZodError) {
    structuredLogger.warn('API validation error', {
      ...context,
      metadata: {
        ...context.metadata,
        errors: error.issues,
      },
    });

    return NextResponse.json(
      {
        error: 'Validation error',
        details: error.issues,
      },
      { status: 400 }
    );
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    structuredLogger.error('API Prisma error', error as Error, {
      ...context,
      metadata: {
        ...context.metadata,
        prismaCode: error.code,
      },
    });

    // Handle specific Prisma errors
    switch (error.code) {
      case 'P2002':
        return NextResponse.json(
          { error: 'A record with this unique field already exists' },
          { status: 409 }
        );
      case 'P2025':
        return NextResponse.json(
          { error: 'Record not found' },
          { status: 404 }
        );
      default:
        return NextResponse.json(
          { error: 'Database error occurred' },
          { status: 500 }
        );
    }
  }

  // Generic Error objects
  if (error instanceof Error) {
    structuredLogger.error('API error', error, context);

    return NextResponse.json(
      {
        error: 'An error occurred',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }

  // Unknown errors
  structuredLogger.error('Unknown API error', new Error(String(error)), context);

  return NextResponse.json(
    { error: 'An unexpected error occurred' },
    { status: 500 }
  );
}

/**
 * Log successful API operations
 *
 * @param message - Success message
 * @param module - Module name
 * @param action - Action name
 * @param metadata - Additional metadata
 * @param request - Optional request object
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const user = await createUser(data);
 *   logApiSuccess('User created', 'users', 'create', { userId: user.id }, request);
 *   return NextResponse.json({ data: user });
 * }
 * ```
 */
export async function logApiSuccess(
  message: string,
  module: string,
  action: string,
  metadata?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  const context = await getApiLogContext(module, action, request);

  structuredLogger.info(message, {
    ...context,
    metadata: {
      ...context.metadata,
      ...metadata,
    },
  });
}

/**
 * Wrapper for API route handlers with automatic error handling and logging
 *
 * @param handler - The async handler function
 * @param module - Module name
 * @param action - Action name
 * @returns Wrapped handler with error handling
 *
 * @example
 * ```ts
 * export const GET = withApiHandler(
 *   async (request: NextRequest) => {
 *     const users = await prisma.user.findMany();
 *     return NextResponse.json({ data: users });
 *   },
 *   'users',
 *   'list'
 * );
 * ```
 */
export function withApiHandler<T extends Request>(
  handler: (request: T, ...args: unknown[]) => Promise<NextResponse>,
  module: string,
  action: string
): (request: T, ...args: unknown[]) => Promise<NextResponse> {
  return async (request: T, ...args: unknown[]) => {
    try {
      const result = await handler(request, ...args);
      return result;
    } catch (error) {
      return await handleApiError(error, module, action, request);
    }
  };
}
