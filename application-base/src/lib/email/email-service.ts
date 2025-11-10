// /application-base/src/lib/email/email-service.ts
import nodemailer from 'nodemailer';

// --- 1. Interfaz del Servicio de Email ---
export interface EmailServiceOptions {
  to: string;
  subject: string;
  html: string;
}

export interface IEmailService {
  send(options: EmailServiceOptions): Promise<void>;
}

// --- 2. Implementación para la Consola (Desarrollo) ---
class ConsoleEmailService implements IEmailService {
  async send({ to, subject, html }: EmailServiceOptions): Promise<void> {
    console.log('--- SENDING EMAIL (CONSOLE) ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('Body (HTML):', html.substring(0, 300) + '...'); // Truncado para legibilidad
    console.log('--- EMAIL SENT (to console) ---');
    return Promise.resolve();
  }
}

// --- 3. Implementación para Gmail ---
class GmailService implements IEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  async send({ to, subject, html }: EmailServiceOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Aurora Nova" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html,
      });
      console.log(`Email sent to ${to} via Gmail.`);
    } catch (error) {
      console.error('Error sending email via Gmail:', error);
      throw new Error('Could not send email via Gmail.');
    }
  }
}

// --- 4. Implementación para SMTP Genérico ---
class SmtpService implements IEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
    const secure = port === 465; // La conexión es segura si se usa el puerto 465

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

  async send({ to, subject, html }: EmailServiceOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Aurora Nova" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      console.log(`Email sent to ${to} via generic SMTP.`);
    } catch (error) {
      console.error('Error sending email via generic SMTP:', error);
      throw new Error('Could not send email via generic SMTP.');
    }
  }
}


// --- 5. Fábrica para seleccionar el servicio ---
let emailService: IEmailService;

/**
 * Obtiene la instancia del servicio de email.
 * La selección se hace en orden de prioridad:
 * 1. SMTP Genérico
 * 2. Gmail
 * 3. Consola (fallback)
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

export const activeEmailService = getEmailService();
