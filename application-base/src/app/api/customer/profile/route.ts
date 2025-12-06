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
 * GET /api/customer/profile - Obtener perfil del usuario actual
 *
 * Obtiene la información completa del perfil del usuario autenticado.
 * Incluye nombre, email, imagen de perfil, y otros datos personales.
 * Útil para mostrar información del usuario en UI o para pre-llenar formularios.
 *
 * **Autenticación**: Requerida (usuario autenticado con JWT válido)
 *
 * **Parámetros**: Ninguno (datos del usuario se extraen de sesión)
 *
 * **Respuesta** (200):
 * ```json
 * {
 *   "id": "uuid",
 *   "firstName": "Juan",
 *   "lastName": "Pérez",
 *   "email": "juan.perez@example.com",
 *   "image": "https://example.com/avatar.jpg",
 *   "createdAt": "2024-01-01T00:00:00Z",
 *   "updatedAt": "2024-12-05T12:00:00Z"
 * }
 * ```
 *
 * **Errores**:
 * - 401: No autenticado (sin JWT o JWT inválido)
 * - 500: Error del servidor
 *
 * **Efectos Secundarios**:
 * - Sin efectos secundarios (lectura pura)
 * - No modifica datos
 * - No emite eventos de auditoría
 *
 * **Casos de Uso**:
 * - Mostrar información del usuario en header/navbar
 * - Pre-llenar formulario de edición de perfil
 * - Verificar datos de usuario en cliente
 * - Dashboard personal del usuario
 *
 * **Performance**:
 * - Rápida (una query a BD por usuario)
 * - Típicamente < 50ms
 * - Sin paginación o filtros
 *
 * @method GET
 * @route /api/customer/profile
 * @auth Requerida (JWT válido)
 *
 * @returns {Promise<NextResponse>} Datos del perfil (200) o error
 *
 * @example
 * ```typescript
 * // Obtener perfil del usuario actual
 * const response = await fetch('/api/customer/profile', {
 *   headers: {
 *     'Authorization': `Bearer ${token}`
 *   }
 * })
 *
 * if (response.ok) {
 *   const profile = await response.json()
 *   console.log(`Hola ${profile.firstName}!`)
 *   // Mostrar en UI, guardar en estado, etc.
 * } else if (response.status === 401) {
 *   console.log('Usuario no autenticado, redirigir a login')
 * }
 * ```
 *
 * @see {@link ./route.ts#PATCH} para actualizar perfil
 * @see {@link ../menu/route.ts} para obtener menú personalizado del usuario
 * @see {@link ../change-password/route.ts} para cambiar contraseña
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
 * PATCH /api/customer/profile - Actualizar perfil del usuario actual
 *
 * Actualiza información personal del usuario autenticado.
 * Permite cambios parciales: solo envía los campos que necesitas actualizar.
 * Solo permite actualizar datos personales, no email ni permisos.
 *
 * **Autenticación**: Requerida (usuario autenticado con JWT válido)
 *
 * **Body Esperado** (todos los campos opcionales):
 * ```json
 * {
 *   "firstName": "string (opcional, nombre del usuario)",
 *   "lastName": "string (opcional, apellido del usuario)",
 *   "image": "string (opcional, URL de imagen de perfil)"
 * }
 * ```
 *
 * **Respuesta** (200):
 * ```json
 * {
 *   "id": "uuid",
 *   "firstName": "Juan",
 *   "lastName": "García",
 *   "email": "juan.perez@example.com",
 *   "image": "https://example.com/avatar.jpg",
 *   "updatedAt": "2024-12-05T12:00:00Z"
 * }
 * ```
 *
 * **Errores**:
 * - 400: Datos inválidos (validación Zod fallida)
 * - 401: No autenticado
 * - 500: Error del servidor
 *
 * **Validaciones** (Zod schema):
 * - firstName: opcional, string
 * - lastName: opcional, string
 * - image: opcional, string (URL válida)
 * - No se pueden modificar: email, contraseña, permisos, roles
 *
 * **Efectos Secundarios**:
 * - Actualiza registro en tabla `User`
 * - Cambios visibles inmediatamente (no requiere logout)
 * - sesión se actualiza automáticamente
 *
 * **Seguridad**:
 * - Solo usuario autenticado puede actualizar su propio perfil
 * - Validación estricta con Zod para evitar inyecciones
 * - No permite cambios de email ni permisos
 * - No requiere confirmación de contraseña (cambios personales)
 *
 * **Casos de Uso**:
 * - Actualizar nombre y apellido
 * - Cambiar foto de perfil
 * - Completar información personal
 * - Editar datos en formulario de cuenta
 *
 * @method PATCH
 * @route /api/customer/profile
 * @auth Requerida (JWT válido)
 *
 * @param {Request} request - Request con body JSON (actualización parcial)
 * @returns {Promise<NextResponse>} Usuario actualizado (200) o error
 *
 * @example
 * ```typescript
 * // Actualizar foto de perfil
 * const response = await fetch('/api/customer/profile', {
 *   method: 'PATCH',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': `Bearer ${token}`
 *   },
 *   body: JSON.stringify({
 *     image: 'https://example.com/new-avatar.jpg'
 *   })
 * })
 *
 * if (response.ok) {
 *   const updated = await response.json()
 *   console.log(`Perfil actualizado: ${updated.firstName}`)
 * } else if (response.status === 400) {
 *   const error = await response.json()
 *   console.error('Datos inválidos:', error.details)
 * }
 * ```
 *
 * @see {@link ./route.ts#GET} para obtener perfil
 * @see {@link ../change-password/route.ts} para cambiar contraseña
 * @see {@link ../menu/route.ts} para obtener menú personalizado
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
