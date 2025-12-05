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
 * Cambia la contraseña del usuario autenticado.
 *
 * Valida que la contraseña actual es correcta, verifica que la nueva contraseña
 * cumple con los requisitos de seguridad, y actualiza la contraseña en la base de datos.
 * Emite un evento de auditoría y puede revocar otras sesiones para mayor seguridad.
 *
 * **Endpoint Details**:
 * - Method: POST
 * - Route: /api/customer/change-password
 * - Auth: Requiere usuario autenticado (JWT válido)
 * - Content-Type: application/json
 *
 * **Parámetros** (en el body):
 * - `currentPassword` (string, requerido): Contraseña actual del usuario para validación
 * - `newPassword` (string, requerido): Nueva contraseña (debe pasar validación Zod)
 * - `confirmPassword` (string, requerido): Confirmación de nueva contraseña (debe coincidir)
 *
 * **Respuestas**:
 * - 200: Contraseña actualizada exitosamente
 *   - `success: true`
 *   - `message: "Contraseña actualizada exitosamente"`
 *   - `sessionsRevoked: number` (número de sesiones revocadas si aplica)
 * - 400: Datos inválidos o contraseña actual incorrecta
 *   - `error: string` (mensaje de error específico)
 *   - `details: ZodIssue[]` (si es validación Zod)
 * - 401: Usuario no autenticado
 * - 500: Error interno del servidor
 *
 * **Flujo**:
 * 1. Valida que el usuario está autenticado via `auth()`
 * 2. Extrae el `userId` de la sesión
 * 3. Obtiene el body JSON de la solicitud
 * 4. Valida los datos con `changePasswordSchema`
 * 5. Llama a `changeUserPassword` que:
 *    - Verifica que la contraseña actual es correcta (comparación bcryptjs)
 *    - Hashea la nueva contraseña
 *    - Actualiza la contraseña en la base de datos
 *    - Opcionalmente revoca otras sesiones
 * 6. Emite evento `PASSWORD_CHANGED` para auditoría
 * 7. Retorna el resultado con número de sesiones revocadas
 *
 * **Seguridad**:
 * - La contraseña actual debe ser validada antes de permitir el cambio
 * - Nueva contraseña debe cumplir requisitos (length, complejidad, etc)
 * - Validación estricta con Zod
 * - Logging de cambios de contraseña para auditoría
 * - Evento emitido para sistemas de monitoreo
 * - Las sesiones pueden ser revocadas forzando re-login después de cambio
 *
 * **Eventos Emitidos**:
 * - `SystemEvent.PASSWORD_CHANGED`: Evento de auditoría para cambio de contraseña
 *   - Contiene: userId, email, changedBy ('self')
 *   - Area: CUSTOMER
 *
 * @async
 * @param {Request} request - La solicitud HTTP con el body JSON
 * @returns {Promise<NextResponse>} Objeto con { success: true, message: string, sessionsRevoked: number }
 * @returns {Promise<NextResponse>} En caso de error, retorna { error: string } o { error: string, details: ZodIssue[] }
 *
 * @example
 * ```typescript
 * // Change user password
 * const response = await fetch('/api/customer/change-password', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     currentPassword: 'OldPass123!',
 *     newPassword: 'NewPass456!',
 *     confirmPassword: 'NewPass456!'
 *   }),
 * });
 *
 * if (response.ok) {
 *   const result = await response.json();
 *   console.log('Password changed:', result);
 *   // Si sessionsRevoked > 0, el usuario debe hacer login nuevamente
 * } else {
 *   const error = await response.json();
 *   console.error('Error:', error.error);
 * }
 * ```
 *
 * @see {@link changePasswordSchema} para validación de datos
 * @see {@link changeUserPassword} para operación de cambio de contraseña
 * @see {@link SystemEvent.PASSWORD_CHANGED} para eventos de auditoría
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
