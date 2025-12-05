/**
 * API Route: User Profile Management
 *
 * Endpoints para la gestión del perfil del usuario autenticado.
 * Permite obtener y actualizar la información personal del usuario.
 *
 * **Endpoints**:
 * - GET /api/customer/profile - Obtener perfil del usuario actual
 * - PATCH /api/customer/profile - Actualizar perfil del usuario actual
 *
 * @module api/customer/profile
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserProfile, updateUserProfile } from '@/modules/shared/api';
import { updateProfileSchema } from '@/modules/shared/validations';
import { z } from 'zod';

/**
 * Obtiene el perfil completo del usuario autenticado.
 *
 * Retorna toda la información personal del usuario actual incluyendo nombre,
 * email, imagen de perfil y otros datos asociados.
 *
 * **Endpoint Details**:
 * - Method: GET
 * - Route: /api/customer/profile
 * - Auth: Requiere usuario autenticado (JWT valido)
 * - Content-Type: application/json
 *
 * **Respuestas**:
 * - 200: Perfil del usuario obtenido exitosamente
 * - 401: Usuario no autenticado
 * - 500: Error interno del servidor
 *
 * **Flujo**:
 * 1. Valida que el usuario está autenticado via `auth()`
 * 2. Extrae el `userId` de la sesión
 * 3. Obtiene el perfil completo desde la base de datos
 * 4. Retorna los datos del perfil en formato JSON
 *
 * @async
 * @returns {Promise<NextResponse>} Objeto con los datos del perfil del usuario
 * @returns {Promise<NextResponse>} En caso de error, retorna { error: string } con status 401 o 500
 *
 * @example
 * ```typescript
 * // Fetch user profile
 * const response = await fetch('/api/customer/profile');
 * const profile = await response.json();
 * console.log('User profile:', profile);
 * ```
 *
 * @see {@link updateUserProfile} para actualizar el perfil
 * @see {@link getUserProfile} para obtener los detalles del usuario desde la BD
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
 * Actualiza la información personal del usuario autenticado.
 *
 * Permite que el usuario actualice su nombre, apellido, imagen de perfil y otros
 * datos personales. Valida los datos con `updateProfileSchema` antes de guardar.
 *
 * **Endpoint Details**:
 * - Method: PATCH
 * - Route: /api/customer/profile
 * - Auth: Requiere usuario autenticado (JWT valido)
 * - Content-Type: application/json
 *
 * **Parámetros** (en el body):
 * - `firstName` (string, opcional): Nombre del usuario
 * - `lastName` (string, opcional): Apellido del usuario
 * - `image` (string, opcional): URL de la imagen de perfil
 * - Otros campos según `updateProfileSchema`
 *
 * **Respuestas**:
 * - 200: Perfil actualizado exitosamente (retorna usuario actualizado)
 * - 400: Datos inválidos (validación Zod fallida)
 * - 401: Usuario no autenticado
 * - 500: Error interno del servidor
 *
 * **Flujo**:
 * 1. Valida que el usuario está autenticado via `auth()`
 * 2. Extrae el `userId` de la sesión
 * 3. Obtiene el body JSON de la solicitud
 * 4. Valida los datos con `updateProfileSchema`
 * 5. Actualiza el perfil en la base de datos
 * 6. Retorna el usuario actualizado
 *
 * **Seguridad**:
 * - Solo el usuario autenticado puede actualizar su propio perfil (verificado por userId de sesión)
 * - Validación estricta con Zod para evitar inyecciones
 * - No permite cambios de email ni permisos (solo datos personales)
 *
 * @async
 * @param {Request} request - La solicitud HTTP con el body JSON
 * @returns {Promise<NextResponse>} Usuario actualizado con todos sus datos
 * @returns {Promise<NextResponse>} En caso de error, retorna { error: string, details: ZodIssue[] }
 *
 * @example
 * ```typescript
 * // Update user profile
 * const response = await fetch('/api/customer/profile', {
 *   method: 'PATCH',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     firstName: 'Juan',
 *     lastName: 'García',
 *     image: 'https://example.com/avatar.jpg'
 *   }),
 * });
 * const updatedProfile = await response.json();
 * console.log('Profile updated:', updatedProfile);
 * ```
 *
 * @see {@link updateProfileSchema} para validación de datos
 * @see {@link updateUserProfile} para operación de actualización
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
