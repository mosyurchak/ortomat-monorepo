import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrtomatsService } from '../ortomats/ortomats.service';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private ortomatsService: OrtomatsService,
  ) {}

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
      },
      include: {
        product: true,
        doctor: true,
      },
    });

    // Видаляємо продукт з комірки
    await this.ortomatsService.updateCellProduct(data.ortomatId, data.cellNumber, null);

    return sale;
  }

  async findAll() {
    return this.prisma.sale.findMany({
      include: {
        product: true,
        doctor: true,
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
      },
    });
  }

  async processPurchase(data: {
    productId: string;
    ortomatId: string;
    cellNumber: number;
    referralCode?: string;
  }) {
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

    return {
      sale,
      success: true,
      message: 'Purchase completed successfully',
    };
  }
}