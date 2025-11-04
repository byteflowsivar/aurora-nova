/**
 * Change Password API Route
 * POST: Cambiar contraseña del usuario actual
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { changeUserPassword } from '@/lib/prisma/user-queries';
import { changePasswordSchema } from '@/lib/validations/profile-schema';
import { z } from 'zod';

/**
 * POST /api/user/change-password
 * Cambia la contraseña del usuario autenticado
 * Requiere: currentPassword, newPassword, confirmPassword
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
