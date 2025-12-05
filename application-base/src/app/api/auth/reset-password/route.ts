/**
 * API Route POST /api/auth/reset-password
 *
 * Aurora Nova - Endpoint para Reinicio de Contraseña
 *
 * Procesa solicitudes POST para resetear la contraseña de un usuario utilizando
 * un token de reset enviado por email. Implementa validación segura, hash de
 * contraseña, y invalidación de sesiones existentes.
 *
 * **Endpoint Details**:
 * - **Method**: POST
 * - **Route**: `/api/auth/reset-password`
 * - **Auth**: Public (no requiere autenticación)
 * - **Content-Type**: application/json
 *
 * **Parámetros de Request** (body JSON):
 * ```typescript
 * {
 *   token: string;      // Token de reset enviado por email
 *   password: string;   // Nueva contraseña (min 8 caracteres)
 * }
 * ```
 *
 * **Respuestas**:
 * - 200: { message: "Contraseña actualizada exitosamente." }
 * - 400: { error: "Datos inválidos." | "Token inválido o ya ha sido usado." | "El token ha expirado." }
 * - 404: { error: "Usuario no encontrado." }
 * - 500: { error: "Ocurrió un error en el servidor." }
 *
 * **Flujo de Proceso**:
 * ```
 * 1. Recibir JSON con token y password
 * 2. Validar con Zod schema (token requerido, password min 8)
 * 3. Hashear token con SHA-256 para búsqueda en BD
 * 4. Buscar registro en tabla passwordResetToken
 * 5. Validar token existe y no ha expirado
 * 6. Obtener usuario del token
 * 7. Hashear nueva contraseña con bcryptjs (12 rounds)
 * 8. Ejecutar transacción ATOMIC:
 *    a. Actualizar contraseña del usuario
 *    b. Eliminar token de reset (prevenir reutilización)
 *    c. Eliminar todas las sesiones activas (force re-login en todos dispositivos)
 * 9. Retornar éxito
 * ```
 *
 * **Seguridad**:
 * - Tokens guardados como hash SHA-256 en BD (no texto plano)
 * - Contraseña nueva hasheada con bcryptjs (12 rounds)
 * - Tokens con expiración de 30 minutos
 * - Token se elimina después de usar (reutilización imposible)
 * - Todas las sesiones invalidadas (fuerza re-login)
 * - Transacción atómica garantiza consistencia
 * - Errores no exponen detalles internos
 *
 * **Validaciones**:
 * - Token: No vacío, requerido
 * - Password: Mínimo 8 caracteres
 * - Token debe existir en BD
 * - Token no debe estar expirado
 * - Usuario debe existir
 * - Usuario debe tener credentials
 *
 * **Performance**:
 * - Búsqueda por token hasheado (indexed)
 * - Transacción optimizada (3 queries)
 * - Hash SHA-256 rápido
 * - Bcryptjs con 12 rounds (~200ms por hash)
 *
 * **Integraciones**:
 * - Prisma ORM para acceso a BD
 * - Zod para validación de tipos
 * - Crypto API para hash seguro
 * - Bcryptjs para hash de contraseña
 *
 * @route POST /api/auth/reset-password
 * @see {@link ../../actions/auth.ts} para requestPasswordReset y validatePasswordResetToken
 * @see {@link ../../../../lib/prisma/connection.ts} para acceso a BD
 * @see {@link ../../../../lib/logger/helpers.ts} para contexto de logging
 *
 * @example
 * ```bash
 * # Curl ejemplo
 * curl -X POST http://localhost:3000/api/auth/reset-password \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "token": "abc123...xyz",
 *     "password": "NewPassword123!"
 *   }'
 *
 * # Respuesta exitosa
 * { "message": "Contraseña actualizada exitosamente." }
 *
 * # Respuesta con error
 * { "error": "El token ha expirado." }
 * ```
 *
 * **Flujo Completo desde UI**:
 * 1. Usuario recibe email con link reset (contiene token)
 * 2. Usuario hace click en link → va a página reset-password
 * 3. Usuario ingresa nueva contraseña
 * 4. Form submits POST /api/auth/reset-password con token
 * 5. API valida y actualiza contraseña
 * 6. API invalida todas las sesiones
 * 7. Usuario vuelve a login con nueva contraseña
 *
 * @remarks
 * **Token Expiration**:
 * - Tokens expiran después de 30 minutos
 * - Tokens expirados se limpian al intentar usar
 * - Podría haber cron job para limpiar periódicamente
 *
 * **Session Invalidation**:
 * - Todas las sesiones se eliminan (T06)
 * - Usuario debe re-login en todos dispositivos
 * - Mejora seguridad si contraseña fue comprometida
 *
 * **Password Requirements**:
 * - Mínimo 8 caracteres (validado por schema)
 * - Recomendado: mayúsculas, minúsculas, números, símbolos
 * - Se valida en el form frontend (UX) y backend (seguridad)
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from "@/lib/prisma/connection"
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ResetPasswordSchema = z.object({
  token: z.string().min(1, { message: 'El token es requerido.' }),
  password: z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres.' }),
});

/**
 * Handler POST para /api/auth/reset-password
 *
 * Procesa solicitud POST para reiniciar contraseña de usuario.
 * Implementa todas las validaciones de seguridad y transacción atómica.
 *
 * @async
 * @param request - Objeto NextRequest con body JSON
 *
 * @returns {Promise<NextResponse>} Respuesta JSON:
 *   - 200: Éxito con mensaje
 *   - 400: Validación falla
 *   - 404: Usuario no encontrado
 *   - 500: Error servidor
 *
 * @throws No lanza excepciones directamente (todas manejadas)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = ResetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
    }

    const { token, password } = validation.data;

    // Usar la API web estándar para hashear
    const hashed = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const hashedToken = Buffer.from(hashed).toString('hex');

    const passwordResetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
    });

    if (!passwordResetToken) {
      return NextResponse.json({ error: 'Token inválido o ya ha sido usado.' }, { status: 400 });
    }

    if (new Date() > passwordResetToken.expiresAt) {
      // Opcional: Limpiar tokens expirados aquí o con un cron job
      await prisma.passwordResetToken.delete({ where: { id: passwordResetToken.id } });
      return NextResponse.json({ error: 'El token ha expirado.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: passwordResetToken.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Usar una transacción para asegurar la atomicidad de las operaciones
    await prisma.$transaction([
      // 1. Actualizar la contraseña del usuario
      prisma.userCredentials.update({
        where: { userId: user.id },
        data: { hashedPassword },
      }),
      // 2. Eliminar el token de reinicio para que no se pueda reutilizar
      prisma.passwordResetToken.delete({
        where: { id: passwordResetToken.id },
      }),
      // 3. (Tarea T06) Invalidar todas las sesiones activas del usuario
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    return NextResponse.json({ message: 'Contraseña actualizada exitosamente.' });

  } catch (error) {
    console.error('Error al reiniciar la contraseña:', error);
    return NextResponse.json({ error: 'Ocurrió un error en el servidor.' }, { status: 500 });
  }
}
