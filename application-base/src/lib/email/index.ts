// /application-base/src/lib/email/index.ts
import { activeEmailService, EmailServiceOptions } from './email-service';

/**
 * Envía un correo electrónico utilizando el servicio activo (Gmail o Consola).
 * Esta función es agnóstica a React y solo se encarga de enviar el HTML.
 * @param {EmailServiceOptions} options - Opciones del correo (to, subject, html).
 */
export async function sendEmail(options: EmailServiceOptions) {
  return activeEmailService.send(options);
}