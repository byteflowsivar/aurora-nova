/**
 * Sistema de Rate Limiting (Limitación de Velocidad)
 *
 * Aurora Nova - API Rate Limiter
 *
 * Proporciona funcionalidad de rate limiting basada en token
 * para proteger endpoints contra abuso y DoS.
 * Usa LRU cache con TTL para almacenamiento eficiente en memoria.
 *
 * **Propósito**:
 * - Limitar cantidad de requests por cliente/endpoint
 * - Prevenir abuso de API
 * - Protección contra ataques DoS
 * - Control granular por token (IP, usuario, API key)
 *
 * **Librerías Utilizadas**:
 * - `lru-cache`: Cache con evicción LRU (Least Recently Used)
 *
 * **Características**:
 * - Límite configurable de tokens únicos (max)
 * - TTL configurable (intervalo de tiempo)
 * - Counter incremental por token
 * - Evicción automática de tokens antiguos
 *
 * @module lib/rate-limiter
 * @see {@link https://github.com/isaacs/node-lru-cache} para LRUCache docs
 *
 * @example
 * ```typescript
 * import { rateLimiter } from '@/lib/rate-limiter';
 *
 * // Crear limiter: máx 100 clientes, resetear cada 1 hora
 * const limiter = rateLimiter({
 *   uniqueTokenPerInterval: 100,
 *   interval: 60 * 60 * 1000 // 1 hora en ms
 * });
 *
 * // Usar en API route
 * export async function POST(request: Request) {
 *   const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
 *
 *   try {
 *     // Verificar límite: 10 requests por intervalo
 *     await limiter.check(10, clientIp);
 *     // Continuar con la operación
 *     return NextResponse.json({ success: true });
 *   } catch {
 *     return NextResponse.json(
 *       { error: 'Too many requests' },
 *       { status: 429 }
 *     );
 *   }
 * }
 * ```
 */

import { LRUCache } from 'lru-cache';

/**
 * Opciones para configurar el Rate Limiter
 *
 * @interface RateLimiterOptions
 *
 * @property uniqueTokenPerInterval - Máximo de tokens únicos a almacenar.
 *   Cuando se excede, se evictan los menos usados recientemente (LRU).
 *   Típicamente: cantidad máxima de clientes simultáneos esperados.
 *   (ej: 100 para API pequena, 10000 para grande)
 *
 * @property interval - Duración del intervalo de tiempo en milisegundos.
 *   Después de este tiempo, el contador de un token se reinicia.
 *   Típicamente: 60000 (1 min), 3600000 (1 hora)
 */
type RateLimiterOptions = {
  /**
   * Máximo de tokens únicos en caché simultaneamente
   * @example 100
   */
  uniqueTokenPerInterval: number;

  /**
   * Duración del intervalo en milisegundos (TTL)
   * @example 60000 para 1 minuto, 3600000 para 1 hora
   */
  interval: number;
};

/**
 * Crear una instancia del Rate Limiter
 *
 * Factory function que retorna un limiter configurado.
 * Cada limiter tiene su propio cache LRU independiente.
 *
 * @param options - Configuración del limiter
 * @param options.uniqueTokenPerInterval - Max tokens en caché
 * @param options.interval - Duración del intervalo (TTL)
 *
 * @returns {Object} Objeto limiter con método check()
 *
 * @remarks
 * **Estructura Interna**:
 * - Usa LRUCache para almacenamiento eficiente
 * - Cada token tiene contador [count]
 * - TTL automático invalida tokens antiguos
 * - Evicción LRU cuando se alcanza max
 *
 * **Memory Management**:
 * - LRU previene memory leaks con límite de tokens
 * - TTL limpia tokens expirados automáticamente
 * - Apto para aplicaciones con muchos clientes
 *
 * **Casos de Uso Típicos**:
 * - Limiter por IP: 100 requests/min
 * - Limiter por usuario: 1000 requests/hora
 * - Limiter por API key: custom límite
 * - Limiter por endpoint: máximo de requests totales
 *
 * @example
 * ```typescript
 * // Rate limiter para API pública
 * const publicLimiter = rateLimiter({
 *   uniqueTokenPerInterval: 1000,    // Máx 1000 IPs simultáneas
 *   interval: 60 * 1000              // Resetear cada minuto
 * });
 *
 * // Rate limiter para usuarios autenticados
 * const authLimiter = rateLimiter({
 *   uniqueTokenPerInterval: 500,     // Máx 500 usuarios simultáneos
 *   interval: 60 * 60 * 1000         // Resetear cada hora
 * });
 *
 * // Rate limiter para endpoint crítico
 * const strictLimiter = rateLimiter({
 *   uniqueTokenPerInterval: 100,     // Solo 100 usuarios
 *   interval: 24 * 60 * 60 * 1000    // Resetear diariamente
 * });
 * ```
 */
export const rateLimiter = (options: RateLimiterOptions) => {
  const tokenCache = new LRUCache<string, number[]>({
    max: options.uniqueTokenPerInterval,
    ttl: options.interval,
  });

  return {
    /**
     * Verificar si un token está dentro del límite
     *
     * Incrementa el contador del token y verifica si excede el límite.
     * Si no está en caché, inicializa a 0 e incrementa.
     *
     * @async
     * @param limit - Límite máximo de requests permitidos en el intervalo
     * @param token - Token identificador (IP, user ID, API key, etc)
     *
     * @returns {Promise<void>} Resuelve si está dentro del límite
     *
     * @throws {Error} Si se excede el límite ("Rate limit exceeded")
     *
     * @remarks
     * **Flujo de Ejecución**:
     * 1. Obtiene contador actual del token (o inicializa en 0)
     * 2. Si es nuevo, lo agrega al caché
     * 3. Incrementa el contador
     * 4. Verifica si >= límite
     * 5. Rechaza si se excede, acepta si no
     *
     * **Thread Safety**:
     * - Operaciones sincrónicas (no async realmente)
     * - Retorna Promise para compatibilidad con código async
     * - Seguro para concurrencia en Node.js (single-threaded)
     *
     * **Performance**:
     * - O(1) para lookup/insert en caché
     * - Muy rápido incluso con muchos tokens
     * - No causa bloqueos
     *
     * **Casos de Uso**:
     * - Verificación en middleware de API
     * - Protección de endpoints críticos
     * - Control de abuso por cliente
     *
     * @example
     * ```typescript
     * // En middleware o API route
     * const limiter = rateLimiter({
     *   uniqueTokenPerInterval: 100,
     *   interval: 60000
     * });
     *
     * try {
     *   const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
     *   await limiter.check(10, clientIp); // Máx 10 requests/minuto
     *
     *   // Procesar request
     *   return NextResponse.json({ data: [...] });
     * } catch (error) {
     *   return NextResponse.json(
     *     { error: 'Rate limit exceeded. Please wait.' },
     *     { status: 429 } // Too Many Requests
     *   );
     * }
     * ```
     *
     * **Error Handling**:
     * ```typescript
     * try {
     *   await limiter.check(limit, token);
     * } catch (error) {
     *   if (error.message === 'Rate limit exceeded') {
     *     // Manejar rate limit
     *     return tooManyRequestsResponse();
     *   }
     *   throw error; // Otro error
     * }
     * ```
     */
    check: (limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const tokenCount = tokenCache.get(token) || [0];
        if (tokenCount[0] === 0) {
          tokenCache.set(token, tokenCount);
        }
        tokenCount[0] += 1;

        const currentUsage = tokenCount[0];
        const isRateLimited = currentUsage >= limit;

        if (isRateLimited) {
          reject(new Error('Rate limit exceeded'));
        } else {
          resolve();
        }
      }),
  };
};
