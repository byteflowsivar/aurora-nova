/**
 * API Route GET /api/auth/validate-reset-token - Aurora Nova
 *
 * Valida un token de reseteo de contraseña ANTES de mostrar el formulario.
 * Utilizado por frontend para verificar que el token es válido sin exponerlo.
 *
 * **Endpoint Details**:
 * - **Method**: GET
 * - **Route**: `/api/auth/validate-reset-token`
 * - **Auth**: Pública (token en query parameter)
 * - **Response Type**: application/json
 *
 * **Query Parameters**:
 * - `token` (string, requerido): Token UUID generado en solicitud de reset
 *
 * **Respuestas**:
 * - 200: `{ valid: true | false }`
 * - 400: `{ valid: false, error: "Token no proporcionado." }`
 * - 500: `{ valid: false, error: "Error del servidor." }`
 *
 * **Casos de Uso**:
 * 1. **Validación previa (Recomendado)**:
 *    - Usuario hace click en link de email con token
 *    - GET /api/auth/validate-reset-token?token=...
 *    - Si válido: mostrar formulario reset
 *    - Si inválido: mostrar error "Token expirado o inválido"
 *
 * 2. **Sin validación previa (Alternativa)**:
 *    - Usuario hace click y ve directamente formulario
 *    - Al submittear: POST /api/auth/reset-password valida
 *    - Si inválido: mostrar error después de envío
 *    - (Peor UX, mejor seguridad)
 *
 * **Ventajas del Flujo con Validación Previa**:
 * - ✓ UX: usuario sabe si token es válido antes de escribir contraseña
 * - ✓ Feedback inmediato
 * - ✓ No requiere POST para validar
 * - ✓ Frontend puede deshabilitar formulario si token inválido
 *
 * **Validaciones**:
 * - Token no vacío (requerido)
 * - Token existe en BD
 * - Token no expirado
 * - Token no ha sido usado ya
 *
 * **Seguridad**:
 * - ✓ Token solo validado (no retorna datos del usuario)
 * - ✓ Sin rate limiting específico (pero sería buena idea)
 * - ✓ Errores genéricos (no revela si token existe, expiró o fue usado)
 * - ✓ No requiere autenticación
 *
 * **Performance**:
 * - Búsqueda directa en tabla passwordResetToken
 * - Una sola query a BD
 * - Muy rápido (< 50ms típicamente)
 *
 * @route GET /api/auth/validate-reset-token
 * @see {@link ./reset-password/route.ts} para POST con validación completa
 * @see {@link ../../actions/auth.ts} para validatePasswordResetToken()
 *
 * @example
 * ```typescript
 * // En componente React después de click en email link
 * useEffect(() => {
 *   const validateToken = async () => {
 *     try {
 *       const response = await fetch(
 *         `/api/auth/validate-reset-token?token=${params.token}`
 *       )
 *       const { valid } = await response.json()
 *
 *       if (valid) {
 *         // Token es válido, mostrar formulario
 *         setShowForm(true)
 *       } else {
 *         // Token inválido, mostrar error
 *         setError('El link de reset ha expirado. Solicita uno nuevo.')
 *       }
 *     } catch (error) {
 *       setError('Error validando token. Intenta de nuevo.')
 *     }
 *   }
 *
 *   validateToken()
 * }, [params.token])
 * ```
 *
 * @example
 * ```bash
 * # Curl ejemplo
 * curl -X GET "http://localhost:3000/api/auth/validate-reset-token?token=abc123..."
 *
 * # Respuesta válido
 * { "valid": true }
 *
 * # Respuesta inválido/expirado/usado
 * { "valid": false }
 *
 * # Sin token
 * { "valid": false, "error": "Token no proporcionado." }
 * ```
 *
 * **Flujo Completo desde Email**:
 * ```
 * 1. Usuario solicita reset (forgot-password form)
 *    → POST /api/auth/forgot-password { email }
 *
 * 2. Email enviado con link:
 *    → https://app.com/reset-password?token=UUID
 *
 * 3. Usuario hace click en email
 *    → GET /api/auth/validate-reset-token?token=UUID
 *    → { valid: true/false }
 *
 * 4. Si válido, usuario ve formulario y escribe contraseña
 *    → POST /api/auth/reset-password { token, password }
 *    → Contraseña actualizada
 *
 * 5. Usuario redirigido a login
 *    → Debe hacer login con nueva contraseña
 * ```
 *
 * @remarks
 * **Consideraciones**:
 * - Token se pasa por URL (visible en historial del navegador)
 *   - Esto es aceptable porque: token expira en 30 min, es de un solo uso
 *   - Si alguien accede a historial, token ya estaría usado o expirado
 * - Usar HTTPS siempre (parámetro en URL sin cifrado)
 * - Email con link es enviado de forma insegura (necesita HTTPS)
 *
 * @internal
 * Implementación delegada a `validatePasswordResetToken()` en actions
 */

import { NextResponse } from 'next/server';
import { validatePasswordResetToken } from '@/actions/auth';
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Token no proporcionado.' }, { status: 400 });
    }

    const isValid = await validatePasswordResetToken(token);

    return NextResponse.json({ valid: isValid });
  } catch (error) {
    console.error('Error en la validación de token API:', error);
    return NextResponse.json({ valid: false, error: 'Error del servidor.' }, { status: 500 });
  }
}
