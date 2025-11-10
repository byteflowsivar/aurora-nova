// /application-base/src/app/api/auth/reset-password/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ResetPasswordSchema = z.object({
  token: z.string().min(1, { message: 'El token es requerido.' }),
  password: z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres.' }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = ResetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
    }

    const { token, password } = validation.data;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

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
    const transaction = await prisma.$transaction([
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
