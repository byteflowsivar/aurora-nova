/**
 * User Profile Queries
 * Funciones para gestionar el perfil de usuario
 */

import { prisma } from '@/lib/prisma/connection';
import bcrypt from 'bcrypt';

// Tipos para el perfil de usuario
export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  image: string | null;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
  hasCredentials: boolean;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  image?: string | null;
}

/**
 * Obtiene el perfil completo del usuario actual
 * Incluye verificación si tiene credentials (no OAuth)
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      credentials: {
        select: {
          userId: true, // Solo necesitamos saber si existe
        },
      },
    },
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name,
    image: user.image,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    hasCredentials: !!user.credentials,
  };
}

/**
 * Actualiza información personal del usuario
 * También sincroniza el campo 'name' para Auth.js
 */
export async function updateUserProfile(
  userId: string,
  data: UpdateProfileInput
): Promise<UserProfile> {
  // Construir el nombre completo para Auth.js
  let name: string | undefined | null = undefined;
  if (data.firstName !== undefined || data.lastName !== undefined) {
    // Obtener valores actuales si no se proporcionan
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const firstName = data.firstName ?? currentUser?.firstName ?? '';
    const lastName = data.lastName ?? currentUser?.lastName ?? '';
    name = `${firstName} ${lastName}`.trim() || null;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...data,
      name, // Sincronizar nombre completo
    },
    include: {
      credentials: {
        select: {
          userId: true,
        },
      },
    },
  });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    firstName: updatedUser.firstName,
    lastName: updatedUser.lastName,
    name: updatedUser.name,
    image: updatedUser.image,
    emailVerified: updatedUser.emailVerified,
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt,
    hasCredentials: !!updatedUser.credentials,
  };
}

/**
 * Verifica si el usuario tiene credentials (puede cambiar contraseña)
 */
export async function userHasCredentials(userId: string): Promise<boolean> {
  const credentials = await prisma.userCredentials.findUnique({
    where: { userId },
  });

  return !!credentials;
}

/**
 * Cambia la contraseña del usuario
 * Verifica la contraseña actual antes de cambiarla
 * Cierra TODAS las sesiones activas del usuario en todos los dispositivos
 */
export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string; sessionsRevoked?: boolean }> {
  // 1. Verificar que el usuario tiene credentials
  const credentials = await prisma.userCredentials.findUnique({
    where: { userId },
  });

  if (!credentials) {
    return {
      success: false,
      error: 'Esta cuenta utiliza autenticación externa. No es posible cambiar la contraseña.',
    };
  }

  // 2. Verificar contraseña actual
  const isValidPassword = await bcrypt.compare(
    currentPassword,
    credentials.hashedPassword
  );

  if (!isValidPassword) {
    return {
      success: false,
      error: 'La contraseña actual es incorrecta.',
    };
  }

  // 3. Hashear nueva contraseña
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 4. Usar transacción para actualizar contraseña y cerrar sesiones
  await prisma.$transaction(async (tx) => {
    // Actualizar contraseña
    await tx.userCredentials.update({
      where: { userId },
      data: {
        hashedPassword,
        updatedAt: new Date(),
      },
    });

    // Cerrar TODAS las sesiones del usuario (todos los dispositivos)
    await tx.session.deleteMany({
      where: { userId },
    });
  });

  return { success: true, sessionsRevoked: true };
}
