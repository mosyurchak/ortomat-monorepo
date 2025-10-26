import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private mailerService: MailerService,
    private prisma: PrismaService,
  ) {}

  /**
   * 📧 Верифікація email при реєстрації
   */
  async sendVerificationEmail(userId: string, email: string, firstName: string) {
    try {
      // Генеруємо токен
      const token = uuidv4();
      const expires = new Date();
      expires.setHours(expires.getHours() + 24); // Токен діє 24 години

      // Зберігаємо токен в БД
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          emailVerificationToken: token,
          emailVerificationExpires: expires,
        },
      });

      const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;

      await this.mailerService.sendMail({
        to: email,
        subject: 'Підтвердіть ваш email - Ортомат',
        template: 'verify-email',
        context: {
          firstName,
          verificationUrl,
          expiresIn: '24 години',
        },
      });

      // Логуємо в БД
      await this.logEmail(userId, email, 'VERIFICATION', 'Підтвердження email', 'SENT');

      this.logger.log(`✅ Verification email sent to ${email}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Failed to send verification email to ${email}:`, error);
      await this.logEmail(userId, email, 'VERIFICATION', 'Підтвердження email', 'FAILED', error.message);
      throw error;
    }
  }

  /**
   * 🎉 Вітальний лист після верифікації
   */
  async sendWelcomeEmail(userId: string, email: string, firstName: string, role: string) {
    try {
      const dashboardUrl = 
        role === 'DOCTOR' ? `${process.env.FRONTEND_URL}/doctor` :
        role === 'COURIER' ? `${process.env.FRONTEND_URL}/courier` :
        `${process.env.FRONTEND_URL}/dashboard`;

      await this.mailerService.sendMail({
        to: email,
        subject: 'Ласкаво просимо в Ортомат!',
        template: 'welcome',
        context: {
          firstName,
          role: role === 'DOCTOR' ? 'Лікар' : 'Кур\'єр',
          dashboardUrl,
        },
      });

      await this.logEmail(userId, email, 'WELCOME', 'Вітальний лист', 'SENT');

      this.logger.log(`✅ Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send welcome email to ${email}:`, error);
      await this.logEmail(userId, email, 'WELCOME', 'Вітальний лист', 'FAILED', error.message);
    }
  }

  /**
   * 🔑 Відновлення паролю
   */
  async sendPasswordResetEmail(userId: string, email: string, firstName: string) {
    try {
      const token = uuidv4();
      const expires = new Date();
      expires.setHours(expires.getHours() + 1); // Токен діє 1 годину

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          resetPasswordToken: token,
          resetPasswordExpires: expires,
        },
      });

      const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

      await this.mailerService.sendMail({
        to: email,
        subject: 'Відновлення паролю - Ортомат',
        template: 'reset-password',
        context: {
          firstName,
          resetUrl,
          expiresIn: '1 година',
        },
      });

      await this.logEmail(userId, email, 'PASSWORD_RESET', 'Відновлення паролю', 'SENT');

      this.logger.log(`✅ Password reset email sent to ${email}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Failed to send password reset email to ${email}:`, error);
      await this.logEmail(userId, email, 'PASSWORD_RESET', 'Відновлення паролю', 'FAILED', error.message);
      throw error;
    }
  }

  /**
   * 💰 Повідомлення лікарю про продаж
   */
  async sendSaleNotification(
    doctorId: string,
    saleData: {
      productName: string;
      amount: number;
      commission: number;
      ortomatName: string;
      saleId: string;
    },
  ) {
    try {
      const doctor = await this.prisma.user.findUnique({
        where: { id: doctorId },
        select: {
          email: true,
          firstName: true,
          emailNotifications: true,
        },
      });

      if (!doctor || !doctor.emailNotifications) {
        this.logger.log(`⏭️ Skipping sale notification for doctor ${doctorId} (notifications disabled)`);
        return;
      }

      const statsUrl = `${process.env.FRONTEND_URL}/doctor/statistics`;

      await this.mailerService.sendMail({
        to: doctor.email,
        subject: '💰 Нова комісія від продажу!',
        template: 'sale-notification',
        context: {
          firstName: doctor.firstName,
          productName: saleData.productName,
          amount: saleData.amount.toFixed(2),
          commission: saleData.commission.toFixed(2),
          ortomatName: saleData.ortomatName,
          statsUrl,
        },
      });

      await this.logEmail(doctorId, doctor.email, 'SALE_NOTIFICATION', 'Повідомлення про продаж', 'SENT');

      // Оновлюємо час останнього повідомлення
      await this.prisma.user.update({
        where: { id: doctorId },
        data: { lastNotificationSent: new Date() },
      });

      this.logger.log(`✅ Sale notification sent to doctor ${doctor.email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send sale notification:`, error);
    }
  }

  /**
   * 📦 Нагадування кур'єру про поповнення
   */
  async sendRefillReminder(
    courierId: string,
    ortomatsData: Array<{
      ortomatName: string;
      emptyCells: number;
      lowStockCells: number;
    }>,
  ) {
    try {
      const courier = await this.prisma.user.findUnique({
        where: { id: courierId },
        select: {
          email: true,
          firstName: true,
          emailNotifications: true,
        },
      });

      if (!courier || !courier.emailNotifications) {
        this.logger.log(`⏭️ Skipping refill reminder for courier ${courierId} (notifications disabled)`);
        return;
      }

      const refillUrl = `${process.env.FRONTEND_URL}/courier/refill`;

      await this.mailerService.sendMail({
        to: courier.email,
        subject: '📦 Необхідне поповнення ортоматів',
        template: 'refill-reminder',
        context: {
          firstName: courier.firstName,
          ortomats: ortomatsData,
          totalOrtomats: ortomatsData.length,
          refillUrl,
        },
      });

      await this.logEmail(courierId, courier.email, 'REFILL_REMINDER', 'Нагадування про поповнення', 'SENT');

      await this.prisma.user.update({
        where: { id: courierId },
        data: { lastNotificationSent: new Date() },
      });

      this.logger.log(`✅ Refill reminder sent to courier ${courier.email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send refill reminder:`, error);
    }
  }

  /**
   * 📊 Логування email в БД
   */
  private async logEmail(
    userId: string | null,
    email: string,
    type: any,
    subject: string,
    status: any,
    error?: string,
  ) {
    try {
      await this.prisma.emailLog.create({
        data: {
          userId,
          email,
          type,
          subject,
          status,
          error,
        },
      });
    } catch (err) {
      this.logger.error('Failed to log email:', err);
    }
  }

  /**
   * ✅ Верифікація токена
   */
  async verifyEmailToken(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new Error('Невірний або прострочений токен');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    // Відправляємо вітальний лист
    await this.sendWelcomeEmail(user.id, user.email, user.firstName, user.role);

    return { success: true, email: user.email };
  }

  /**
   * 🔑 Верифікація токена скидання паролю
   */
  async verifyResetToken(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new Error('Невірний або прострочений токен');
    }

    return { userId: user.id, email: user.email };
  }

  /**
   * 🔐 Оновлення паролю після скидання
   */
  async resetPassword(token: string, newPassword: string) {
    const user = await this.verifyResetToken(token);

    await this.prisma.user.update({
      where: { id: user.userId },
      data: {
        password: newPassword, // Має бути захешовано в auth.service
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { success: true };
  }
}
