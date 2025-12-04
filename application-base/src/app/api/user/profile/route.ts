/**
 * User Profile API Routes
 * GET: Obtener perfil del usuario actual
 * PATCH: Actualizar perfil del usuario actual
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserProfile, updateUserProfile } from '@/modules/shared/api';
import { updateProfileSchema } from '@/modules/shared/validations';
import { z } from 'zod';

/**
 * GET /api/user/profile
 * Obtiene el perfil completo del usuario autenticado
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const profile = await getUserProfile(session.user.id);

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * Actualiza la información personal del usuario autenticado
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const json = await request.json();
    const data = updateProfileSchema.parse(json);

    const updatedUser = await updateUserProfile(session.user.id, data);

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
