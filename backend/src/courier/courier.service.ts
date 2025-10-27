// backend/src/courier/courier.service.ts

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class CourierService {
  constructor(private prisma: PrismaService) {}

  /**
   * Створити кур'єра (тільки Admin)
   */
  async createCourier(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    phone: string;
    ortomatIds?: string[]; // ✅ Призначити ортомати
  }) {
    // Перевірка чи email вільний
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    // Перевірка чи ортомати не зайняті іншими кур'єрами
    if (data.ortomatIds && data.ortomatIds.length > 0) {
      const occupiedOrtomats = await this.prisma.courierOrtomat.findMany({
        where: {
          ortomatId: { in: data.ortomatIds },
          status: 'active',
        },
        include: {
          courier: true,
          ortomat: true,
        },
      });

      if (occupiedOrtomats.length > 0) {
        const ortomatNames = occupiedOrtomats.map(o => o.ortomat.name).join(', ');
        throw new BadRequestException(
          `Ортомати вже призначені іншому кур'єру: ${ortomatNames}`
        );
      }
    }

    // Хешування паролю
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Створення кур'єра
    const courier = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        role: 'COURIER',
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || null,
        phone: data.phone,
        isVerified: true, // ✅ Кур'єри створюються адміном, автоматично verified
      },
    });

    // Призначити ортомати
    if (data.ortomatIds && data.ortomatIds.length > 0) {
      await Promise.all(
        data.ortomatIds.map((ortomatId) =>
          this.prisma.courierOrtomat.create({
            data: {
              courierId: courier.id,
              ortomatId,
              status: 'active',
            },
          })
        )
      );
    }

    return {
      ...courier,
      password: undefined, // Не повертаємо пароль
    };
  }

  /**
   * Отримати всіх кур'єрів
   */
  async getAllCouriers() {
    const couriers = await this.prisma.user.findMany({
      where: { role: 'COURIER' },
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
          where: { status: 'active' },
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
      orderBy: { createdAt: 'desc' },
    });

    return couriers.map(courier => ({
      ...courier,
      ortomats: courier.courierOrtomats.map(co => co.ortomat),
      courierOrtomats: undefined,
    }));
  }

  /**
   * Отримати одного кур'єра
   */
  async getCourier(id: string) {
    const courier = await this.prisma.user.findUnique({
      where: { id, role: 'COURIER' },
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
          where: { status: 'active' },
          include: {
            ortomat: true,
          },
        },
      },
    });

    if (!courier) {
      throw new NotFoundException('Courier not found');
    }

    return {
      ...courier,
      ortomats: courier.courierOrtomats.map(co => co.ortomat),
      courierOrtomats: undefined,
    };
  }

  /**
   * Оновити кур'єра
   */
  async updateCourier(
    id: string,
    data: {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      middleName?: string;
      phone?: string;
      ortomatIds?: string[]; // ✅ Оновити призначені ортомати
    }
  ) {
    const courier = await this.prisma.user.findUnique({
      where: { id, role: 'COURIER' },
    });

    if (!courier) {
      throw new NotFoundException('Courier not found');
    }

    // Перевірка email якщо змінюється
    if (data.email && data.email !== courier.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }
    }

    // Оновлення даних
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

    const updatedCourier = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Оновити ортомати якщо передано
    if (data.ortomatIds !== undefined) {
      // Отримати поточні ортомати кур'єра
      const currentOrtomats = await this.prisma.courierOrtomat.findMany({
        where: { courierId: id, status: 'active' },
        select: { ortomatId: true },
      });

      const currentOrtomatIds = currentOrtomats.map(co => co.ortomatId);

      // Перевірка чи нові ортомати не зайняті
      const newOrtomatIds = data.ortomatIds.filter(
        ortomatId => !currentOrtomatIds.includes(ortomatId)
      );

      if (newOrtomatIds.length > 0) {
        const occupiedOrtomats = await this.prisma.courierOrtomat.findMany({
          where: {
            ortomatId: { in: newOrtomatIds },
            courierId: { not: id },
            status: 'active',
          },
          include: { ortomat: true },
        });

        if (occupiedOrtomats.length > 0) {
          const ortomatNames = occupiedOrtomats.map(o => o.ortomat.name).join(', ');
          throw new BadRequestException(
            `Ортомати вже призначені іншому кур'єру: ${ortomatNames}`
          );
        }
      }

      // Видалити старі призначення
      await this.prisma.courierOrtomat.deleteMany({
        where: { courierId: id },
      });

      // Створити нові призначення
      if (data.ortomatIds.length > 0) {
        await Promise.all(
          data.ortomatIds.map((ortomatId) =>
            this.prisma.courierOrtomat.create({
              data: {
                courierId: id,
                ortomatId,
                status: 'active',
              },
            })
          )
        );
      }
    }

    return {
      ...updatedCourier,
      password: undefined,
    };
  }

  /**
   * Видалити кур'єра
   */
  async deleteCourier(id: string) {
    const courier = await this.prisma.user.findUnique({
      where: { id, role: 'COURIER' },
    });

    if (!courier) {
      throw new NotFoundException('Courier not found');
    }

    // Prisma автоматично видалить всі зв'язки через onDelete: Cascade
    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'Courier deleted successfully' };
  }

  /**
   * Отримати доступні ортомати для призначення
   */
  async getAvailableOrtomats() {
    // Ортомати які не призначені жодному кур'єру
    const assignedOrtomatIds = await this.prisma.courierOrtomat.findMany({
      where: { status: 'active' },
      select: { ortomatId: true },
    });

    const assignedIds = assignedOrtomatIds.map(co => co.ortomatId);

    return this.prisma.ortomat.findMany({
      where: {
        id: { notIn: assignedIds },
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
