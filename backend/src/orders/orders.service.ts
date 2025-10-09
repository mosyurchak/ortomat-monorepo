import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrtomatsService } from '../ortomats/ortomats.service';
import { OrtomatsGateway } from '../ortomats/ortomats.gateway';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private ortomatsService: OrtomatsService,
    private ortomatsGateway: OrtomatsGateway, // ✅ Додали Gateway
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

    // Генеруємо унікальний номер замовлення
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create sale record
    const sale = await this.prisma.sale.create({
      data: {
        orderNumber,
        customerPhone: data.customerPhone,
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
      orderNumber: sale.orderNumber,
      amount: sale.amount,
      currency: 'UAH',
      description: `Purchase: ${sale.product.name}`,
    };
  }

  async handlePaymentCallback(data: {
    orderId: string;
    status: string;
    paymentId: string;
  }) {
    // STUB: Simulate LiqPay callback
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
          completedAt: new Date(),
        },
      });

      // Remove product from cell
      await this.ortomatsService.updateCellProduct(
        sale.ortomatId,
        sale.cellNumber,
        null
      );

      // ✅ ВАЖЛИВО: Команда на відкриття буде відправлена окремо
      // коли користувач натисне кнопку "Open Cell"
      
      return {
        success: true,
        message: 'Payment processed successfully',
        cellNumber: sale.cellNumber,
        orderNumber: sale.orderNumber,
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
        ortomat: true, // ✅ Додали ortomat для deviceId
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

  // ✅ ОНОВЛЕНО: Тепер використовує WebSocket Gateway
  async openCell(orderId: string) {
    const order = await this.prisma.sale.findUnique({
      where: { id: orderId },
      include: {
        ortomat: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'completed') {
      throw new Error('Order is not completed yet');
    }

    // ✅ Використовуємо deviceId з бази даних
    // Для тестування використовуємо 'locker-01'
    // В production треба зберігати deviceId в таблиці ortomats
    const deviceId = 'locker-01'; // TODO: order.ortomat.deviceId в майбутньому
    
    // ✅ Перевіряємо чи контролер онлайн
    if (!this.ortomatsGateway.isDeviceOnline(deviceId)) {
      throw new Error(`Ortomat ${deviceId} is offline. Please try again later.`);
    }

    // ✅ Відправляємо команду через WebSocket
    const success = await this.ortomatsGateway.openCell(
      deviceId,
      order.cellNumber,
      order.id,
    );

    if (!success) {
      throw new Error('Failed to send command to ortomat');
    }

    console.log(`✅ WebSocket command sent to ${deviceId}, cell ${order.cellNumber}`);

    return {
      success: true,
      message: `Cell ${order.cellNumber} opening command sent via WebSocket`,
      cellNumber: order.cellNumber,
      orderNumber: order.orderNumber,
      deviceId: deviceId,
    };
  }
}