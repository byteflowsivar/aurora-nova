/**
 * Logger Helpers - Utilidades para Crear Contexto de Logging
 *
 * Aurora Nova - Sistema de Logging Estructurado
 *
 * Proporciona funciones helper para crear contextos de logging automáticamente
 * en Server Actions y API Routes, extrayendo información de:
 * - Headers HTTP (requestId)
 * - Sesión del usuario (userId, sessionId)
 * - Metadata de request
 *
 * @module lib/logger/helpers
 * @see {@link StructuredLogger} para usar el logger
 * @see {@link LogContext} para tipos de contexto
 *
 * @example
 * ```typescript
 * import { getLogContext, createLogContext, enrichContext } from '@/lib/logger/helpers';
 * import { structuredLogger } from '@/lib/logger/structured-logger';
 *
 * // En Server Action
 * export async function loginUser(credentials: LoginInput) {
 *   const context = await getLogContext('auth', 'login');
 *   structuredLogger.info('Login attempt', context);
 * }
 *
 * // En API Route
 * export async function GET(request: NextRequest) {
 *   const context = await getApiLogContext('users', 'list', request);
 *   structuredLogger.info('Fetching users', context);
 * }
 *
 * // Contexto con metadata personalizado
 * const context = createLogContext('auth', 'register', {
 *   email: 'user@example.com'
 * });
 *
 * // Enriquecer contexto existente
 * const enriched = enrichContext(context, {
 *   provider: 'credentials'
 * });
 * ```
 */

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import type { LogContext } from './types';

/**
 * Obtener contexto estructurado para Server Actions
 *
 * Extrae automáticamente información de sesión y headers para crear
 * un contexto de logging completo. Ideal para usar en Server Actions
 * donde necesitas información del usuario y request.
 *
 * @async
 * @param module - Nombre del módulo (ej: "auth", "users", "roles", "permissions")
 * @param action - Nombre de la acción (ej: "login", "create", "update", "delete")
 *
 * @returns {Promise<Partial<LogContext>>} Contexto de log con:
 *   - requestId: ID del request extraído de headers (x-request-id)
 *   - userId: ID del usuario actual de la sesión
 *   - sessionId: Token de sesión
 *   - module: Nombre del módulo
 *   - action: Nombre de la acción
 *
 * @remarks
 * Información extraída:
 * - **requestId**: Del header `x-request-id` (para correlacionar logs)
 * - **userId**: Del objeto de sesión auth()
 * - **sessionId**: Del token de sesión auth()
 * - **module/action**: Pasados como parámetros
 *
 * Si ocurre error al obtener sesión/headers, retorna al menos module y action,
 * con metadata.contextError describiendo el problema.
 *
 * @throws No lanza excepciones, maneja errores internamente
 *
 * @example
 * ```typescript
 * // En un Server Action de login
 * export async function loginUser(credentials: LoginInput) {
 *   const context = await getLogContext('auth', 'login');
 *   structuredLogger.info('Login attempt', context);
 *   // Output: { module: 'auth', action: 'login', userId: 'user-123', requestId: 'req-456', ... }
 *
 *   try {
 *     const user = await verifyUserCredentials(credentials.email, credentials.password);
 *     if (user) {
 *       structuredLogger.info('Login successful', context);
 *       // Crear sesión...
 *     } else {
 *       structuredLogger.warn('Login failed - invalid credentials', context);
 *     }
 *   } catch (error) {
 *     structuredLogger.error('Login error', error as Error, context);
 *   }
 * }
 * ```
 *
 * @see {@link getApiLogContext} para API routes
 * @see {@link createLogContext} para contexto sin información de sesión
 * @see {@link enrichContext} para agregar metadata adicional
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
 * Obtener contexto de log para API Routes
 *
 * Similar a {@link getLogContext} pero optimizada para Next.js API routes.
 * Extrae información de sesión, headers, y metadata del request.
 *
 * @async
 * @param module - Nombre del módulo (ej: "users", "roles", "permissions", "audit")
 * @param action - Nombre de la acción (ej: "list", "get", "create", "update")
 * @param request - Objeto NextRequest/Request opcional para extraer metadata adicional
 *                  (método HTTP, URL, user-agent)
 *
 * @returns {Promise<Partial<LogContext>>} Contexto de log con:
 *   - requestId: ID del request extraído de headers
 *   - userId: ID del usuario actual de la sesión
 *   - sessionId: Token de sesión
 *   - module: Nombre del módulo
 *   - action: Nombre de la acción
 *   - metadata: Información del request si se proporciona
 *     - method: HTTP method (GET, POST, etc)
 *     - url: URL del request
 *     - userAgent: User-Agent del navegador/cliente
 *
 * @remarks
 * Diferencias con {@link getLogContext}:
 * - Incluye metadata del request (método, URL, user-agent)
 * - Optimizada para API routes donde se tiene acceso al objeto request
 * - Maneja errores internamente sin lanzar excepciones
 *
 * La metadata se agrega solo si se proporciona el parámetro request.
 *
 * @throws No lanza excepciones, maneja errores internamente
 *
 * @example
 * ```typescript
 * // En una API route GET
 * export async function GET(request: NextRequest) {
 *   const context = await getApiLogContext('users', 'list', request);
 *   // context = {
 *   //   module: 'users',
 *   //   action: 'list',
 *   //   userId: 'user-123',
 *   //   requestId: 'req-789',
 *   //   metadata: {
 *   //     method: 'GET',
 *   //     url: 'https://example.com/api/users',
 *   //     userAgent: 'Mozilla/5.0...'
 *   //   }
 *   // }
 *
 *   structuredLogger.info('Fetching users', context);
 *
 *   try {
 *     const users = await getAllUsers();
 *     return Response.json({ data: users });
 *   } catch (error) {
 *     structuredLogger.error('Failed to fetch users', error as Error, context);
 *     return Response.json(
 *       { error: 'Failed to fetch users' },
 *       { status: 500 }
 *     );
 *   }
 * }
 *
 * // En una API route POST sin request metadata
 * export async function POST(request: NextRequest) {
 *   const context = await getApiLogContext('users', 'create');
 *   const body = await request.json();
 *   structuredLogger.info('Creating user', context);
 *   // ...
 * }
 * ```
 *
 * @see {@link getLogContext} para Server Actions
 * @see {@link createLogContext} para contexto simple sin sesión
 * @see {@link enrichContext} para agregar metadata adicional
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
 * Crear contexto de log con metadata personalizado
 *
 * Utilidad para crear rápidamente un contexto con metadata personalizado
 * sin necesidad de extraer información de sesión o headers.
 * Útil para logging en librerías, servicios, o cuando la información
 * de sesión no está disponible.
 *
 * @param module - Nombre del módulo (ej: "email-service", "logger", "utils")
 * @param action - Nombre de la acción (opcional, ej: "send_email", "sanitize")
 * @param metadata - Objeto con metadata personalizado (opcional)
 *
 * @returns {Partial<LogContext>} Contexto de log simple con:
 *   - module: Nombre del módulo
 *   - action: Nombre de la acción (si se proporciona)
 *   - metadata: Metadata personalizado (si se proporciona)
 *
 * @remarks
 * Este es el helper más simple, crea contexto sin información de sesión/headers.
 * Perfecto para:
 * - Logging en librerías sin acceso a contexto de request
 * - Logging en servicios utilitarios
 * - Logging en tests
 * - Cuando la información de sesión no es relevante
 *
 * Para obtener información automática de sesión:
 * - Usar {@link getLogContext} en Server Actions
 * - Usar {@link getApiLogContext} en API routes
 *
 * @example
 * ```typescript
 * // En un servicio de email (sin acceso a sesión)
 * export async function sendWelcomeEmail(userEmail: string) {
 *   const context = createLogContext('email-service', 'send_welcome', {
 *     recipient: userEmail,
 *     template: 'welcome'
 *   });
 *   structuredLogger.info('Sending welcome email', context);
 *   // ...
 * }
 *
 * // En una librería utilitaria
 * const context = createLogContext('utils', 'hash_password', {
 *   algorithm: 'bcrypt',
 *   rounds: 12
 * });
 *
 * // En un test
 * describe('UserService', () => {
 *   it('should create user', () => {
 *     const context = createLogContext('users', 'create', {
 *       testSuite: 'UserService'
 *     });
 *     // Test logic...
 *   });
 * });
 * ```
 *
 * @see {@link getLogContext} para extraer información automáticamente
 * @see {@link getApiLogContext} para API routes
 * @see {@link enrichContext} para agregar metadata a contexto existente
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
 * Enriquecer contexto existente con metadata adicional
 *
 * Toma un contexto de log existente y agrega metadata adicional,
 * combinando la metadata existente con la nueva. Útil para agregar
 * información progresivamente durante el flujo de ejecución.
 *
 * @param context - Contexto de log existente a enriquecer
 * @param metadata - Metadata adicional a agregar
 *
 * @returns {Partial<LogContext>} Contexto enriquecido que:
 *   - Mantiene todos los campos del contexto original
 *   - Agrega/sobreescribe los campos de metadata proporcionados
 *   - Combina metadata existente con nueva metadata
 *
 * @remarks
 * Estrategia de merge:
 * - Spread operator (...) preserva el contexto original
 * - Metadata se combina en orden: existente + nueva
 * - Si hay conflictos, la nueva metadata tiene precedencia
 *
 * Casos de uso típicos:
 * - Agregar información a contexto mientras procesas una operación
 * - Enriquecer contexto con resultados intermedios
 * - Pasar información adicional sin perder contexto existente
 * - Construir contextos complejos paso a paso
 *
 * @example
 * ```typescript
 * // Contexto base con información de sesión
 * const baseContext = await getLogContext('auth', 'login');
 * // { module: 'auth', action: 'login', userId: 'user-123', ... }
 *
 * // Enriquecer con información adicional del login
 * const enrichedContext = enrichContext(baseContext, {
 *   email: credentials.email,
 *   provider: 'credentials',
 *   ipAddress: '192.168.1.1'
 * });
 * // {
 * //   module: 'auth',
 * //   action: 'login',
 * //   userId: 'user-123',
 * //   metadata: {
 * //     email: 'user@example.com',
 * //     provider: 'credentials',
 * //     ipAddress: '192.168.1.1'
 * //   }
 * // }
 *
 * structuredLogger.info('Login successful', enrichedContext);
 *
 * // Enriquecer progresivamente
 * export async function registerUser(input: RegisterInput) {
 *   let context = createLogContext('auth', 'register');
 *
 *   context = enrichContext(context, { email: input.email });
 *   structuredLogger.info('Registration started', context);
 *
 *   // ... validate email ...
 *
 *   context = enrichContext(context, { validationPassed: true });
 *   structuredLogger.info('Validation passed', context);
 *
 *   // ... create user ...
 *
 *   context = enrichContext(context, { userId: newUser.id });
 *   structuredLogger.info('User created', context);
 * }
 * ```
 *
 * @see {@link createLogContext} para crear contexto inicial
 * @see {@link getLogContext} para obtener contexto con sesión
 * @see {@link structuredLogger} para logging
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
