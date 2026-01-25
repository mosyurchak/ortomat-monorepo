import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Ініціалізуємо Nodemailer з Gmail SMTP
    const emailUser = process.env.SMTP_USER;
    const emailPass = process.env.SMTP_PASS;

    if (emailUser && emailPass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      // Перевіряємо з'єднання
      this.transporter.verify((error, success) => {
        if (error) {
          this.logger.error('❌ SMTP connection failed:', error);
        } else {
          this.logger.log('✅ SMTP server ready to send emails');
        }
      });
    } else {
      this.logger.warn('⚠️ SMTP_USER or SMTP_PASS not set');
    }
  }

  /**
   * Компілює Handlebars шаблон
   */
  private compileTemplate(templateName: string, data: any): string {
    try {
      const templatePath = join(__dirname, 'templates', `${templateName}.hbs`);
      const templateContent = readFileSync(templatePath, 'utf-8');
      const template = Handlebars.compile(templateContent);
      return template(data);
    } catch (error) {
      this.logger.warn(`Template ${templateName} not found, using default HTML`);
      // Повертаємо базовий HTML якщо шаблон не знайдено
      return this.getDefaultHtml(templateName, data);
    }
  }

  /**
   * Відправляє email через Nodemailer (Gmail SMTP)
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@ortomat.com.ua',
      to,
      subject,
      html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email sent to ${to} (Message ID: ${info.messageId})`);
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${to}:`, error.message);
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

      // Логуємо в базу для tracking
      await this.prisma.emailLog.create({
        data: {
          email,
          type: 'PASSWORD_RESET',
          subject: 'Скидання паролю - Ортомат',
          status: 'SENT',
          metadata: { userId, token: token.substring(0, 10) + '...' },
        },
      });

      this.logger.log(`✅ Password reset email sent to ${email}`);
    } catch (error) {
      // Логуємо failed спробу
      try {
        await this.prisma.emailLog.create({
          data: {
            email,
            type: 'PASSWORD_RESET',
            subject: 'Скидання паролю - Ортомат',
            status: 'FAILED',
            error: error.message,
          },
        });
      } catch (logError) {
        this.logger.error('Failed to log email error:', logError);
      }

      this.logger.error(`❌ Failed to send password reset email to ${email}:`, error);
      throw error;
    }
  }

  /**
   * НОВИЙ МЕТОД: Відправка сповіщення про комісію лікарю
   */
  async sendCommissionNotification(
    email: string,
    data: {
      firstName: string;
      commission: number;
      saleAmount: number;
      orderId: string;
    },
  ): Promise<void> {
    this.logger.log(`💰 Sending commission notification to ${email}`);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Нова комісія</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 0 0 5px 5px;
          }
          .amount {
            font-size: 24px;
            color: #4CAF50;
            font-weight: bold;
          }
          .button {
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin-top: 20px;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>💰 Нова комісія нарахована!</h1>
        </div>
        <div class="content">
          <p>Шановний(а) ${data.firstName},</p>
          <p>Вітаємо! Ви отримали комісію за продаж через вашу реферальну ссилку.</p>

          <table style="width: 100%; margin: 20px 0;">
            <tr>
              <td><strong>Номер замовлення:</strong></td>
              <td>${data.orderId}</td>
            </tr>
            <tr>
              <td><strong>Сума продажу:</strong></td>
              <td>${data.saleAmount} ₴</td>
            </tr>
            <tr>
              <td><strong>Ваша комісія (10%):</strong></td>
              <td class="amount">${data.commission} ₴</td>
            </tr>
          </table>

          <p>Комісія буде доступна для виплати згідно з умовами договору.</p>

          <a href="${this.configService.get('FRONTEND_URL')}/doctor/earnings" class="button">
            Переглянути мої доходи
          </a>
        </div>
        <div class="footer">
          <p>© 2024 Ortomat. Всі права захищені.</p>
          <p>Це автоматичне повідомлення. Будь ласка, не відповідайте на цей лист.</p>
        </div>
      </body>
      </html>
    `;

    try {
      await this.sendEmail(
        email,
        `Нова комісія: ${data.commission} ₴`,
        html,
      );

      // Логуємо в базу
      await this.prisma.emailLog.create({
        data: {
          email,
          type: 'SALE_NOTIFICATION',
          subject: `Нова комісія: ${data.commission} ₴`,
          status: 'SENT',
          metadata: data,
        },
      });

      this.logger.log(`✅ Commission notification sent to ${email}`);
    } catch (error) {
      this.logger.error('Error sending commission notification:', error);
      // Не блокуємо процес якщо email не відправився
    }
  }

  /**
   * НОВИЙ МЕТОД: Відправка підтвердження покупки покупцю
   */
  async sendPurchaseConfirmation(
    email: string,
    data: {
      orderId: string;
      amount: number;
      productName?: string;
      ortomatAddress?: string;
      cellNumber?: number;
    },
  ): Promise<void> {
    this.logger.log(`🛒 Sending purchase confirmation to ${email}`);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Підтвердження покупки</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #2196F3;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 0 0 5px 5px;
          }
          .order-box {
            background: white;
            padding: 15px;
            border: 2px solid #2196F3;
            border-radius: 5px;
            margin: 20px 0;
          }
          .button {
            background: #2196F3;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✅ Дякуємо за покупку!</h1>
        </div>
        <div class="content">
          <p>Ваше замовлення успішно оплачено!</p>

          <div class="order-box">
            <h3>Деталі замовлення:</h3>
            <p><strong>Номер замовлення:</strong> ${data.orderId}</p>
            <p><strong>Сума:</strong> ${data.amount} ₴</p>
            ${data.productName ? `<p><strong>Товар:</strong> ${data.productName}</p>` : ''}
          </div>

          ${data.ortomatAddress ? `
          <div class="order-box">
            <h3>📍 Де забрати товар:</h3>
            <p><strong>Адреса ортомату:</strong> ${data.ortomatAddress}</p>
            ${data.cellNumber ? `<p><strong>Номер комірки:</strong> ${data.cellNumber}</p>` : ''}
            <p style="color: #666; font-size: 14px;">
              Товар буде доступний для отримання протягом 24 годин.
            </p>
          </div>
          ` : ''}

          <p style="text-align: center; margin-top: 30px;">
            <a href="${this.configService.get('FRONTEND_URL')}/orders/${data.orderId}" class="button">
              Переглянути замовлення
            </a>
          </p>

          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            Якщо у вас виникли питання, зв'яжіться з нами за телефоном:
            <strong>+38 (050) 123-45-67</strong>
          </p>
        </div>
      </body>
      </html>
    `;

    try {
      await this.sendEmail(
        email,
        `Замовлення ${data.orderId} підтверджено`,
        html,
      );

      // Логуємо в базу
      await this.prisma.emailLog.create({
        data: {
          email,
          type: 'SALE_NOTIFICATION',
          subject: `Замовлення ${data.orderId} підтверджено`,
          status: 'SENT',
          metadata: data,
        },
      });

      this.logger.log(`✅ Purchase confirmation sent to ${email}`);
    } catch (error) {
      this.logger.error('Error sending purchase confirmation:', error);
      // Не блокуємо процес якщо email не відправився
    }
  }

  /**
   * НОВИЙ МЕТОД: Універсальний метод для відправки сповіщень про продаж
   */
  async sendSaleNotification(
    email: string,
    data: any
  ): Promise<void> {
    // Якщо це комісія для лікаря
    if (data.commission !== undefined) {
      return this.sendCommissionNotification(email, data);
    }

    // Якщо це підтвердження для покупця
    if (data.orderId && data.amount) {
      return this.sendPurchaseConfirmation(email, data);
    }

    // Якщо тип не визначено - логуємо
    this.logger.warn(`Unknown sale notification type for ${email}`, data);
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

  /**
   * Резервний HTML якщо шаблон не знайдено
   */
  private getDefaultHtml(templateName: string, data: any): string {
    switch (templateName) {
      case 'verify-email':
        return `
          <h1>Підтвердіть ваш email</h1>
          <p>Привіт ${data.firstName},</p>
          <p>Будь ласка, підтвердіть вашу email адресу, натиснувши на посилання нижче:</p>
          <p><a href="${data.verificationUrl}">Підтвердити email</a></p>
        `;
      case 'welcome':
        return `
          <h1>Вітаємо в Ортомат!</h1>
          <p>Привіт ${data.firstName},</p>
          <p>Ваш акаунт успішно створено!</p>
          <p><a href="${data.dashboardUrl}">Перейти до кабінету</a></p>
        `;
      case 'reset-password':
        return `
          <h1>Скидання паролю</h1>
          <p>Привіт ${data.firstName},</p>
          <p>Для скидання паролю натисніть на посилання нижче:</p>
          <p><a href="${data.resetUrl}">Скинути пароль</a></p>
        `;
      default:
        return '<p>Email content</p>';
    }
  }
}
