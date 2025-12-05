/**
 * API Route: Health Check Endpoint
 *
 * Endpoint público para verificar el estado de salud de la aplicación.
 * Utilizado por load balancers, monitoring systems y uptime checkers para
 * determinar si el servicio está operacional.
 *
 * **Endpoints**:
 * - GET /api/public/health - Estado de salud de la aplicación
 *
 * @module api/public/health
 */

import { NextResponse } from 'next/server';

/**
 * Verifica el estado de salud de la aplicación.
 *
 * Endpoint público sin autenticación que retorna el estado actual del servicio.
 * Puede ser extendido en el futuro para incluir chequeos de conectividad a BD,
 * servicios externos, memoria disponible, etc.
 *
 * **Endpoint Details**:
 * - Method: GET
 * - Route: /api/public/health
 * - Auth: No requiere autenticación (público)
 * - Content-Type: application/json
 * - CORS: Accesible desde cualquier origen (considerar restricciones en producción)
 *
 * **Respuestas**:
 * - 200: Aplicación está funcionando correctamente
 *   - `status: "ok"`
 *   - `timestamp: string` (ISO 8601 format)
 * - 503: Service Unavailable - La aplicación no está funcionando correctamente
 *   - `status: "error"`
 *   - `error: string` (mensaje de error específico)
 *
 * **Flujo**:
 * 1. Try: Intenta ejecutar el chequeo de salud
 * 2. Retorna el estado actual y timestamp del servidor
 * 3. Catch: Si ocurre un error, retorna status 503 con mensaje de error
 *
 * **Uso Típico**:
 * - Load balancers chequean este endpoint cada pocos segundos
 * - Herramientas de monitoreo (Uptime Robot, StatusPage, etc) lo utilizan
 * - Kubernetes liveness/readiness probes pueden dirigirse a este endpoint
 * - CI/CD pipelines lo usan para validar deployment exitoso
 *
 * **Extensiones Futuras**:
 * - Chequear conectividad a base de datos (Prisma)
 * - Verificar estado de servicios externos (Redis, APIs)
 * - Chequear uso de memoria y CPU
 * - Incluir versión de la aplicación
 * - Incluir información de build
 *
 * @async
 * @returns {Promise<NextResponse>} Objeto con estado de salud y timestamp
 *   - 200: { status: "ok", timestamp: ISO8601String }
 *   - 503: { status: "error", error: string }
 *
 * @example
 * ```typescript
 * // Health check simple
 * const response = await fetch('/api/public/health');
 * const data = await response.json();
 * console.log('Health status:', data.status); // "ok"
 * console.log('Server time:', data.timestamp); // "2024-12-05T..."
 *
 * // Con curl
 * curl https://api.example.com/api/public/health
 * // Response: {"status":"ok","timestamp":"2024-12-05T10:30:45.123Z"}
 *
 * // En Docker/Kubernetes healthcheck
 * HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
 *   CMD curl -f http://localhost:3000/api/public/health || exit 1
 * ```
 *
 * @remarks
 * - Este endpoint es **crítico para operaciones**. No debe tener lógica pesada.
 * - Debe responder en menos de 1 segundo en operaciones normales.
 * - No debe conectarse a BD a menos que sea estrictamente necesario.
 * - Debe ser uno de los primeros endpoints en funcionar ante problemas.
 */
export async function GET() {
  try {
    // In a real-world scenario, you might want to check database connectivity
    // or other critical services here.
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 503 }
    );
  }
}
