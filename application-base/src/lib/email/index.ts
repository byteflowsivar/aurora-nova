// /application-base/src/lib/email/index.ts
import { render } from '@react-email/render';
import { PasswordResetEmail } from './templates/password-reset';

// NOTA: Esta es una implementación de desarrollo.
// Para producción, deberías reemplazar esto con un proveedor real como Resend, SendGrid, etc.
// La abstracción permite cambiar de proveedor fácilmente.

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envía un correo electrónico. En desarrollo, simplemente lo imprime en la consola.
 * @param {EmailOptions} options - Opciones del correo.
 */
export async function sendEmail({ to, subject, html }: EmailOptions) {
  console.log('--- SENDING EMAIL ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('Body (HTML):');
  console.log(html);
  console.log('--- EMAIL SENT (to console) ---');

  // Ejemplo de cómo se integraría un proveedor real (ej. Resend)
  /*
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Aurora Nova <no-reply@yourdomain.com>',
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Could not send email.');
  }
  */

  return Promise.resolve();
}

/**
 * Envía el correo de reinicio de contraseña.
 * @param {string} to - Email del destinatario.
 * @param {string} token - Token de reinicio de contraseña.
 */
export async function sendPasswordResetEmail(to: string, token: string) {
  const subject = 'Restablece tu contraseña en Aurora Nova';
  const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

  const html = render(PasswordResetEmail({ resetLink }));

  await sendEmail({ to, subject, html });
}
