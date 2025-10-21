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
        sku: product.sku,
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

  // ✅ Статистика лікаря - ВИПРАВЛЕНО
  async getDoctorStats(doctorId: string) {
    console.log('📊 Getting doctor stats for:', doctorId);

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

    console.log('👤 Doctor:', doctor.email);
    console.log('🏥 Doctor ortomats:', doctor.doctorOrtomats.length);

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

    console.log('💰 Found sales:', sales.length);
    
    // Додатковий дебаг - показуємо перший продаж
    if (sales.length > 0) {
      console.log('📦 First sale:', {
        id: sales[0].id,
        doctorId: sales[0].doctorId,
        amount: sales[0].amount,
        commission: sales[0].commission,
      });
    }

    const totalSales = sales.length;
    const totalEarnings = sales.reduce(
      (sum, sale) => sum + (sale.commission || 0),
      0,
    );

    console.log('📊 Stats:', { totalSales, totalEarnings });

    // Беремо останні 10 продажів для відображення
    const recentSales = sales.slice(0, 10);

    // Статистика по місяцях (PostgreSQL)
    let salesByMonth = [];
    try {
      salesByMonth = await this.prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*)::int as count,
          COALESCE(SUM(commission), 0)::float as earnings
        FROM sales
        WHERE "doctorId" = ${doctorId}
          AND status = 'completed'
        GROUP BY month
        ORDER BY month DESC
        LIMIT 6
      `;
    } catch (error) {
      console.error('Error getting sales by month:', error);
    }

    return {
      totalSales,
      totalEarnings,
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
    let commission = null;
    let doctorOrtomatId = null;

    console.log('💰 Creating sale with data:', {
      productId: data.productId,
      ortomatId: data.ortomatId,
      referralCode: data.referralCode,
    });

    // Якщо є реферальний код, знаходимо лікаря і обчислюємо комісію
    if (data.referralCode) {
      console.log('🔍 Looking for referral code:', data.referralCode);
      
      const doctorOrtomat = await this.prisma.doctorOrtomat.findUnique({
        where: { referralCode: data.referralCode },
        include: {
          doctor: true,
        },
      });

      if (doctorOrtomat) {
        doctorId = doctorOrtomat.doctorId;
        doctorOrtomatId = doctorOrtomat.id;
        commission = (data.amount * doctorOrtomat.commissionPercent) / 100;
        
        console.log('✅ Found doctor:', {
          doctorId,
          doctorEmail: doctorOrtomat.doctor.email,
          commission,
          commissionPercent: doctorOrtomat.commissionPercent,
        });
      } else {
        console.log('⚠️ Referral code not found:', data.referralCode);
      }
    } else {
      console.log('⚠️ No referral code provided');
    }

    // Створюємо продаж
    const sale = await this.prisma.sale.create({
      data: {
        productId: data.productId,
        ortomatId: data.ortomatId,
        cellNumber: data.cellNumber,
        amount: data.amount,
        doctorId, // ✅ Обов'язково встановлюємо doctorId
        commission,
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

    console.log('✅ Sale created:', {
      saleId: sale.id,
      doctorId: sale.doctorId,
      commission: sale.commission,
      amount: sale.amount,
    });

    // Оновлюємо статистику в doctorOrtomat якщо є
    if (doctorOrtomatId) {
      await this.prisma.doctorOrtomat.update({
        where: { id: doctorOrtomatId },
        data: {
          totalSales: { increment: 1 },
          totalEarnings: { increment: commission || 0 },
        },
      });
      console.log('✅ Updated doctor ortomat stats');
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
