import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrtomatsService } from '../ortomats/ortomats.service';
import { OrtomatsGateway } from '../ortomats/ortomats.gateway';
import { LogsService } from '../logs/logs.service';
import { MonoPaymentService } from '../mono-payment/mono-payment.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private ortomatsService: OrtomatsService,
    private ortomatsGateway: OrtomatsGateway,
    private logsService: LogsService,
    private monoPaymentService: MonoPaymentService, // Додано Monobank сервіс
  ) {}

  async createOrder(data: {
    productId: string;
    ortomatId: string;
    referralCode?: string;
    customerPhone?: string;
  }) {
    console.log('📦 Creating order...', data);

    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const cell = await this.prisma.cell.findFirst({
      where: {
        ortomatId: data.ortomatId,
        productId: data.productId,
      },
    });

    if (!cell) {
      throw new Error('Product not available in this ortomat');
    }

    let doctorId = null;
    let pointsEarned = null;

    if (data.referralCode) {
      const doctorOrtomat = await this.prisma.doctorOrtomat.findUnique({
        where: { referralCode: data.referralCode },
      });

      if (doctorOrtomat) {
        doctorId = doctorOrtomat.doctorId;
        pointsEarned = product.referralPoints || 0;
      }
    }

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const sale = await this.prisma.sale.create({
      data: {
        orderNumber,
        customerPhone: data.customerPhone,
        productId: data.productId,
        ortomatId: data.ortomatId,
        cellNumber: cell.number,
        amount: product.price,
        doctorId,
        pointsEarned,
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

    // ✅ ДОДАНО: Логування
    await this.logsService.logOrderCreated({
      orderId: sale.id,
      amount: sale.amount,
      productId: data.productId,
      ortomatId: data.ortomatId,
      userId: sale.doctorId || undefined,
    });

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

    // ✅ ДОДАНО: Логування успішної оплати
    await this.logsService.logPaymentSuccess({
      orderId: updatedSale.id,
      amount: updatedSale.amount,
      ortomatId: sale.ortomatId,
    });

    try {
      await this.ortomatsService.updateCellProduct(
        sale.ortomatId,
        sale.cellNumber,
        null,
      );
      console.log('✅ Inventory updated - cell emptied');
    } catch (error) {
      console.error('❌ Failed to update inventory:', error);
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
    console.log('📞 Payment callback received:', data);

    const sale = await this.prisma.sale.findUnique({
      where: { id: data.orderId },
    });

    if (!sale) {
      throw new Error('Order not found');
    }

    if (data.status === 'success') {
      await this.prisma.sale.update({
        where: { id: data.orderId },
        data: {
          status: 'completed',
          paymentId: data.paymentId,
          completedAt: new Date(),
        },
      });

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

  async openCell(orderId: string) {
    console.log('🔐 Opening cell for order:', orderId);

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

    const deviceId = 'locker-01';

    console.log('🔍 Checking if device online:', deviceId);

    const isOnline = this.ortomatsGateway.isDeviceOnline(deviceId);

    if (!isOnline) {
      console.log('⚠️ Device offline, using DEMO mode');

      // Оновлюємо статус комірки - залишаємо productId, але позначаємо як порожню
      await this.prisma.cell.update({
        where: {
          ortomatId_number: {
            ortomatId: order.ortomatId,
            number: order.cellNumber,
          },
        },
        data: {
          // productId залишається (не видаляємо!) - товар все ще призначений комірці
          isAvailable: true, // true = порожня (синя - товар призначений, але комірка порожня)
        },
      });

      console.log(`✅ Cell #${order.cellNumber} marked as empty (product dispensed)`);


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

    const success = await this.ortomatsGateway.openCell(
      deviceId,
      order.cellNumber,
      order.id,
    );

    if (!success) {
      throw new Error('Failed to send command to ortomat');
    }

    console.log(`✅ WebSocket command sent to ${deviceId}, cell ${order.cellNumber}`);

    // ✅ ДОДАНО: Логування відкриття комірки
    await this.logsService.createLog({
      type: 'WEBSOCKET_COMMAND',
      category: 'system',
      message: `Opening cell #${order.cellNumber} for order ${order.orderNumber}`,
      ortomatId: order.ortomatId,
      cellNumber: order.cellNumber,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        deviceId,
        mode: isOnline ? 'production' : 'demo',
      },
      severity: 'INFO',
    });

    // Оновлюємо статус комірки - залишаємо productId, але позначаємо як порожню
    await this.prisma.cell.update({
      where: {
        ortomatId_number: {
          ortomatId: order.ortomatId,
          number: order.cellNumber,
        },
      },
      data: {
        // productId залишається (не видаляємо!) - товар все ще призначений комірці
        isAvailable: true, // true = порожня (синя - товар призначений, але комірка порожня)
      },
    });

    console.log(`✅ Cell #${order.cellNumber} marked as empty (product dispensed)`);

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

  /**
   * Створення Monobank платежу для замовлення
   * Викликається з frontend після створення замовлення
   */
  async createMonoPayment(orderId: string) {
    console.log('💳 Creating Monobank payment for order:', orderId);

    // Отримуємо замовлення
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
      throw new Error('Order already completed');
    }

    // Створюємо invoice в Monobank
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

    const { invoiceId, pageUrl } = await this.monoPaymentService.createInvoice({
      amount: Math.round(sale.amount * 100), // Конвертуємо в копійки
      ccy: 980, // UAH
      merchantPaymInfo: {
        reference: sale.orderNumber,
        destination: `Оплата: ${sale.product.name}`,
        basketOrder: [
          {
            name: sale.product.name,
            qty: 1,
            sum: Math.round(sale.amount * 100),
          },
        ],
      },
      redirectUrl: `${frontendUrl}/payment/success?orderId=${sale.id}`,
      webHookUrl: `${backendUrl}/api/orders/mono-webhook`,
    });

    console.log('✅ Monobank invoice created:', invoiceId);

    // Зберігаємо Payment запис
    await this.prisma.payment.create({
      data: {
        orderId: sale.id,
        amount: sale.amount,
        status: 'pending',
        paymentProvider: 'mono',
        invoiceId: invoiceId,
        pageUrl: pageUrl,
        description: `Оплата: ${sale.product.name}`,
      },
    });

    console.log('✅ Payment record saved to database');

    // Логування
    await this.logsService.createLog({
      type: 'PAYMENT_INITIATED',
      category: 'payment',
      message: `Monobank invoice created for order ${sale.orderNumber}`,
      ortomatId: sale.ortomatId,
      metadata: {
        orderId: sale.id,
        invoiceId,
        amount: sale.amount,
      },
      severity: 'INFO',
    });

    return {
      success: true,
      invoiceId,
      pageUrl, // URL для перенаправлення користувача
      orderNumber: sale.orderNumber,
      amount: sale.amount,
    };
  }

  /**
   * Обробка webhook від Monobank
   * Викликається автоматично Monobank при зміні статусу платежу
   */
  async handleMonoWebhook(webhookData: any, signature: string, rawBody: string | Buffer) {
    console.log('📞 Monobank webhook received for invoice:', webhookData.invoiceId);

    // Перевіряємо підпис webhook
    const validatedData = await this.monoPaymentService.handleWebhook(
      webhookData,
      signature,
      rawBody,
    );

    console.log('✅ Webhook signature verified');

    // Знаходимо платіж за invoiceId
    const payment = await this.prisma.payment.findUnique({
      where: { invoiceId: validatedData.invoiceId },
      include: {
        sales: {
          include: {
            product: true,
            ortomat: true,
          },
        },
      },
    });

    if (!payment) {
      console.error('❌ Payment not found for invoice:', validatedData.invoiceId);
      throw new Error('Payment not found');
    }

    const sale = payment.sales[0]; // Отримуємо перше (і єдине) замовлення

    if (!sale) {
      console.error('❌ Sale not found for payment:', payment.id);
      throw new Error('Sale not found');
    }

    // Оновлюємо Payment запис
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        monoStatus: validatedData.status,
        monoData: validatedData as any,
        updatedAt: new Date(),
      },
    });

    // Обробляємо різні статуси
    if (validatedData.status === 'success') {
      console.log('✅ Payment successful! Processing order...');

      // Оновлюємо статус платежу
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'success',
          transactionId: validatedData.invoiceId,
        },
      });

      // Оновлюємо статус замовлення
      await this.prisma.sale.update({
        where: { id: sale.id },
        data: {
          status: 'completed',
          paymentId: payment.id,
          completedAt: new Date(),
        },
      });

      // Звільняємо комірку
      await this.ortomatsService.updateCellProduct(
        sale.ortomatId,
        sale.cellNumber,
        null,
      );

      // Логування успішної оплати
      await this.logsService.logPaymentSuccess({
        orderId: sale.id,
        amount: sale.amount,
        ortomatId: sale.ortomatId,
      });

      // Відкриваємо комірку автоматично
      try {
        await this.openCell(sale.id);
        console.log('✅ Cell opened automatically after payment');
      } catch (error) {
        console.error('❌ Failed to open cell:', error.message);
        // Не кидаємо помилку, щоб не блокувати webhook
      }

      console.log('✅ Order completed successfully');

      return {
        success: true,
        message: 'Payment processed and cell opened',
        orderNumber: sale.orderNumber,
        cellNumber: sale.cellNumber,
      };
    } else if (validatedData.status === 'failure') {
      console.log('❌ Payment failed');

      // Оновлюємо статуси на failed
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      });

      await this.prisma.sale.update({
        where: { id: sale.id },
        data: { status: 'failed' },
      });

      // Логування
      await this.logsService.createLog({
        type: 'PAYMENT_FAILED',
        category: 'payment',
        message: `Payment failed for order ${sale.orderNumber}`,
        ortomatId: sale.ortomatId,
        metadata: {
          orderId: sale.id,
          reason: validatedData.failureReason || 'Unknown',
        },
        severity: 'WARNING',
      });

      return {
        success: false,
        message: 'Payment failed',
      };
    } else {
      console.log(`ℹ️ Payment status: ${validatedData.status}`);

      return {
        success: true,
        message: `Payment status updated to ${validatedData.status}`,
      };
    }
  }

  /**
   * Ручна перевірка статусу оплати в Monobank
   * Використовується якщо webhook не спрацював
   */
  async checkPaymentStatus(orderId: string) {
    console.log(`🔍 Manually checking payment status for order: ${orderId}`);

    // Знаходимо замовлення
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
      return {
        success: true,
        message: 'Order already completed',
        status: 'completed',
      };
    }

    // Шукаємо Payment по orderId (не через sale.payment, бо може не бути прив'язки)
    const payment = await this.prisma.payment.findFirst({
      where: { orderId: orderId },
      orderBy: { createdAt: 'desc' },
    });

    console.log('💳 Found payment:', payment);

    if (!payment || !payment.invoiceId) {
      throw new Error('Payment not found or no invoice ID');
    }

    // Перевіряємо що це Monobank платіж
    if (payment.paymentProvider !== 'mono') {
      throw new Error('This is not a Monobank payment');
    }

    console.log(`📄 Checking Monobank invoice: ${payment.invoiceId}`);

    // Перевіряємо статус в Monobank API
    try {
      const invoiceStatus = await this.monoPaymentService.getInvoiceStatus(payment.invoiceId);
      console.log('✅ Invoice status from Monobank:', invoiceStatus);

      if (invoiceStatus.status === 'success') {
        console.log('💰 Payment confirmed! Completing order...');

        // Оновлюємо статуси
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'completed',
            monoStatus: invoiceStatus.status,
            monoData: invoiceStatus as any,
          },
        });

        await this.prisma.sale.update({
          where: { id: sale.id },
          data: { status: 'completed' },
        });

        // Логування
        await this.logsService.createLog({
          type: 'PAYMENT_SUCCESS',
          category: 'payment',
          message: `Payment manually confirmed for order ${sale.orderNumber}`,
          ortomatId: sale.ortomatId,
          metadata: {
            orderId: sale.id,
            invoiceId: payment.invoiceId,
            amount: sale.amount,
            manualCheck: true,
          },
          severity: 'INFO',
        });

        // Відкриваємо комірку
        try {
          console.log(`🔓 Opening cell #${sale.cellNumber}...`);
          await this.ortomatsGateway.openCell(sale.ortomatId, sale.cellNumber, sale.id);
          console.log('✅ Cell opened successfully');
        } catch (error) {
          console.error('❌ Failed to open cell:', error.message);
        }

        return {
          success: true,
          message: 'Payment confirmed and order completed',
          status: 'completed',
          cellNumber: sale.cellNumber,
        };
      } else if (invoiceStatus.status === 'failure') {
        console.log('❌ Payment failed according to Monobank');

        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'failed', monoStatus: invoiceStatus.status },
        });

        await this.prisma.sale.update({
          where: { id: sale.id },
          data: { status: 'failed' },
        });

        return {
          success: false,
          message: 'Payment failed',
          status: 'failed',
        };
      } else {
        console.log(`ℹ️ Payment still pending: ${invoiceStatus.status}`);

        return {
          success: true,
          message: 'Payment still pending',
          status: 'pending',
          monoStatus: invoiceStatus.status,
        };
      }
    } catch (error) {
      console.error('❌ Error checking Monobank status:', error.message);
      throw new Error(`Failed to check payment status: ${error.message}`);
    }
  }
}