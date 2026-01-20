import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.user.create({
      data,
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        createdAt: true,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        createdAt: true,
        doctorOrtomats: {
          include: {
            ortomat: true,
          },
        },
        courierOrtomats: {
          include: {
            ortomat: true,
          },
        },
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async getDoctorStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'DOCTOR') {
      throw new NotFoundException('Doctor not found');
    }

    const doctorOrtomat = await this.prisma.doctorOrtomat.findFirst({
      where: { doctorId: userId },
      include: {
        ortomat: true,
      },
    });

    if (!doctorOrtomat) {
      return {
        totalSales: 0,
        totalEarnings: 0,
        recentSales: [],
        ortomat: null,
        referralCode: null,
        commissionRate: 0,
      };
    }

    const sales = await this.prisma.sale.findMany({
      where: {
        referralCode: doctorOrtomat.referralCode,
        status: 'completed',
      },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalSales = sales.length;
    const totalEarnings = sales.reduce((sum, sale) => sum + (sale.commission || 0), 0);

    const recentSales = sales.slice(0, 10).map(sale => ({
      id: sale.id,
      orderNumber: sale.orderNumber,
      productName: sale.product?.name,
      amount: sale.amount,
      commission: sale.commission,
      createdAt: sale.createdAt,
    }));

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const salesByMonth = {};
    sales
      .filter(sale => new Date(sale.createdAt) >= sixMonthsAgo)
      .forEach(sale => {
        const month = new Date(sale.createdAt).toISOString().slice(0, 7);
        if (!salesByMonth[month]) {
          salesByMonth[month] = {
            month,
            sales: 0,
            revenue: 0,
            commission: 0,
          };
        }
        salesByMonth[month].sales += 1;
        salesByMonth[month].revenue += sale.amount || 0;
        salesByMonth[month].commission += sale.commission || 0;
      });

    return {
      totalSales,
      totalEarnings: totalEarnings.toFixed(2),
      recentSales,
      monthlyStats: Object.values(salesByMonth),
      ortomat: {
        id: doctorOrtomat.ortomat.id,
        name: doctorOrtomat.ortomat.name,
        address: doctorOrtomat.ortomat.address,
      },
      referralCode: doctorOrtomat.referralCode,
      commissionRate: doctorOrtomat.commissionPercent,
    };
  }

  async getCourierOrtomats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'COURIER') {
      throw new NotFoundException('Courier not found');
    }

    const courierOrtomats = await this.prisma.courierOrtomat.findMany({
      where: { courierId: userId },
      include: {
        ortomat: {
          include: {
            cells: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    return courierOrtomats.map(co => {
      const emptyCells = co.ortomat.cells.filter(cell => !cell.productId || !cell.isAvailable);
      const totalCells = co.ortomat.cells.length;
      const fillRate = ((totalCells - emptyCells.length) / totalCells * 100).toFixed(0);

      return {
        id: co.id,
        ortomat: {
          id: co.ortomat.id,
          name: co.ortomat.name,
          address: co.ortomat.address,
          totalCells: co.ortomat.totalCells,
        },
        emptyCellsCount: emptyCells.length,
        fillRate: parseInt(fillRate),
        status: co.status,
      };
    });
  }

  async getAdminStats() {
    // Загальна кількість користувачів по ролях
    const userStats = await this.prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });

    const usersByRole = {
      ADMIN: 0,
      DOCTOR: 0,
      COURIER: 0,
    };

    userStats.forEach(stat => {
      usersByRole[stat.role] = stat._count;
    });

    // Загальна статистика продажів
    const salesStats = await this.prisma.sale.aggregate({
      where: {
        status: 'completed',
      },
      _sum: {
        amount: true,
        commission: true,
      },
      _count: true,
    });

    // Продажі за останній місяць
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const monthlySales = await this.prisma.sale.aggregate({
      where: {
        status: 'completed',
        createdAt: {
          gte: lastMonth,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // Топ 5 лікарів за заробітком
    const topDoctors = await this.prisma.doctorOrtomat.findMany({
      orderBy: {
        totalEarnings: 'desc',
      },
      take: 5,
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        ortomat: {
          select: {
            name: true,
          },
        },
      },
    });

    // Топ 5 товарів за продажами
    const topProducts = await this.prisma.sale.groupBy({
      by: ['productId'],
      where: {
        status: 'completed',
      },
      _count: true,
      _sum: {
        amount: true,
      },
      orderBy: {
        _count: {
          productId: 'desc',
        },
      },
      take: 5,
    });

    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });
        return {
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
          },
          salesCount: item._count,
          totalRevenue: item._sum.amount,
        };
      })
    );

    // Статистика по ортоматах
    const ortomats = await this.prisma.ortomat.findMany({
      include: {
        cells: true,
      },
    });

    const ortomatStats = ortomats.map(ortomat => {
      const filledCells = ortomat.cells.filter(cell => cell.productId && cell.isAvailable).length;
      const totalCells = ortomat.cells.length;
      return {
        id: ortomat.id,
        name: ortomat.name,
        fillRate: Math.round((filledCells / totalCells) * 100),
        status: ortomat.status,
      };
    });

    return {
      users: {
        total: usersByRole.ADMIN + usersByRole.DOCTOR + usersByRole.COURIER,
        byRole: usersByRole,
      },
      sales: {
        total: salesStats._count,
        totalRevenue: salesStats._sum.amount || 0,
        totalCommission: salesStats._sum.commission || 0,
        thisMonth: {
          count: monthlySales._count,
          revenue: monthlySales._sum.amount || 0,
        },
      },
      topDoctors: topDoctors.map(d => ({
        doctor: {
          name: `${d.doctor.firstName} ${d.doctor.lastName}`,
          email: d.doctor.email,
        },
        ortomat: d.ortomat.name,
        totalSales: d.totalSales,
        totalEarnings: parseFloat(d.totalEarnings.toFixed(2)),
      })),
      topProducts: topProductsWithDetails,
      ortomats: ortomatStats,
    };
  }

  /**
   * Отримати всіх лікарів з їх ортоматами
   */
  async getDoctors() {
    const doctors = await this.prisma.user.findMany({
      where: {
        role: 'DOCTOR',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        isVerified: true,
        createdAt: true,
        doctorOrtomats: {
          include: {
            ortomat: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return doctors;
  }

  /**
   * Отримати всіх кур'єрів з їх ортоматами
   */
  async getCouriers() {
    const couriers = await this.prisma.user.findMany({
      where: {
        role: 'COURIER',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        isVerified: true,
        createdAt: true,
        courierOrtomats: {
          include: {
            ortomat: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Перетворюємо courierOrtomats в ortomats для сумісності з frontend
    return couriers.map(courier => ({
      ...courier,
      ortomats: courier.courierOrtomats.map(co => co.ortomat),
      courierOrtomats: undefined, // Видаляємо оригінальне поле
    }));
  }

  /**
   * Створити лікаря
   */
  async createDoctor(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    phone: string;
    ortomatId?: string;
    commissionPercent?: number;
  }) {
    const bcrypt = require('bcryptjs');

    // Перевірка чи email вільний
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Хешування паролю
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Створення лікаря
    const doctor = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        role: 'DOCTOR',
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || null,
        phone: data.phone,
        isVerified: true,
      },
    });

    // Призначити ортомат з referralCode
    if (data.ortomatId) {
      const referralCode = `DOC${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      await this.prisma.doctorOrtomat.create({
        data: {
          doctorId: doctor.id,
          ortomatId: data.ortomatId,
          referralCode,
          commissionPercent: data.commissionPercent || 10,
        },
      });
    }

    return {
      ...doctor,
      password: undefined,
    };
  }

  /**
   * Оновити лікаря
   */
  async updateDoctor(
    id: string,
    data: {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      middleName?: string;
      phone?: string;
      ortomatId?: string;
      commissionPercent?: number;
    }
  ) {
    const bcrypt = require('bcryptjs');

    const doctor = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!doctor || doctor.role !== 'DOCTOR') {
      throw new NotFoundException('Doctor not found');
    }

    // Перевірка email
    if (data.email && data.email !== doctor.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new Error('Email already exists');
      }
    }

    // Підготовка даних для оновлення
    const updateData: any = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName,
      phone: data.phone,
    };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    // Оновлення користувача
    const updatedDoctor = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Оновлення призначення ортомату
    if (data.ortomatId !== undefined) {
      // Видаляємо старі призначення
      await this.prisma.doctorOrtomat.deleteMany({
        where: { doctorId: id },
      });

      // Додаємо нове
      if (data.ortomatId) {
        const referralCode = `DOC${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        await this.prisma.doctorOrtomat.create({
          data: {
            doctorId: id,
            ortomatId: data.ortomatId,
            referralCode,
            commissionPercent: data.commissionPercent || 10,
          },
        });
      }
    }

    return {
      ...updatedDoctor,
      password: undefined,
    };
  }

  /**
   * Видалити лікаря
   */
  async deleteDoctor(id: string) {
    const doctor = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!doctor || doctor.role !== 'DOCTOR') {
      throw new NotFoundException('Doctor not found');
    }

    // Видаляємо призначення ортоматів
    await this.prisma.doctorOrtomat.deleteMany({
      where: { doctorId: id },
    });

    // Видаляємо лікаря
    await this.prisma.user.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Doctor deleted successfully',
    };
  }
}