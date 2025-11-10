// /application-base/src/app/api/auth/validate-reset-token/route.ts
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
