// /application-base/src/app/api/auth/request-password-reset/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';
import { rateLimiter } from '@/lib/rate-limiter';

const limiter = rateLimiter({
  interval: 15 * 60 * 1000, // 15 minutos
  uniqueTokenPerInterval: 500, // Máximo 500 IPs únicas en 15 minutos
});

const RequestResetSchema = z.object({
  email: z.string().email({ message: 'Por favor, introduce un email válido.' }),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.ip ?? '127.0.0.1';
    await limiter.check(3, ip); // Permitir 3 solicitudes por IP cada 15 minutos

    const body = await request.json();
    const validation = RequestResetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }

    const { email } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Anti-Enumeration: Siempre devolvemos una respuesta exitosa,
    // incluso si el usuario no existe.
    if (user) {
      // Generar un token seguro
      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Establecer una fecha de expiración (ej. 30 minutos)
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      // Guardar el token hasheado en la base de datos
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt,
        },
      });

      // Enviar el email con el token original (no el hasheado)
      await sendPasswordResetEmail(email, token);
    }

    return NextResponse.json({
      message: 'Si tu cuenta existe, recibirás un correo con instrucciones para restablecer tu contraseña.',
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde.' }, { status: 429 });
    }
    console.error('Error en la solicitud de reinicio de contraseña:', error);
    // Respuesta genérica para no filtrar información
    return NextResponse.json({ error: 'Ocurrió un error en el servidor.' }, { status: 500 });
  }
}
