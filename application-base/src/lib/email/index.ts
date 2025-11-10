// /application-base/src/lib/email/index.ts
import { render } from '@react-email/render';
import { PasswordResetEmail } from './templates/password-reset';
import { activeEmailService, EmailServiceOptions } from './email-service';

/**
 * Envía un correo electrónico utilizando el servicio activo (Gmail o Consola).
 * @param {EmailServiceOptions} options - Opciones del correo (to, subject, html).
 */
export async function sendEmail(options: EmailServiceOptions) {
  return activeEmailService.send(options);
}

/**
 * Prepara y envía el correo de reinicio de contraseña.
 * @param {string} to - Email del destinatario.
 * @param {string} token - Token de reinicio de contraseña.
 */
export async function sendPasswordResetEmail(to: string, token: string) {
  const subject = 'Restablece tu contraseña en Aurora Nova';
  const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

  // Renderiza el componente de React a un string HTML
  const html = render(PasswordResetEmail({ resetLink }));

  // Llama a la función genérica de envío de email
  await sendEmail({ to, subject, html });
}
