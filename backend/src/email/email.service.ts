import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import sgMail from '@sendgrid/mail';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private prisma: PrismaService) {
    // Ініціалізуємо SendGrid
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.logger.log('✅ SendGrid initialized');
    } else {
      this.logger.warn('⚠️ SENDGRID_API_KEY not set');
    }
  }

  /**
   * Компілює Handlebars шаблон
   */
  private compileTemplate(templateName: string, data: any): string {
    const templatePath = join(__dirname, 'templates', `${templateName}.hbs`);
    const templateContent = readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(templateContent);
    return template(data);
  }

  /**
   * Відправляє email через SendGrid API
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const msg = {
      to,
      from: process.env.SMTP_FROM || 'noreply@ortomat.com.ua',
      subject,
      html,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`✅ Email sent to ${to}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${to}:`, error.response?.body || error.message);
      throw error;
    }
  }

  /**
   * Відправка email верифікації
   */
  async sendVerificationEmail(
    userId: string,
    email: string,
    firstName: string,
  ): Promise<void> {
    this.logger.log(`📧 Sending verification email to ${email}`);

    try {
      // Генеруємо токен
      const token = this.generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 години

      // Зберігаємо токен в БД
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          emailVerificationToken: token,
          emailVerificationExpires: expiresAt,
        },
      });

      // ✅ ВИПРАВЛЕНО: Прибрано /auth/
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

      // Компілюємо шаблон
      const html = this.compileTemplate('verify-email', {
        firstName,
        verificationUrl,
        year: new Date().getFullYear(),
      });

      // Відправляємо email
      await this.sendEmail(
        email,
        'Підтвердіть ваш email - Ортомат',
        html,
      );

      this.logger.log(`✅ Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send verification email to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Відправка welcome email після верифікації
   */
  async sendWelcomeEmail(
    userId: string,
    email: string,
    firstName: string,
  ): Promise<void> {
    this.logger.log(`📧 Sending welcome email to ${email}`);

    try {
      const html = this.compileTemplate('welcome', {
        firstName,
        dashboardUrl: `${process.env.FRONTEND_URL}/doctor`,
        year: new Date().getFullYear(),
      });

      await this.sendEmail(
        email,
        'Вітаємо в Ортомат! 🎉',
        html,
      );

      this.logger.log(`✅ Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send welcome email to ${email}:`, error);
      // Не кидаємо помилку, бо welcome email не критичний
    }
  }

  /**
   * Відправка email для скидання паролю
   */
  async sendPasswordResetEmail(
    userId: string,
    email: string,
    firstName: string,
  ): Promise<void> {
    this.logger.log(`📧 Sending password reset email to ${email}`);

    try {
      const token = this.generateToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 година

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          resetPasswordToken: token,
          resetPasswordExpires: expiresAt,
        },
      });

      // ✅ ВИПРАВЛЕНО: Прибрано /auth/
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

      const html = this.compileTemplate('reset-password', {
        firstName,
        resetUrl,
        year: new Date().getFullYear(),
      });

      await this.sendEmail(
        email,
        'Скидання паролю - Ортомат',
        html,
      );

      this.logger.log(`✅ Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send password reset email to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Верифікація email токену
   */
  async verifyEmailToken(token: string): Promise<{ userId: string; email: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    // Відправляємо welcome email
    await this.sendWelcomeEmail(user.id, user.email, user.firstName);

    return { userId: user.id, email: user.email };
  }

  /**
   * Верифікація токену скидання паролю
   */
  async verifyResetToken(token: string): Promise<{ userId: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    return { userId: user.id };
  }

  /**
   * Скидання паролю
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: newPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
  }

  /**
   * Генерація випадкового токену
   */
  private generateToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }
}
