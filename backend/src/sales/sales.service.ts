import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrtomatsService } from '../ortomats/ortomats.service';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private ortomatsService: OrtomatsService,
  ) {}

  // ✅ Admin статистика
  async getAdminStats() {
    console.log('📊 Getting admin stats...');

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
      where: { role: 'DOCTOR' }, // ✅ Uppercase
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
            commission: true,
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
        totalEarnings: doctor.sales.reduce(
          (sum, sale) => sum + (sale.commission || 0),
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
        category: product.category,
        salesCount: product._count.sales,
        revenue: product.sales.reduce((sum, sale) => sum + sale.amount, 0),
      }))
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5);

    console.log('✅ Admin stats calculated');

    return {
      totalUsers,
      totalOrtomats,
      totalSales,
      totalRevenue: revenueData._sum.amount || 0,
      topDoctors,
      topProducts,
    };
  }

  // ✅ Статистика лікаря
  async getDoctorStats(doctorId: string) {
    console.log('📊 Getting doctor stats for:', doctorId);

    const sales = await this.prisma.sale.findMany({
      where: {
        doctorId,
        status: 'completed',
      },
      include: {
        product: true,
        ortomat: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const totalSales = sales.length;
    const totalEarnings = sales.reduce(
      (sum, sale) => sum + (sale.commission || 0),
      0,
    );

    // Статистика по місяцях (PostgreSQL)
    const salesByMonth = await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*)::int as count,
        COALESCE(SUM(commission), 0)::float as earnings
      FROM "Sale"
      WHERE "doctorId" = ${doctorId}
        AND status = 'completed'
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `;

    return {
      totalSales,
      totalEarnings,
      recentSales: sales,
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
  }) {
    let doctorId = null;
    let commission = null;

    // Якщо є реферальний код, знаходимо лікаря і обчислюємо комісію
    if (data.referralCode) {
      const doctorOrtomat = await this.prisma.doctorOrtomat.findUnique({
        where: { referralCode: data.referralCode },
      });

      if (doctorOrtomat) {
        doctorId = doctorOrtomat.doctorId;
        commission = (data.amount * doctorOrtomat.commissionPercent) / 100;
      }
    }

    // Створюємо продаж
    const sale = await this.prisma.sale.create({
      data: {
        productId: data.productId,
        ortomatId: data.ortomatId,
        cellNumber: data.cellNumber,
        amount: data.amount,
        doctorId,
        commission,
        referralCode: data.referralCode,
        paymentId: data.paymentId,
        status: 'completed',
      },
      include: {
        product: true,
        doctor: true,
      },
    });

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
    console.log('💰 Processing purchase...', data);

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

    console.log('✅ Purchase completed');

    return {
      sale,
      success: true,
      message: 'Purchase completed successfully',
    };
  }
}