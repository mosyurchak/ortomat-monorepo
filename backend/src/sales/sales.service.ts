import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrtomatsService } from '../ortomats/ortomats.service';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private prisma: PrismaService,
    private ortomatsService: OrtomatsService,
  ) {}

  // ✅ Admin статистика
  async getAdminStats() {
    this.logger.log('Getting admin stats');

    // Загальна кількість користувачів
    const totalUsers = await this.prisma.user.count();

    // Загальна кількість ортоматів
    const totalOrtomats = await this.prisma.ortomat.count();

    // Загальна кількість продажів (completed)
    const totalSales = await this.prisma.sale.count({
      where: { status: 'completed' },
    });

    // Загальна виручка
    const revenueData = await this.prisma.sale.aggregate({
      where: { status: 'completed' },
      _sum: { amount: true },
    });

    // ✅ Топ-5 лікарів за кількістю продажів
    const doctorsWithSales = await this.prisma.user.findMany({
      where: { role: 'DOCTOR' },
      include: {
        _count: {
          select: {
            sales: {
              where: { status: 'completed' },
            },
          },
        },
        sales: {
          where: { status: 'completed' },
          select: {
            pointsEarned: true,
          },
        },
      },
    });

    const topDoctors = doctorsWithSales
      .map((doctor) => ({
        id: doctor.id,
        email: doctor.email,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        totalSales: doctor._count.sales,
        totalPoints: doctor.sales.reduce(
          (sum, sale) => sum + (sale.pointsEarned || 0),
          0,
        ),
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5);

    // ✅ Топ-5 товарів за кількістю продажів
    const productsWithSales = await this.prisma.product.findMany({
      include: {
        _count: {
          select: {
            sales: {
              where: { status: 'completed' },
            },
          },
        },
        sales: {
          where: { status: 'completed' },
          select: {
            amount: true,
          },
        },
      },
    });

    const topProducts = productsWithSales
      .map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        salesCount: product._count.sales,
        revenue: product.sales.reduce((sum, sale) => sum + sale.amount, 0),
      }))
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5);

    this.logger.log('Admin stats calculated');

    return {
      totalUsers,
      totalOrtomats,
      totalSales,
      totalRevenue: revenueData._sum.amount || 0,
      topDoctors,
      topProducts,
    };
  }

  // ✅ Статистика лікаря - ВИПРАВЛЕНО
  async getDoctorStats(doctorId: string) {
    this.logger.log(`Getting doctor stats for: ${doctorId}`);

    // Перевіряємо чи лікар існує
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      include: {
        doctorOrtomats: true,
      },
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    this.logger.log(`Doctor: ${doctor.id}`);
    this.logger.log(`Doctor ortomats: ${doctor.doctorOrtomats.length}`);

    // Знаходимо всі продажі де doctorId співпадає
    const sales = await this.prisma.sale.findMany({
      where: {
        doctorId,
        status: 'completed',
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
        ortomat: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    this.logger.log(`Found sales: ${sales.length}`);

    // Додатковий дебаг - показуємо перший продаж
    if (sales.length > 0) {
      this.logger.log(`First sale: ${sales[0].id}, amount: ${sales[0].amount}, points: ${sales[0].pointsEarned}`);
    }

    const totalSales = sales.length;
    const totalPoints = sales.reduce(
      (sum, sale) => sum + (sale.pointsEarned || 0),
      0,
    );

    this.logger.log(`Stats: totalSales=${totalSales}, totalPoints=${totalPoints}`);

    // Беремо останні 10 продажів для відображення
    const recentSales = sales.slice(0, 10);

    // Статистика по місяцях (PostgreSQL)
    let salesByMonth = [];
    try {
      salesByMonth = await this.prisma.$queryRaw`
        SELECT
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*)::int as count,
          COALESCE(SUM("pointsEarned"), 0)::int as points
        FROM sales
        WHERE "doctorId" = ${doctorId}
          AND status = 'completed'
        GROUP BY month
        ORDER BY month DESC
        LIMIT 6
      `;
    } catch (error) {
      this.logger.error(`Error getting sales by month: ${error.message}`);
    }

    return {
      totalSales,
      totalPoints,
      recentSales,
      salesByMonth,
    };
  }

  async createSale(data: {
    productId: string;
    ortomatId: string;
    cellNumber: number;
    amount: number;
    referralCode?: string;
    paymentId?: string;
    customerPhone?: string;
  }) {
    let doctorId = null;
    let pointsEarned = null;
    let doctorOrtomatId = null;

    this.logger.log(`Creating sale: productId=${data.productId}, ortomatId=${data.ortomatId}`);

    // Знаходимо продукт для отримання балів
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Якщо є реферальний код, знаходимо лікаря і нараховуємо бали
    if (data.referralCode) {
      this.logger.log(`Looking for referral code: ${data.referralCode}`);

      const doctorOrtomat = await this.prisma.doctorOrtomat.findUnique({
        where: { referralCode: data.referralCode },
        include: {
          doctor: true,
        },
      });

      if (doctorOrtomat) {
        doctorId = doctorOrtomat.doctorId;
        doctorOrtomatId = doctorOrtomat.id;
        pointsEarned = product.referralPoints || 0;

        this.logger.log(`Found doctor: ${doctorId}, points: ${pointsEarned}`);
      } else {
        this.logger.warn(`Referral code not found: ${data.referralCode}`);
      }
    } else {
      this.logger.log('No referral code provided');
    }

    // Створюємо продаж
    const sale = await this.prisma.sale.create({
      data: {
        productId: data.productId,
        ortomatId: data.ortomatId,
        cellNumber: data.cellNumber,
        amount: data.amount,
        doctorId, // ✅ Обов'язково встановлюємо doctorId
        pointsEarned,
        referralCode: data.referralCode,
        paymentId: data.paymentId,
        customerPhone: data.customerPhone,
        status: 'completed',
        doctorOrtomatId, // ✅ Зберігаємо зв'язок
        completedAt: new Date(),
      },
      include: {
        product: true,
        doctor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    this.logger.log(`Sale created: ${sale.id}, amount: ${sale.amount}`);

    // Оновлюємо статистику в doctorOrtomat якщо є
    if (doctorOrtomatId && pointsEarned) {
      await this.prisma.doctorOrtomat.update({
        where: { id: doctorOrtomatId },
        data: {
          totalSales: { increment: 1 },
          totalPoints: { increment: pointsEarned },
        },
      });
      this.logger.log('Updated doctor ortomat stats');
    }

    // Видаляємо продукт з комірки
    await this.ortomatsService.updateCellProduct(
      data.ortomatId,
      data.cellNumber,
      null,
    );

    return sale;
  }

  async findAll() {
    return this.prisma.sale.findMany({
      include: {
        product: true,
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        ortomat: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.sale.findUnique({
      where: { id },
      include: {
        product: true,
        doctor: true,
        ortomat: true,
      },
    });
  }

  async processPurchase(data: {
    productId: string;
    ortomatId: string;
    cellNumber: number;
    referralCode?: string;
  }) {
    this.logger.log(`Processing purchase: product=${data.productId}, ortomat=${data.ortomatId}`);

    // Знаходимо продукт для отримання ціни
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Перевіряємо, що продукт є в комірці
    const cell = await this.prisma.cell.findFirst({
      where: {
        ortomatId: data.ortomatId,
        number: data.cellNumber,
        productId: data.productId,
      },
    });

    if (!cell) {
      throw new Error('Product not available in this cell');
    }

    // Тут має бути інтеграція з LiqPay
    const paymentId = `payment-${Date.now()}`;

    // Створюємо продаж
    const sale = await this.createSale({
      productId: data.productId,
      ortomatId: data.ortomatId,
      cellNumber: data.cellNumber,
      amount: product.price,
      referralCode: data.referralCode,
      paymentId,
    });

    // Відкриваємо комірку
    await this.ortomatsService.openCell(data.ortomatId, data.cellNumber);

    this.logger.log('Purchase completed');

    return {
      sale,
      success: true,
      message: 'Purchase completed successfully',
    };
  }
}
