/**
 * API Route: Change User Password
 *
 * Endpoint para cambiar la contraseña del usuario autenticado.
 * Valida la contraseña actual y requiere que la nueva contraseña cumpla
 * con los requisitos de seguridad.
 *
 * **Endpoints**:
 * - POST /api/customer/change-password - Cambiar contraseña del usuario actual
 *
 * @module api/customer/change-password
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { changeUserPassword } from '@/modules/shared/api';
import { changePasswordSchema } from '@/modules/shared/validations';
import { z } from 'zod';
import { eventBus, SystemEvent } from "@/lib/events"
import { EventArea } from "@/lib/events/event-area"

/**
 * POST /api/customer/change-password - Cambiar contraseña del usuario
 *
 * Cambia la contraseña del usuario autenticado con validación de seguridad.
 * Requiere contraseña actual válida. Nueva contraseña debe cumplir requisitos.
 * Emite evento de auditoría. Puede revocar otras sesiones para mayor seguridad.
 *
 * **Autenticación**: Requerida (usuario autenticado con JWT válido)
 *
 * **Body Esperado**:
 * ```json
 * {
 *   "currentPassword": "string (requerido, contraseña actual)",
 *   "newPassword": "string (requerido, nueva contraseña)",
 *   "confirmPassword": "string (requerido, debe coincidir con newPassword)"
 * }
 * ```
 *
 * **Respuesta** (200):
 * ```json
 * {
 *   "success": true,
 *   "message": "Contraseña actualizada exitosamente",
 *   "sessionsRevoked": 2
 * }
 * ```
 *
 * **Errores**:
 * - 400: Contraseña actual incorrecta o datos inválidos
 *   - `error: "Contraseña actual incorrecta"` (si currentPassword es inválida)
 *   - `error: "Datos inválidos", details: ZodIssue[]` (si falla validación Zod)
 * - 401: No autenticado
 * - 500: Error del servidor
 *
 * **Validaciones** (Zod schema):
 * - currentPassword: requerido, string
 * - newPassword: requerido, string (requisitos de complejidad según schema)
 * - confirmPassword: requerido, debe coincidir exactamente con newPassword
 * - La contraseña actual se valida contra hash bcryptjs en BD
 *
 * **Requisitos de Nueva Contraseña**:
 * - Mínimo 8 caracteres (típicamente según schema)
 * - Puede requerir mayúsculas, minúsculas, números, caracteres especiales
 * - No puede ser igual a contraseña anterior
 * - Validación estricta según `changePasswordSchema`
 *
 * **Efectos Secundarios**:
 * - Actualiza hash de contraseña en tabla `User`
 * - Emite evento `PASSWORD_CHANGED` para auditoría
 * - Puede revocar sesiones activas (sessionsRevoked indica cantidad)
 * - Si se revocan sesiones, usuario debe hacer login nuevamente
 * - Cambio inmediato, sin confirmación por email
 *
 * **Seguridad**:
 * - Requiere contraseña actual válida (previene cambios no autorizados)
 * - Validación estricta con Zod
 * - Nueva contraseña se hashea con bcryptjs
 * - Evento registrado para auditoría y monitoreo
 * - Logs estructurados de cambios
 * - Sesiones pueden ser revocadas para forzar re-login
 *
 * **Casos de Uso**:
 * - Usuario quiere cambiar contraseña desde configuración de cuenta
 * - Cambio de contraseña periódico por política de seguridad
 * - Usuario recupera cuenta y cambia contraseña
 * - Cambio forzado después de incidente de seguridad
 *
 * **Flujo de Ejecución**:
 * 1. Verifica autenticación del usuario
 * 2. Valida datos con `changePasswordSchema`
 * 3. Verifica que contraseña actual es correcta (comparación bcryptjs)
 * 4. Hashea nueva contraseña
 * 5. Actualiza en BD
 * 6. Emite evento `PASSWORD_CHANGED` para auditoría
 * 7. Retorna éxito con número de sesiones revocadas
 *
 * @method POST
 * @route /api/customer/change-password
 * @auth Requerida (JWT válido)
 *
 * @param {Request} request - Request con body JSON
 * @returns {Promise<NextResponse>} Éxito (200) o error con detalles
 *
 * @example
 * ```typescript
 * // Cambiar contraseña del usuario
 * const response = await fetch('/api/customer/change-password', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': `Bearer ${token}`
 *   },
 *   body: JSON.stringify({
 *     currentPassword: 'ContraseñaActual123!',
 *     newPassword: 'NuevaContraseña456!',
 *     confirmPassword: 'NuevaContraseña456!'
 *   })
 * })
 *
 * if (response.ok) {
 *   const result = await response.json()
 *   console.log('Contraseña cambiad:', result.message)
 *   if (result.sessionsRevoked > 0) {
 *     console.log('Sesiones revocadas, haz login nuevamente')
 *   }
 * } else if (response.status === 400) {
 *   const error = await response.json()
 *   console.error('Error:', error.error)
 * }
 * ```
 *
 * @see {@link ./route.ts#GET} para obtener perfil
 * @see {@link ../profile/route.ts} para actualizar datos personales
 * @see {@link /api/auth/reset-password/route.ts} para recuperación de contraseña
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const json = await request.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(json);

    const result = await changeUserPassword(
      session.user.id,
      currentPassword,
      newPassword
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Dispatch password changed event
    await eventBus.dispatch(
      SystemEvent.PASSWORD_CHANGED,
      {
        userId: session?.user.id || '',
        email: session.user.email || '',
        changedBy: 'self'
      },
      {
        userId: session?.user.id,
        area: EventArea.CUSTOMER,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
      sessionsRevoked: result.sessionsRevoked,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
