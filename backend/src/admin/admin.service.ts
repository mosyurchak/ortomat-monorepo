import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // Експорт всіх даних з БД
  async exportAllData() {
    console.log('🔄 Starting database backup...');

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

        // Замовлення
        orders: await this.prisma.order.findMany(),

        // Платежі
        payments: await this.prisma.payment.findMany(),

        // Зв'язки лікарів з ортоматами
        doctorOrtomats: await this.prisma.doctorOrtomat.findMany(),

        // Зв'язки кур'єрів з ортоматами
        courierOrtomats: await this.prisma.courierOrtomat.findMany(),

        // Запрошення
        invites: await this.prisma.invite.findMany(),

        // Продажі
        sales: await this.prisma.sale.findMany(),

        // Логи
        logs: await this.prisma.log.findMany({
          take: 10000, // Обмежуємо до останніх 10000 логів
          orderBy: { timestamp: 'desc' },
        }),

        // Налаштування
        settings: await this.prisma.setting.findMany(),
      },
    };

    console.log('✅ Backup created successfully');
    console.log(`📊 Stats:
      - Users: ${backup.data.users.length}
      - Ortomats: ${backup.data.ortomats.length}
      - Products: ${backup.data.products.length}
      - Cells: ${backup.data.cells.length}
      - Orders: ${backup.data.orders.length}
      - Payments: ${backup.data.payments.length}
      - Logs: ${backup.data.logs.length}
    `);

    return backup;
  }

  // Відновлення даних з бекапу
  async restoreAllData(backupData: any) {
    console.log('🔄 Starting database restore...');

    if (!backupData.data) {
      throw new Error('Невірний формат бекапу');
    }

    const data = backupData.data;

    // УВАГА: Видаляємо всі існуючі дані перед відновленням
    // Порядок важливий через foreign keys
    console.log('⚠️  Clearing existing data...');

    await this.prisma.log.deleteMany({});
    await this.prisma.sale.deleteMany({});
    await this.prisma.payment.deleteMany({});
    await this.prisma.order.deleteMany({});
    await this.prisma.cell.deleteMany({});
    await this.prisma.invite.deleteMany({});
    await this.prisma.courierOrtomat.deleteMany({});
    await this.prisma.doctorOrtomat.deleteMany({});
    await this.prisma.product.deleteMany({});
    await this.prisma.ortomat.deleteMany({});
    await this.prisma.setting.deleteMany({});
    await this.prisma.user.deleteMany({});

    console.log('✅ Existing data cleared');
    console.log('📥 Restoring data...');

    // Відновлюємо дані в правильному порядку
    // Спочатку незалежні таблиці, потім залежні

    // 1. Користувачі (БЕЗ паролів - вони мають змінити паролі!)
    if (data.users?.length) {
      for (const user of data.users) {
        await this.prisma.user.create({
          data: {
            ...user,
            password: 'RESTORE_REQUIRED', // Тимчасовий пароль, треба змінити!
          },
        });
      }
      console.log(`  ✓ Users restored: ${data.users.length}`);
    }

    // 2. Ортомати
    if (data.ortomats?.length) {
      await this.prisma.ortomat.createMany({ data: data.ortomats });
      console.log(`  ✓ Ortomats restored: ${data.ortomats.length}`);
    }

    // 3. Продукти
    if (data.products?.length) {
      await this.prisma.product.createMany({ data: data.products });
      console.log(`  ✓ Products restored: ${data.products.length}`);
    }

    // 4. Комірки
    if (data.cells?.length) {
      await this.prisma.cell.createMany({ data: data.cells });
      console.log(`  ✓ Cells restored: ${data.cells.length}`);
    }

    // 5. Зв'язки лікарів
    if (data.doctorOrtomats?.length) {
      await this.prisma.doctorOrtomat.createMany({ data: data.doctorOrtomats });
      console.log(`  ✓ Doctor-Ortomat links restored: ${data.doctorOrtomats.length}`);
    }

    // 6. Зв'язки кур'єрів
    if (data.courierOrtomats?.length) {
      await this.prisma.courierOrtomat.createMany({
        data: data.courierOrtomats,
      });
      console.log(`  ✓ Courier-Ortomat links restored: ${data.courierOrtomats.length}`);
    }

    // 7. Запрошення
    if (data.invites?.length) {
      await this.prisma.invite.createMany({ data: data.invites });
      console.log(`  ✓ Invites restored: ${data.invites.length}`);
    }

    // 8. Замовлення
    if (data.orders?.length) {
      await this.prisma.order.createMany({ data: data.orders });
      console.log(`  ✓ Orders restored: ${data.orders.length}`);
    }

    // 9. Платежі
    if (data.payments?.length) {
      await this.prisma.payment.createMany({ data: data.payments });
      console.log(`  ✓ Payments restored: ${data.payments.length}`);
    }

    // 10. Продажі
    if (data.sales?.length) {
      await this.prisma.sale.createMany({ data: data.sales });
      console.log(`  ✓ Sales restored: ${data.sales.length}`);
    }

    // 11. Логи
    if (data.logs?.length) {
      await this.prisma.log.createMany({ data: data.logs });
      console.log(`  ✓ Logs restored: ${data.logs.length}`);
    }

    // 12. Налаштування
    if (data.settings?.length) {
      await this.prisma.setting.createMany({ data: data.settings });
      console.log(`  ✓ Settings restored: ${data.settings.length}`);
    }

    console.log('✅ Database restore completed successfully!');
    console.log('⚠️  ВАЖЛИВО: Всі користувачі мають пароль "RESTORE_REQUIRED" - необхідно змінити!');

    return { success: true };
  }
}
