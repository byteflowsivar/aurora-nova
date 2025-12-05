/**
 * Email Event Listener
 *
 * Escucha eventos del sistema y envía emails correspondientes.
 * Utiliza Mustache templates para generar el contenido HTML.
 *
 * @module events/listeners/email-listener
 */

import { eventBus } from '../event-bus';
import { SystemEvent } from '../types';
import { EventArea } from '../event-area';
import { activeEmailService } from '@/modules/shared/api/email-service';
import { structuredLogger } from '@/lib/logger/structured-logger';
import Mustache from 'mustache';
import fs from 'fs/promises';
import path from 'path';
import { env } from '@/lib/env';

/**
 * Listener para enviar emails basados en eventos del sistema
 */
export class EmailEventListener {
  /**
   * Obtener la ruta base de templates según el área
   */
  private getTemplatesPath(area?: string): string {
    const areaFolder = this.getAreaFolder(area);
    return path.join(process.cwd(), 'templates', areaFolder, 'email');
  }

  /**
   * Obtener el nombre de carpeta para el área
   */
  private getAreaFolder(area?: string): string {
    switch (area) {
      case EventArea.CUSTOMER:
        return 'customer';
      case EventArea.PUBLIC:
        return 'public';
      case EventArea.ADMIN:
      case EventArea.SYSTEM:
      default:
        return 'admin';
    }
  }

  /**
   * Registrar todos los listeners de email
   */
  register() {
    // Login notification
    eventBus.subscribe(SystemEvent.USER_LOGGED_IN, async (event) => {
      await this.sendLoginNotification(event.payload, event.metadata.area);
    });

    // Password reset
    eventBus.subscribe(SystemEvent.PASSWORD_RESET_REQUESTED, async (event) => {
      await this.sendPasswordResetEmail(event.payload, event.metadata.area);
    });

    // Password changed notification
    eventBus.subscribe(SystemEvent.PASSWORD_CHANGED, async (event) => {
      await this.sendPasswordChangedNotification(event.payload, event.metadata.area);
    });

    // Welcome email
    eventBus.subscribe(SystemEvent.USER_REGISTERED, async (event) => {
      await this.sendWelcomeEmail(event.payload, event.metadata.area);
    });

    structuredLogger.info('Email event listeners registered', {
      module: 'events',
      action: 'register_email_listeners',
      metadata: {
        listeners: [
          'USER_LOGGED_IN',
          'PASSWORD_RESET_REQUESTED',
          'PASSWORD_CHANGED',
          'USER_REGISTERED',
        ],
      },
    });
  }

  /**
   * Enviar notificación de login
   */
  private async sendLoginNotification(
    payload: {
      email: string;
      ipAddress: string;
      userAgent: string;
    },
    area?: string
  ) {
    try {
      const templatesPath = this.getTemplatesPath(area);
      const template = await fs.readFile(
        path.join(templatesPath, 'login-notification.mustache'),
        'utf8'
      );

      const html = Mustache.render(template, {
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
        timestamp: new Date().toLocaleString('es-ES', {
          dateStyle: 'full',
          timeStyle: 'short',
        }),
        appName: env.APP_NAME || 'Aurora Nova',
        appUrl: env.APP_URL,
      });

      await activeEmailService.send({
        to: payload.email,
        subject: 'Nuevo inicio de sesión detectado',
        html,
      });

      structuredLogger.info('Login notification sent', {
        module: 'events',
        action: 'email_sent',
        metadata: {
          email: payload.email,
          emailType: 'login_notification',
          area,
        },
      });
    } catch (error) {
      structuredLogger.error('Failed to send login notification', error as Error, {
        module: 'events',
        action: 'email_failed',
        metadata: {
          email: payload.email,
          emailType: 'login_notification',
          area,
        },
      });
    }
  }

  /**
   * Enviar email de reset de contraseña
   */
  private async sendPasswordResetEmail(
    payload: {
      email: string;
      token: string;
      expiresAt: Date;
    },
    area?: string
  ) {
    try {
      const templatesPath = this.getTemplatesPath(area);
      const template = await fs.readFile(
        path.join(templatesPath, 'password-reset.mustache'),
        'utf8'
      );

      const resetUrl = `${env.NEXTAUTH_URL}/admin/auth/reset-password?token=${payload.token}`;
      const expiresIn = Math.round(
        (payload.expiresAt.getTime() - Date.now()) / (1000 * 60)
      );

      const html = Mustache.render(template, {
        resetLink: resetUrl,
        expiresIn,
        appName: env.APP_NAME || 'Aurora Nova',
        appUrl: env.APP_URL,
      });

      await activeEmailService.send({
        to: payload.email,
        subject: 'Restablecer contraseña',
        html,
      });

      structuredLogger.info('Password reset email sent', {
        module: 'events',
        action: 'email_sent',
        metadata: {
          email: payload.email,
          emailType: 'password_reset',
          area,
        },
      });
    } catch (error) {
      structuredLogger.error('Failed to send password reset email', error as Error, {
        module: 'events',
        action: 'email_failed',
        metadata: {
          email: payload.email,
          emailType: 'password_reset',
          area,
        },
      });
    }
  }

  /**
   * Enviar notificación de contraseña cambiada
   */
  private async sendPasswordChangedNotification(
    payload: {
      email: string;
      changedBy: 'self' | 'admin';
    },
    area?: string
  ) {
    try {
      const templatesPath = this.getTemplatesPath(area);
      const template = await fs.readFile(
        path.join(templatesPath, 'password-changed.mustache'),
        'utf8'
      );

      const html = Mustache.render(template, {
        changedBy: payload.changedBy,
        changedBySelf: payload.changedBy === 'self',
        changedByAdmin: payload.changedBy === 'admin',
        timestamp: new Date().toLocaleString('es-ES', {
          dateStyle: 'full',
          timeStyle: 'short',
        }),
        appName: env.APP_NAME || 'Aurora Nova',
        appUrl: env.APP_URL,
        supportEmail: env.SUPPORT_EMAIL || 'support@example.com',
      });

      await activeEmailService.send({
        to: payload.email,
        subject: 'Tu contraseña ha sido cambiada',
        html,
      });

      structuredLogger.info('Password changed notification sent', {
        module: 'events',
        action: 'email_sent',
        metadata: {
          email: payload.email,
          emailType: 'password_changed',
          area,
        },
      });
    } catch (error) {
      structuredLogger.error('Failed to send password changed notification', error as Error, {
        module: 'events',
        action: 'email_failed',
        metadata: {
          email: payload.email,
          emailType: 'password_changed',
          area,
        },
      });
    }
  }

  /**
   * Enviar email de bienvenida
   */
  private async sendWelcomeEmail(
    payload: {
      email: string;
      firstName: string | null;
    },
    area?: string
  ) {
    try {
      const templatesPath = this.getTemplatesPath(area);
      const template = await fs.readFile(
        path.join(templatesPath, 'welcome.mustache'),
        'utf8'
      );

      const html = Mustache.render(template, {
        firstName: payload.firstName || 'Usuario',
        hasFirstName: !!payload.firstName,
        appName: env.APP_NAME || 'Aurora Nova',
        appUrl: env.APP_URL,
        supportEmail: env.SUPPORT_EMAIL || 'support@example.com',
      });

      await activeEmailService.send({
        to: payload.email,
        subject: '¡Bienvenido a Aurora Nova!',
        html,
      });

      structuredLogger.info('Welcome email sent', {
        module: 'events',
        action: 'email_sent',
        metadata: {
          email: payload.email,
          emailType: 'welcome',
          area,
        },
      });
    } catch (error) {
      structuredLogger.error('Failed to send welcome email', error as Error, {
        module: 'events',
        action: 'email_failed',
        metadata: {
          email: payload.email,
          emailType: 'welcome',
          area,
        },
      });
    }
  }
}
