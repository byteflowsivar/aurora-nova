/**
 * Módulo de Servicio de Email - Aurora Nova
 *
 * Proporciona una capa de abstracción para envío de emails con múltiples proveedores.
 * Implementa patrón Strategy: soporta Gmail, SMTP genérico y modo consola (desarrollo).
 *
 * **Arquitectura**:
 * - **IEmailService**: Interfaz común (contrato)
 * - **ConsoleEmailService**: Desarrollo (logs a consola, no envía)
 * - **GmailService**: Gmail SMTP (producción con App Password)
 * - **SmtpService**: SMTP genérico (SendGrid, Mailgun, etc)
 * - **Factory**: Selecciona proveedor según env vars
 *
 * **Prioridad de Proveedores**:
 * 1. SMTP Genérico (SMTP_HOST + SMTP_USER + SMTP_PASS)
 * 2. Gmail (GMAIL_USER + GMAIL_APP_PASSWORD)
 * 3. Consola (fallback para desarrollo)
 *
 * **Variables de Entorno**:
 * ```
 * # Gmail
 * GMAIL_USER=tu-email@gmail.com
 * GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx (16 caracteres)
 *
 * # SMTP Genérico
 * SMTP_HOST=smtp.example.com
 * SMTP_PORT=465 (default) o 587
 * SMTP_USER=usuario@example.com
 * SMTP_PASS=password
 * FROM_EMAIL=noreply@ejemplo.com (opcional)
 * ```
 *
 * **Casos de Uso**:
 * - Confirmación de email: POST /api/auth/signup
 * - Reset de contraseña: POST /api/auth/forgot-password
 * - Notificaciones: evento importante
 * - Alertas de auditoría: cambio sensible detectado
 *
 * **Ejemplo de Flujo**:
 * ```typescript
 * // 1. Usuario se registra
 * POST /api/auth/signup → { email, password }
 *
 * // 2. Sistema crea usuario y genera token
 * const token = generateVerificationToken(user.email)
 *
 * // 3. Envía email de confirmación
 * await activeEmailService.send({
 *   to: user.email,
 *   subject: 'Confirma tu email',
 *   html: '<a href="...verify?token=...">Confirmar</a>'
 * })
 *
 * // 4. Usuario hace clic en link
 * // 5. Sistema verifica token y activa cuenta
 * ```
 *
 * @module shared/api/email-service
 * @see {@link @/lib/logger/structured-logger} para logging estructurado
 */

import nodemailer from 'nodemailer';
import { structuredLogger } from '@/lib/logger/structured-logger';
import { createLogContext } from '@/lib/logger/helpers';

/**
 * Opciones para enviar un email
 *
 * @interface EmailServiceOptions
 * @property {string} to - Dirección de email del destinatario
 * @property {string} subject - Asunto del email
 * @property {string} html - Cuerpo del email en HTML
 */
export interface EmailServiceOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Interfaz común para todos los servicios de email
 *
 * Implementa patrón Strategy: permite intercambiar proveedores sin cambiar código cliente.
 *
 * @interface IEmailService
 */
export interface IEmailService {
  /**
   * Envía un email
   * @param options Opciones del email (to, subject, html)
   * @throws Error si el envío falla
   */
  send(options: EmailServiceOptions): Promise<void>;
}

/**
 * Implementación para Consola (Modo Desarrollo)
 *
 * **Propósito**: Desarrollo y testing sin credenciales reales.
 * No envía emails reales, solo los registra en logs.
 *
 * **Cuándo se Usa**:
 * - Desarrollo local sin configurar proveedores
 * - Testing automatizado
 * - CI/CD sin vars de entorno de email
 * - Debugging: ver qué emails se enviarían
 *
 * **Salida**:
 * ```
 * [INFO] Sending email (console mode)
 * {
 *   to: "user@example.com",
 *   subject: "Welcome!",
 *   bodyPreview: "<!DOCTYPE html>...",
 *   context: "email:send_console"
 * }
 * ```
 *
 * **Ventajas**:
 * - No requiere configuración
 * - No tiene riesgo de enviar emails reales accidentalmente
 * - Útil para desarrollar flujos de email
 *
 * @private
 */
class ConsoleEmailService implements IEmailService {
  /**
   * Registra el email en console en lugar de enviarlo
   *
   * @param {EmailServiceOptions} options - Email a "enviar"
   */
  async send({ to, subject, html }: EmailServiceOptions): Promise<void> {
    structuredLogger.info('Sending email (console mode)',
      createLogContext('email', 'send_console', {
        to,
        subject,
        bodyPreview: html.substring(0, 100) + '...',
      })
    );
    return Promise.resolve();
  }
}

/**
 * Implementación para Gmail SMTP (Producción)
 *
 * **Propósito**: Enviar emails reales usando cuenta de Gmail.
 * Usa App Password para seguridad (no contraseña de cuenta).
 *
 * **Configuración Gmail**:
 * 1. Habilitar autenticación de 2 factores en Google Account
 * 2. Generar App Password:
 *    - Ir a myaccount.google.com/apppasswords
 *    - Seleccionar Mail + Windows Computer (o lo que uses)
 *    - Google genera contraseña de 16 caracteres
 *    - Guardar en env: GMAIL_APP_PASSWORD
 *
 * **Variables de Entorno**:
 * ```
 * GMAIL_USER=tu-email@gmail.com
 * GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
 * ```
 *
 * **Características**:
 * - SMTP sobre port 465 (SSL/TLS)
 * - Conecta directamente a smtp.gmail.com
 * - Soporte para archivos adjuntos y HTML
 * - Logging estructurado de éxitos/errores
 *
 * **Ventajas**:
 * - Gratuito (dentro de límites)
 * - Confiable y bien mantenido por Google
 * - Interfaz familiar
 *
 * **Limitaciones**:
 * - Límite de 500 emails/día desde aplicación
 * - No es para marketing masivo
 * - Requiere App Password (extra seguro)
 *
 * **Ejemplo de Uso**:
 * ```typescript
 * await activeEmailService.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome to Aurora Nova!',
 *   html: '<h1>Welcome</h1><p>...</p>'
 * })
 * // Logs: Email sent successfully
 * ```
 *
 * @private
 */
class GmailService implements IEmailService {
  private transporter: nodemailer.Transporter;

  /**
   * Inicializa el transportador SMTP para Gmail
   * Lee credenciales de env vars
   */
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // TLS
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  /**
   * Envía email a través de Gmail SMTP
   *
   * **Flujo**:
   * 1. Conecta a smtp.gmail.com:465
   * 2. Autentica con credenciales
   * 3. Envía email
   * 4. Registra éxito o error
   *
   * @param {EmailServiceOptions} options - Email a enviar
   * @throws {Error} Si la autenticación o envío falla
   */
  async send({ to, subject, html }: EmailServiceOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Aurora Nova" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html,
      });
      structuredLogger.info('Email sent successfully',
        createLogContext('email', 'send_gmail', {
          to,
          subject,
          provider: 'Gmail',
        })
      );
    } catch (error) {
      structuredLogger.error('Failed to send email via Gmail', error as Error,
        createLogContext('email', 'send_gmail', {
          to,
          subject,
        })
      );
      throw new Error('Could not send email via Gmail.');
    }
  }
}

/**
 * Implementación para SMTP Genérico (SendGrid, Mailgun, etc)
 *
 * **Propósito**: Soporte para cualquier proveedor SMTP.
 * Más flexible que Gmail, permite usar SendGrid, Mailgun, Amazon SES, etc.
 *
 * **Proveedores Soportados**:
 * - **SendGrid**: smtp.sendgrid.net:587, user: apikey, pass: SG.xxxxx
 * - **Mailgun**: smtp.mailgun.org:587, user: postmaster@..., pass: key-xxxxx
 * - **Amazon SES**: email-smtp.region.amazonaws.com:587, user/pass de IAM
 * - **Custom SMTP**: cualquier servidor SMTP configurado
 *
 * **Variables de Entorno**:
 * ```
 * SMTP_HOST=smtp.example.com
 * SMTP_PORT=465 (TLS, recomendado) o 587 (STARTTLS)
 * SMTP_USER=usuario@example.com (o apikey)
 * SMTP_PASS=contraseña (o API key)
 * FROM_EMAIL=noreply@example.com (opcional, default: SMTP_USER)
 * ```
 *
 * **Puertos**:
 * - **465**: SSL/TLS (conexión encriptada desde el inicio)
 * - **587**: STARTTLS (inicia plano, luego upgradea a TLS)
 * - Automático: puerto 465 → secure=true, otros → secure=false
 *
 * **Características**:
 * - Soporta cualquier servidor SMTP estándar
 * - Detección automática de puerto (465 = TLS)
 * - FROM_EMAIL personalizable
 * - Logging estructurado
 *
 * **Ventajas**:
 * - Mejor entrega: infraestructura de email profesional
 * - Escalable: soporta millones de emails
 * - Flexible: compatible con muchos proveedores
 * - Tracking: muchos tienen webhooks de delivery
 *
 * **Comparación SendGrid vs Gmail**:
 * ```
 * Gmail:      500 emails/día, gratis, simple
 * SendGrid:   100 emails/mes gratis, scalable, professional
 * Mailgun:    10k emails/mes gratis, muy confiable
 * ```
 *
 * **Ejemplo - SendGrid**:
 * ```
 * SMTP_HOST=smtp.sendgrid.net
 * SMTP_PORT=587
 * SMTP_USER=apikey
 * SMTP_PASS=SG.xxxxxxxxxxxx_xxxxx
 * FROM_EMAIL=noreply@miapp.com
 * ```
 *
 * **Ejemplo - Mailgun**:
 * ```
 * SMTP_HOST=smtp.mailgun.org
 * SMTP_PORT=587
 * SMTP_USER=postmaster@sandbox123.mailgun.org
 * SMTP_PASS=key-xxxxxxxxxxxxx
 * ```
 *
 * @private
 */
class SmtpService implements IEmailService {
  private transporter: nodemailer.Transporter;

  /**
   * Inicializa el transportador SMTP genérico
   * Auto-detecta seguridad basada en puerto
   */
  constructor() {
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
    const secure = port === 465; // Puerto 465 = SSL/TLS desde inicio

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Envía email a través de SMTP genérico
   *
   * **Flujo**:
   * 1. Conecta a SMTP_HOST:SMTP_PORT
   * 2. Autentica con SMTP_USER:SMTP_PASS
   * 3. Envía email
   * 4. Registra éxito o error con contexto
   *
   * @param {EmailServiceOptions} options - Email a enviar
   * @throws {Error} Si la autenticación o envío falla
   */
  async send({ to, subject, html }: EmailServiceOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Aurora Nova" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      structuredLogger.info('Email sent successfully',
        createLogContext('email', 'send_smtp', {
          to,
          subject,
          provider: 'SMTP',
        })
      );
    } catch (error) {
      structuredLogger.error('Failed to send email via SMTP', error as Error,
        createLogContext('email', 'send_smtp', {
          to,
          subject,
        })
      );
      throw new Error('Could not send email via generic SMTP.');
    }
  }
}


/**
 * Factory Pattern: Selecciona el proveedor de email correcto
 *
 * Implementa patrón Strategy + Factory:
 * - Selecciona proveedor según variables de entorno
 * - Lazy initialization: instancia solo cuando se necesita
 * - Singleton: una sola instancia en toda la app
 *
 * **Prioridad de Selección**:
 * 1. **SMTP Genérico**: SMTP_HOST + SMTP_USER + SMTP_PASS (configuración completa)
 * 2. **Gmail**: GMAIL_USER + GMAIL_APP_PASSWORD (fallback producción)
 * 3. **Consola**: Si no hay variables (fallback desarrollo)
 *
 * **Ventaja de esta Arquitectura**:
 * - Cambiar proveedor sin modificar código (solo env vars)
 * - Fácil de testear (inyectar mock en tests)
 * - Escalable: agregar nuevo proveedor = nueva clase + línea en factory
 *
 * @private
 */
let emailService: IEmailService;

/**
 * Obtiene la instancia del servicio de email (Singleton)
 *
 * **Lógica**:
 * 1. Si ya existe instancia: retorna la existente
 * 2. Si no existe: crea según env vars en orden de prioridad
 * 3. Registra en console cuál proveedor se seleccionó
 *
 * **Decisión de Proveedor**:
 * ```
 * ┌─ ¿SMTP_HOST+USER+PASS? ─ SI ─→ SmtpService
 * │
 * ├─ ¿GMAIL_USER+APP_PASSWORD? ─ SI ─→ GmailService
 * │
 * └─ ─→ ConsoleEmailService (default)
 * ```
 *
 * **Ejemplo - Desarrollo**:
 * ```
 * # Sin env vars → ConsoleEmailService
 * npm run dev
 * # Logs: "Using console email service..."
 * ```
 *
 * **Ejemplo - Producción con Gmail**:
 * ```
 * GMAIL_USER=app@gmail.com
 * GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
 * # Logs: "Using Gmail email service."
 * ```
 *
 * **Ejemplo - Producción con SendGrid**:
 * ```
 * SMTP_HOST=smtp.sendgrid.net
 * SMTP_PORT=587
 * SMTP_USER=apikey
 * SMTP_PASS=SG.xxxxx
 * # Logs: "Using generic SMTP email service."
 * ```
 *
 * @returns {IEmailService} Instancia del servicio seleccionado
 */
function getEmailService(): IEmailService {
  if (!emailService) {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      console.log('Using generic SMTP email service.');
      emailService = new SmtpService();
    } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      console.log('Using Gmail email service.');
      emailService = new GmailService();
    } else {
      console.log('Using console email service. Set SMTP or Gmail environment variables to send real emails.');
      emailService = new ConsoleEmailService();
    }
  }
  return emailService;
}

/**
 * Instancia del servicio de email (Singleton exportado)
 *
 * Se inicializa al importar el módulo.
 * Usar en toda la aplicación para enviar emails.
 *
 * **Uso**:
 * ```typescript
 * import { activeEmailService } from '@/modules/shared/api/email-service'
 *
 * await activeEmailService.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Welcome to Aurora Nova</h1>'
 * })
 * ```
 *
 * @type {IEmailService}
 *
 * @example
 * ```typescript
 * // En src/actions/auth.ts
 * await activeEmailService.send({
 *   to: newUser.email,
 *   subject: 'Verify your email',
 *   html: renderVerificationEmail(token)
 * })
 * ```
 */
export const activeEmailService = getEmailService();
