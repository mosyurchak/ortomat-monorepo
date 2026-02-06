import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  // Експорт всіх даних з БД
  async exportAllData() {
    this.logger.log('Starting database backup');

    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        // Користувачі (без паролів!)
        users: await this.prisma.user.findMany({
          select: {
            id: true,
            email: true,
            role: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
            isVerified: true,
            createdAt: true,
            // НЕ включаємо password!
          },
        }),

        // Ортомати
        ortomats: await this.prisma.ortomat.findMany(),

        // Продукти
        products: await this.prisma.product.findMany(),

        // Комірки
        cells: await this.prisma.cell.findMany(),

        // Платежі
        payments: await this.prisma.payment.findMany(),

        // Зв'язки лікарів з ортоматами
        doctorOrtomats: await this.prisma.doctorOrtomat.findMany(),

        // Зв'язки кур'єрів з ортоматами
        courierOrtomats: await this.prisma.courierOrtomat.findMany(),

        // Запрошення
        invites: await this.prisma.ortomatInvite.findMany(),

        // Продажі
        sales: await this.prisma.sale.findMany(),

        // Логи
        logs: await this.prisma.activityLog.findMany({
          take: 1000, // Обмежуємо до останніх 1000 логів (для швидкості та розміру)
          orderBy: { createdAt: 'desc' },
        }),

        // Налаштування
        settings: await this.prisma.settings.findMany(),
      },
    };

    this.logger.log('Backup created successfully');
    this.logger.log(`Backup stats: Users=${backup.data.users.length}, Ortomats=${backup.data.ortomats.length}, Products=${backup.data.products.length}, Cells=${backup.data.cells.length}, Sales=${backup.data.sales.length}, Payments=${backup.data.payments.length}, Logs=${backup.data.logs.length}`);

    return backup;
  }

  // Відновлення даних з бекапу
  async restoreAllData(backupData: any) {
    this.logger.log('Starting database restore');

    if (!backupData.data) {
      throw new Error('Невірний формат бекапу');
    }

    const data = backupData.data;

    // УВАГА: Видаляємо всі існуючі дані перед відновленням
    // Порядок важливий через foreign keys
    this.logger.warn('Clearing existing data');

    await this.prisma.activityLog.deleteMany({});
    await this.prisma.sale.deleteMany({});
    await this.prisma.payment.deleteMany({});
    await this.prisma.cell.deleteMany({});
    await this.prisma.ortomatInvite.deleteMany({});
    await this.prisma.courierOrtomat.deleteMany({});
    await this.prisma.doctorOrtomat.deleteMany({});
    await this.prisma.product.deleteMany({});
    await this.prisma.ortomat.deleteMany({});
    await this.prisma.settings.deleteMany({});
    await this.prisma.user.deleteMany({});

    this.logger.log('Existing data cleared');
    this.logger.log('Restoring data');

    // Генеруємо хешований дефолтний пароль для всіх користувачів
    const DEFAULT_PASSWORD = 'password123';
    const hashedDefaultPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    this.logger.warn('Default password set for restored users');

    // Відновлюємо дані в правильному порядку
    // Спочатку незалежні таблиці, потім залежні

    // 1. Користувачі (БЕЗ паролів - вони мають змінити паролі!)
    if (data.users?.length) {
      for (const user of data.users) {
        await this.prisma.user.create({
          data: {
            ...user,
            password: hashedDefaultPassword, // Хешований дефолтний пароль
          },
        });
      }
      this.logger.log(`Users restored: ${data.users.length}`);
    }

    // 2. Ортомати
    if (data.ortomats?.length) {
      await this.prisma.ortomat.createMany({ data: data.ortomats });
      this.logger.log(`Ortomats restored: ${data.ortomats.length}`);
    }

    // 3. Продукти
    if (data.products?.length) {
      await this.prisma.product.createMany({ data: data.products });
      this.logger.log(`Products restored: ${data.products.length}`);
    }

    // 4. Комірки
    if (data.cells?.length) {
      await this.prisma.cell.createMany({ data: data.cells });
      this.logger.log(`Cells restored: ${data.cells.length}`);
    }

    // 5. Зв'язки лікарів
    if (data.doctorOrtomats?.length) {
      await this.prisma.doctorOrtomat.createMany({ data: data.doctorOrtomats });
      this.logger.log(`Doctor-Ortomat links restored: ${data.doctorOrtomats.length}`);
    }

    // 6. Зв'язки кур'єрів
    if (data.courierOrtomats?.length) {
      await this.prisma.courierOrtomat.createMany({
        data: data.courierOrtomats,
      });
      this.logger.log(`Courier-Ortomat links restored: ${data.courierOrtomats.length}`);
    }

    // 7. Запрошення
    if (data.invites?.length) {
      await this.prisma.ortomatInvite.createMany({ data: data.invites });
      this.logger.log(`Invites restored: ${data.invites.length}`);
    }

    // 8. Платежі
    if (data.payments?.length) {
      await this.prisma.payment.createMany({ data: data.payments });
      this.logger.log(`Payments restored: ${data.payments.length}`);
    }

    // 9. Продажі
    if (data.sales?.length) {
      await this.prisma.sale.createMany({ data: data.sales });
      this.logger.log(`Sales restored: ${data.sales.length}`);
    }

    // 10. Логи
    if (data.logs?.length) {
      await this.prisma.activityLog.createMany({ data: data.logs });
      this.logger.log(`Logs restored: ${data.logs.length}`);
    }

    // 11. Налаштування
    if (data.settings?.length) {
      await this.prisma.settings.createMany({ data: data.settings });
      this.logger.log(`Settings restored: ${data.settings.length}`);
    }

    this.logger.log('Database restore completed successfully');
    this.logger.warn(`All users restored with temporary password - ${data.users?.length || 0} users must change password after first login`);

    return { success: true };
  }
}
