import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrtomatsService } from '../ortomats/ortomats.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private ortomatsService: OrtomatsService,
  ) {}

  async createOrder(data: {
    productId: string;
    ortomatId: string;
    referralCode?: string;
    customerPhone?: string;
  }) {
    // Find product and get price
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Find available cell with this product
    const cell = await this.prisma.cell.findFirst({
      where: {
        ortomatId: data.ortomatId,
        productId: data.productId,
      },
    });

    if (!cell) {
      throw new Error('Product not available in this ortomat');
    }

    // Find doctor if referral code provided
    let doctorId = null;
    let commission = null;

    if (data.referralCode) {
      const doctorOrtomat = await this.prisma.doctorOrtomat.findUnique({
        where: { referralCode: data.referralCode },
      });

      if (doctorOrtomat) {
        doctorId = doctorOrtomat.doctorId;
        commission = (product.price * doctorOrtomat.commissionPercent) / 100;
      }
    }

    // ⭐ Генеруємо унікальний номер замовлення
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create sale record
    const sale = await this.prisma.sale.create({
      data: {
        orderNumber,              // ⭐ НОВОЕ
        customerPhone: data.customerPhone, // ⭐ НОВОЕ
        productId: data.productId,
        ortomatId: data.ortomatId,
        cellNumber: cell.number,
        amount: product.price,
        doctorId,
        commission,
        referralCode: data.referralCode,
        status: 'pending',
      },
      include: {
        product: true,
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return sale;
  }

  async processPayment(orderId: string) {
    // STUB: Simulate LiqPay payment
    // In real implementation, this would:
    // 1. Generate LiqPay form data
    // 2. Return signature and data for LiqPay widget
    
    const sale = await this.prisma.sale.findUnique({
      where: { id: orderId },
      include: {
        product: true,
      },
    });

    if (!sale) {
      throw new Error('Order not found');
    }

    // Simulate LiqPay response
    return {
      success: true,
      orderId: sale.id,
      orderNumber: sale.orderNumber, // ⭐ ДОДАЛИ
      amount: sale.amount,
      currency: 'UAH',
      description: `Purchase: ${sale.product.name}`,
      // In real implementation:
      // data: base64EncodedData,
      // signature: liqpaySignature,
    };
  }

  async handlePaymentCallback(data: {
    orderId: string;
    status: string;
    paymentId: string;
  }) {
    // STUB: Simulate LiqPay callback
    // In real implementation, verify signature first
    
    const sale = await this.prisma.sale.findUnique({
      where: { id: data.orderId },
    });

    if (!sale) {
      throw new Error('Order not found');
    }

    if (data.status === 'success') {
      // Update sale status
      await this.prisma.sale.update({
        where: { id: data.orderId },
        data: {
          status: 'completed',
          paymentId: data.paymentId,
          completedAt: new Date(), // ⭐ ДОДАЛИ
        },
      });

      // Remove product from cell
      await this.ortomatsService.updateCellProduct(
        sale.ortomatId,
        sale.cellNumber,
        null
      );

      // Open cell (stub - in reality, send command to ortomat)
      await this.ortomatsService.openCell(sale.ortomatId, sale.cellNumber);

      return {
        success: true,
        message: 'Payment processed successfully',
        cellNumber: sale.cellNumber,
        orderNumber: sale.orderNumber, // ⭐ ДОДАЛИ для Frontend
      };
    } else {
      // Payment failed
      await this.prisma.sale.update({
        where: { id: data.orderId },
        data: {
          status: 'failed',
        },
      });

      return {
        success: false,
        message: 'Payment failed',
      };
    }
  }

  async getOrder(id: string) {
    return this.prisma.sale.findUnique({
      where: { id },
      include: {
        product: true,
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async getAllOrders() {
    return this.prisma.sale.findMany({
      include: {
        product: true,
        doctor: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async openCell(orderId: string) {
  const order = await this.prisma.sale.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status !== 'completed') {
    throw new Error('Order is not completed yet');
  }

  // TODO: Тут буде інтеграція з реальним API ортомату
  // Поки що просто логуємо
  console.log(`Opening cell ${order.cellNumber} for order ${order.orderNumber}`);

  return {
    success: true,
    message: `Cell ${order.cellNumber} is opening`,
    cellNumber: order.cellNumber,
  };
  }
}