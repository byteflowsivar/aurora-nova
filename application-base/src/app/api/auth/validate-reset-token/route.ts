// /application-base/src/app/api/auth/validate-reset-token/route.ts
import { NextResponse } from 'next/server';
import { validatePasswordResetToken } from '@/actions/auth';

/**
 * @api {get} /api/auth/validate-reset-token
 * @name Validar Token de Reseteo
 * @description Valida un token de reseteo de contraseña.
 * @version 1.0.0
 *
 * @param {Request} request - La petición HTTP de entrada.
 * @query {string} token - El token de reseteo a validar.
 *
 * @response {200} Success - Retorna un booleano indicando si el token es válido.
 * @response {400} BadRequest - No se proporcionó un token.
 * @response {500} InternalServerError - Error inesperado en el servidor.
 *
 * @returns {Promise<NextResponse>} Una promesa que resuelve a la respuesta HTTP.
 *
 * @property {boolean} response.body.valid - `true` si el token es válido, `false` si no.
 *
 * @example
 * // Validate a token from the client before showing the reset form
 * async function checkToken(token) {
 *   const response = await fetch(`/api/auth/validate-reset-token?token=${token}`);
 *   const { valid } = await response.json();
 *   if (valid) {
 *     // Show the password reset form
 *   } else {
 *     // Show an "invalid or expired token" error
 *   }
 * }
 */
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
