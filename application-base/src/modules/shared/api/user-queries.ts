/**
 * Módulo de Queries para Perfil de Usuario - Aurora Nova
 *
 * Proporciona funciones para gestionar perfiles de usuario incluyendo:
 * - Obtención de perfil completo
 * - Actualización segura de datos personales
 * - Cambio seguro de contraseña
 * - Verificación de credenciales
 *
 * **Características**:
 * - Sincronización automática de campo `name` completo
 * - Encriptación bcrypt para contraseñas (salt rounds: 10)
 * - Transacciones para cambio de contraseña + revocación de sesiones
 * - Validación de credenciales (OAuth vs password)
 * - Manejo de errores descriptivo
 *
 * **Flujos Principales**:
 *
 * **1. VER PERFIL**:
 * ```
 * getUserProfile(userId) → UserProfile
 * ```
 *
 * **2. ACTUALIZAR PERFIL**:
 * ```
 * updateUserProfile(userId, { firstName?, lastName?, image? })
 * → Sincroniza nombre completo automáticamente
 * ```
 *
 * **3. CAMBIAR CONTRASEÑA**:
 * ```
 * changeUserPassword(userId, currentPassword, newPassword)
 * → Verifica actual, hashea nueva, revoca sesiones
 * ```
 *
 * **Seguridad**:
 * - Las contraseñas se hashean antes de guardar (nunca texto plano)
 * - Cambio de contraseña revoca TODAS las sesiones (logout de todos los dispositivos)
 * - Validación de credenciales existentes antes de cambiar
 * - Soporte para cuentas OAuth (sin contraseña)
 *
 * **Ejemplo de Flujo Completo**:
 * ```typescript
 * // 1. Ver perfil del usuario
 * const profile = await getUserProfile(userId)
 * console.log(profile.name)  // "Juan Pérez"
 *
 * // 2. Actualizar datos personales
 * const updated = await updateUserProfile(userId, {
 *   firstName: 'Juan',
 *   lastName: 'García'
 * })
 * // nombre completo actualizado automáticamente
 *
 * // 3. Cambiar contraseña
 * const result = await changeUserPassword(
 *   userId,
 *   'currentPassword123',
 *   'newPassword456'
 * )
 * if (result.success && result.sessionsRevoked) {
 *   // Usuario desconectado en todos los dispositivos
 * }
 * ```
 *
 * @module shared/api/user-queries
 * @see {@link @/lib/prisma/connection.ts} para conexión Prisma
 * @see {@link UserProfile} para estructura de perfil
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
 * Obtiene el perfil completo del usuario
 *
 * Retorna toda la información pública del usuario incluyendo:
 * - Datos personales (nombres, email, avatar)
 * - Metadata de cuenta (creación, última actualización, verificación email)
 * - Información de credenciales (si tiene password registrada)
 *
 * **hasCredentials**:
 * - `true`: Usuario registrado con email/password (puede cambiar contraseña)
 * - `false`: Usuario solo con OAuth (sin password)
 *
 * **Ejemplo**:
 * ```typescript
 * const profile = await getUserProfile(userId)
 * console.log(profile)
 * // {
 * //   id: 'user-123',
 * //   email: 'juan@example.com',
 * //   firstName: 'Juan',
 * //   lastName: 'Pérez',
 * //   name: 'Juan Pérez',
 * //   image: 'https://...',
 * //   emailVerified: Date,
 * //   createdAt: Date,
 * //   updatedAt: Date,
 * //   hasCredentials: true
 * // }
 * ```
 *
 * **Throws**:
 * - Error si usuario no existe
 *
 * @async
 * @param {string} userId - ID del usuario
 * @returns {Promise<UserProfile>} Perfil completo del usuario
 *
 * @see {@link updateUserProfile} para actualizar datos
 * @see {@link userHasCredentials} para verificar si puede cambiar contraseña
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
 * Actualiza datos personales del perfil de usuario
 *
 * Permite actualizar firstName, lastName e image.
 * **Sincroniza automáticamente** el campo `name` (nombre completo)
 * para compatibilidad con Auth.js.
 *
 * **Comportamiento**:
 * - Si firstName o lastName cambian, `name` se recalcula automáticamente
 * - Si solo `image` cambia, `name` no se modifica
 * - Obtiene valores actuales si no se proporcionan (para cálculo de `name`)
 *
 * **Ejemplo**:
 * ```typescript
 * // Actualizar solo nombre
 * const updated = await updateUserProfile(userId, {
 *   firstName: 'Juan Carlos'
 * })
 * // name se actualizará automáticamente a "Juan Carlos Pérez"
 *
 * // Actualizar múltiples campos
 * const updated = await updateUserProfile(userId, {
 *   firstName: 'Juan',
 *   lastName: 'García',
 *   image: 'https://new-avatar.jpg'
 * })
 * // name → "Juan García", image actualizado
 * ```
 *
 * **Retorna**: Perfil actualizado completo (UserProfile)
 *
 * @async
 * @param {string} userId - ID del usuario
 * @param {UpdateProfileInput} data - { firstName?, lastName?, image? }
 * @returns {Promise<UserProfile>} Perfil actualizado
 *
 * @see {@link getUserProfile} para obtener perfil actual
 * @see {@link changeUserPassword} para cambiar contraseña
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
 * Verifica si el usuario tiene credenciales de password registradas
 *
 * Retorna true si el usuario se registró con email/password
 * Retorna false si el usuario solo tiene OAuth (sin password)
 *
 * **Caso de Uso**:
 * - Mostrar/ocultar opción "Cambiar Contraseña" en UI
 * - Validar que usuario puede cambiar contraseña
 * - Diferencia entre usuarios registrados y OAuth
 *
 * @async
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>} true si tiene password registrada
 *
 * @see {@link changeUserPassword} para cambiar contraseña
 * @see {@link getUserProfile} que también retorna hasCredentials
 */
export async function userHasCredentials(userId: string): Promise<boolean> {
  const credentials = await prisma.userCredentials.findUnique({
    where: { userId },
  });

  return !!credentials;
}

/**
 * Cambia la contraseña del usuario de forma segura
 *
 * Realiza cambio seguro de contraseña con:
 * 1. Verificación de contraseña actual (comparación bcrypt)
 * 2. Encriptación de nueva contraseña (bcrypt, salt rounds: 10)
 * 3. Transacción atómica: actualiza password + revoca TODAS las sesiones
 * 4. Cierre automático de sesiones en todos los dispositivos
 *
 * **Flujo**:
 * 1. Verifica que usuario tiene credentials (no es OAuth)
 * 2. Compara `currentPassword` contra hash almacenado
 * 3. Si incorrecto, retorna error (sin revelar detalles)
 * 4. Si correcto:
 *    - Genera nuevo hash con bcrypt
 *    - Actualiza contraseña en BD
 *    - Elimina TODAS las sesiones del usuario (logout omnibus)
 *    - Retorna success con `sessionsRevoked: true`
 *
 * **Seguridad**:
 * - Nunca almacena contraseña en texto plano
 * - Usa bcrypt con salt rounds = 10 (suficiente para 2024)
 * - Comparación segura contra hash (timing-safe)
 * - Cierre de sesiones previene acceso no autorizado
 * - No revela si contraseña es correcta (error genérico)
 *
 * **Ejemplo**:
 * ```typescript
 * const result = await changeUserPassword(
 *   userId,
 *   'currentPassword123',
 *   'newPassword456'
 * )
 *
 * if (result.success) {
 *   console.log('Contraseña cambiad')
 *   if (result.sessionsRevoked) {
 *     // Usuario desconectado en todos los dispositivos
 *     // Debe volver a hacer login
 *   }
 * } else {
 *   console.error(result.error)
 *   // Output posible: 'Esta cuenta utiliza autenticación externa...'
 * }
 * ```
 *
 * **Errores Posibles**:
 * - Sin credentials: "Esta cuenta utiliza autenticación externa..."
 * - Contraseña incorrecta: "La contraseña actual es incorrecta." (no específico intencionalmente)
 *
 * **Transacción**:
 * ```sql
 * -- Dentro de una transacción
 * UPDATE userCredentials SET hashedPassword = ?, updatedAt = NOW()
 * DELETE FROM session WHERE userId = ?
 * ```
 *
 * @async
 * @param {string} userId - ID del usuario
 * @param {string} currentPassword - Contraseña actual (texto plano, se compara contra hash)
 * @param {string} newPassword - Nueva contraseña (será hasheada antes de guardar)
 * @returns {Promise<{success: boolean; error?: string; sessionsRevoked?: boolean}>}
 *   - success: true/false
 *   - error: mensaje si success=false
 *   - sessionsRevoked: true si se cerraron sesiones
 *
 * @example
 * ```typescript
 * // Caso exitoso
 * const result = await changeUserPassword(userId, 'old', 'new')
 * // { success: true, sessionsRevoked: true }
 *
 * // Caso error - sin credenciales
 * const result = await changeUserPassword(oauthUserId, 'pwd', 'new')
 * // { success: false, error: 'Esta cuenta utiliza...' }
 *
 * // Caso error - contraseña incorrecta
 * const result = await changeUserPassword(userId, 'wrong', 'new')
 * // { success: false, error: 'La contraseña actual es incorrecta.' }
 * ```
 *
 * @see {@link getUserProfile} para verificar hasCredentials antes de llamar
 * @see {@link userHasCredentials} para verificar credenciales
 * @see {@link updateUserProfile} para actualizar otros datos
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
