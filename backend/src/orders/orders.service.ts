import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrtomatsService } from '../ortomats/ortomats.service';
import { OrtomatsGateway } from '../ortomats/ortomats.gateway';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private ortomatsService: OrtomatsService,
    private ortomatsGateway: OrtomatsGateway,
  ) {}

  async createOrder(data: {
    productId: string;
    ortomatId: string;
    referralCode?: string;
    customerPhone?: string;
  }) {
    console.log('📦 Creating order...', data);

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

    console.log('✅ Order created:', sale.orderNumber);

    return sale;
  }

  async processPayment(orderId: string) {
    console.log('💳 Processing payment for order:', orderId);

    const sale = await this.prisma.sale.findUnique({
      where: { id: orderId },
      include: {
        product: true,
        ortomat: true,
      },
    });

    if (!sale) {
      throw new Error('Order not found');
    }

    if (sale.status === 'completed') {
      console.log('⚠️ Order already completed');
      return {
        success: true,
        message: 'Order already completed',
        orderId: sale.id,
        orderNumber: sale.orderNumber,
        cellNumber: sale.cellNumber,
      };
    }

    // ✅ STUB: Симулюємо успішну оплату та ОДРАЗУ оновлюємо статус
    console.log('✅ Payment successful (STUB), updating order status...');

    const updatedSale = await this.prisma.sale.update({
      where: { id: orderId },
      data: {
        status: 'completed',
        paymentId: `STUB-PAY-${Date.now()}`,
        completedAt: new Date(),
      },
    });

    console.log('✅ Order status updated to completed');

    // Оновлюємо інвентар (видаляємо товар з комірки)
    try {
      await this.ortomatsService.updateCellProduct(
        sale.ortomatId,
        sale.cellNumber,
        null,
      );
      console.log('✅ Inventory updated - cell emptied');
    } catch (error) {
      console.error('❌ Failed to update inventory:', error);
      // Продовжуємо навіть якщо не вдалося оновити інвентар
    }

    return {
      success: true,
      orderId: updatedSale.id,
      orderNumber: updatedSale.orderNumber,
      amount: updatedSale.amount,
      currency: 'UAH',
      description: `Purchase: ${sale.product.name}`,
      cellNumber: updatedSale.cellNumber,
      message: 'Payment processed successfully',
    };
  }

  async handlePaymentCallback(data: {
    orderId: string;
    status: string;
    paymentId: string;
  }) {
    // STUB: Simulate LiqPay callback
    console.log('🔔 Payment callback received:', data);

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
        null,
      );

      console.log('✅ Payment callback processed successfully');

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

      console.log('❌ Payment failed');

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
        ortomat: true,
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

  // ✅ Відкриття комірки через WebSocket (з DEMO режимом)
  async openCell(orderId: string) {
    console.log('🔓 Opening cell for order:', orderId);

    const order = await this.prisma.sale.findUnique({
      where: { id: orderId },
      include: {
        ortomat: true,
        product: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'completed') {
      throw new Error('Order is not completed yet. Please complete payment first.');
    }

    // Для тестування використовуємо deviceId = "locker-01"
    // В production треба зберігати deviceId в таблиці ortomats
    const deviceId = 'locker-01'; // TODO: order.ortomat.deviceId в майбутньому

    console.log('🔍 Checking if device online:', deviceId);

    // Перевіряємо чи контролер онлайн
    const isOnline = this.ortomatsGateway.isDeviceOnline(deviceId);
    
    if (!isOnline) {
      console.log('⚠️ Device offline, using DEMO mode');
      
      // DEMO MODE: Симулюємо успішне відкриття для тестування
      return {
        success: true,
        message: `Cell ${order.cellNumber} opened successfully`,
        cellNumber: order.cellNumber,
        orderNumber: order.orderNumber,
        deviceId: deviceId,
        mode: 'demo',
        note: '🎭 DEMO MODE: ESP32 device is not connected. In production with connected hardware, the physical cell lock would open automatically.',
        product: order.product.name,
      };
    }

    console.log('📤 Sending open command via WebSocket...');

    // Відправляємо команду через WebSocket
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
      mode: 'production',
      product: order.product.name,
    };
  }
}