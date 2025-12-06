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
 * GET /api/public/health - Verificar estado de salud de la aplicación
 *
 * Endpoint público que verifica si la aplicación está funcionando correctamente.
 * Sin autenticación requerida. Usado por load balancers, monitoring sistemas, k8s probes.
 * Responde rápidamente sin checks pesados (por performance en orchestration).
 *
 * **Autenticación**: No requerida (endpoint público)
 *
 * **Parámetros**: Ninguno
 *
 * **Respuesta** (200 - Healthy):
 * ```json
 * {
 *   "status": "ok",
 *   "timestamp": "2024-12-05T12:00:00.123Z"
 * }
 * ```
 *
 * **Errores**:
 * - 503: Service Unavailable (error no especificado, típicamente nunca ocurre)
 *   ```json
 *   {
 *     "status": "error",
 *     "error": "Mensaje de error específico"
 *   }
 *   ```
 *
 * **Características**:
 * - Responde en < 10ms en operaciones normales
 * - No conecta a BD (por performance)
 * - No verifica servicios externos
 * - Simplemente retorna estado y timestamp
 * - Idempotente: múltiples llamadas dan mismo resultado
 * - Sin efectos secundarios
 *
 * **Casos de Uso**:
 * - Load balancers (verifican cada 5-30 segundos)
 * - Kubernetes liveness probe (detecta procesos muertos)
 * - Kubernetes readiness probe (detecta no listo para tráfico)
 * - Monitoreo de uptime (Uptime Robot, StatusPage, etc)
 * - CI/CD pipelines (validar deployment exitoso)
 * - Health dashboards internas
 * - Verificar conectividad desde clientes
 *
 * **Extensiones Futuras Posibles**:
 * - Chequeo de conectividad a BD (Prisma ping)
 * - Verificar estado de servicios externos (Redis, APIs)
 * - Métricas de CPU/memoria disponible
 * - Versión de aplicación y build info
 * - Timestamp de último deployment
 * - Información de base de datos (conexiones activas, etc)
 *
 * **Performance**:
 * - Muy rápido (< 10ms típicamente)
 * - Sin I/O pesado
 * - Sin lógica de negocio
 * - Crítico mantener así para orchestration
 *
 * **Seguridad**:
 * - Endpoint público (sin JWT requerido)
 * - No expone información sensible
 * - No puede causar cambios en sistema
 * - CORS permitido (accesible desde navegadores)
 *
 * @method GET
 * @route /api/public/health
 * @auth No requerida (público)
 *
 * @returns {Promise<NextResponse>} Status y timestamp (200) o error (503)
 *
 * @example
 * ```typescript
 * // Health check simple desde cliente
 * const response = await fetch('/api/public/health')
 * const data = await response.json()
 * console.log(`Status: ${data.status}`) // "ok"
 * console.log(`Timestamp: ${data.timestamp}`) // "2024-12-05T12:00:00.123Z"
 *
 * // Monitoreo periódico
 * setInterval(async () => {
 *   const response = await fetch('/api/public/health')
 *   if (!response.ok) {
 *     console.error('Aplicación no disponible!')
 *   }
 * }, 30000) // Cada 30 segundos
 *
 * // Con curl (para scripts)
 * curl https://api.example.com/api/public/health
 * // Response: {"status":"ok","timestamp":"2024-12-05T10:30:45.123Z"}
 *
 * // Docker healthcheck
 * HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
 *   CMD curl -f http://localhost:3000/api/public/health || exit 1
 *
 * // Kubernetes liveness probe
 * livenessProbe:
 *   httpGet:
 *     path: /api/public/health
 *     port: 3000
 *   initialDelaySeconds: 10
 *   periodSeconds: 10
 * ```
 *
 * @important
 * - **Crítico para operaciones**: Debe mantener minimal y rápido
 * - **No agregar checks pesados**: Afecta a orchestration y escalabilidad
 * - **Responder siempre < 1 segundo**: Estándar industrial para health checks
 * - **Sin conectividad BD**: Solo si absolutamente necesario
 *
 * @remarks
 * Este endpoint es **especial** en infraestructura. Si falla o es lento:
 * - Load balancers pueden sacarte del pool de servidores
 * - Kubernetes podría reiniciar tu instancia
 * - Usuarios podrían pensar que sistema está caído
 * - Cascadas de fallos pueden ocurrir (retry storms)
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
