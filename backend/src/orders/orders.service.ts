import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrtomatsService } from '../ortomats/ortomats.service';
import { OrtomatsGateway } from '../ortomats/ortomats.gateway';
import { LogsService } from '../logs/logs.service';
import { MonoPaymentService } from '../mono-payment/mono-payment.service';
import { CellManagementService } from '../cell-management/cell-management.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private ortomatsService: OrtomatsService,
    private ortomatsGateway: OrtomatsGateway,
    private logsService: LogsService,
    private monoPaymentService: MonoPaymentService,
    private cellManagement: CellManagementService,
    private telegramBotService: TelegramBotService,
  ) {}

  async createOrder(data: {
    productId: string;
    ortomatId: string;
    referralCode?: string;
    customerPhone?: string;
  }) {
    this.logger.log('Creating order for product and ortomat');

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
    let doctorOrtomatId = null; // ✅ ДОДАНО

    if (data.referralCode) {
      this.logger.log('Looking up referral code');

      const doctorOrtomat = await this.prisma.doctorOrtomat.findUnique({
        where: { referralCode: data.referralCode },
      });

      if (doctorOrtomat) {
        doctorId = doctorOrtomat.doctorId;
        doctorOrtomatId = doctorOrtomat.id; // ✅ ДОДАНО
        pointsEarned = product.referralPoints || 0;

        this.logger.log(`Found doctor referral: ${doctorId}, points: ${pointsEarned}`);
      } else {
        this.logger.warn('Referral code not found');
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
        doctorOrtomatId, // ✅ ДОДАНО
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

    this.logger.log(`Order created: ${sale.orderNumber}`);

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
    this.logger.log(`Processing payment for order: ${orderId}`);

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
      this.logger.warn('Order already completed');
      return {
        success: true,
        message: 'Order already completed',
        orderId: sale.id,
        orderNumber: sale.orderNumber,
        cellNumber: sale.cellNumber,
      };
    }

    this.logger.log('Payment successful (STUB), updating order status');

    const updatedSale = await this.prisma.sale.update({
      where: { id: orderId },
      data: {
        status: 'completed',
        paymentId: `STUB-PAY-${Date.now()}`,
        completedAt: new Date(),
      },
    });

    this.logger.log('Order status updated to completed');

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
      this.logger.log('Inventory updated - cell emptied');
    } catch (error) {
      this.logger.error(`Failed to update inventory: ${error.message}`);
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
    this.logger.log(`Payment callback received with status: ${data.status}`);

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

      this.logger.log('Payment callback processed successfully');

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

      this.logger.warn('Payment failed');

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
    this.logger.log(`Opening cell for order: ${orderId}`);

    // Отримуємо інформацію про замовлення
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

    // Використовуємо централізований сервіс для відкриття комірки
    const deviceId = 'locker-01';

    const result = await this.cellManagement.openCell({
      deviceId,
      cellNumber: order.cellNumber,
      ortomatId: order.ortomatId,
      reason: 'sale',
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        productName: order.product.name,
      },
    });

    // Додаємо productName до результату (для зворотної сумісності)
    return {
      ...result,
      product: order.product.name,
    };
  }

  /**
   * Створення Monobank платежу для замовлення
   * Викликається з frontend після створення замовлення
   */
  async createMonoPayment(orderId: string) {
    this.logger.log(`Creating Monobank payment for order: ${orderId}`);

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

    this.logger.log(`Monobank invoice created: ${invoiceId}`);

    // Зберігаємо Payment запис з УСІМА даними для майбутньої обробки
    await this.prisma.payment.create({
      data: {
        orderId: sale.id,
        amount: sale.amount,
        status: 'pending',
        paymentProvider: 'mono',
        invoiceId: invoiceId,
        pageUrl: pageUrl,
        description: `Оплата: ${sale.product.name}`,
        doctorId: sale.doctorId, // ✅ Додаємо doctorId для Telegram notifications
        paymentDetails: {
          // ✅ Зберігаємо деталі для handleSuccessfulMonoPayment
          productId: sale.productId,
          ortomatId: sale.ortomatId,
          cellNumber: sale.cellNumber,
          productName: sale.product.name,
        },
      },
    });

    this.logger.log(`Payment record saved for order: ${sale.id}`);

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
    this.logger.log(`Monobank webhook received for invoice: ${webhookData.invoiceId}`);

    // Перевіряємо підпис webhook
    const validatedData = await this.monoPaymentService.handleWebhook(
      webhookData,
      signature,
      rawBody,
    );

    this.logger.log('Webhook signature verified');

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
      this.logger.error(`Payment not found for invoice: ${validatedData.invoiceId}`);
      throw new Error('Payment not found');
    }

    const sale = payment.sales[0]; // Отримуємо перше (і єдине) замовлення

    if (!sale) {
      this.logger.error(`Sale not found for payment: ${payment.id}`);
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
      this.logger.log('Payment successful, processing order');

      // Оновлюємо статус платежу
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'success',
          transactionId: validatedData.invoiceId,
        },
      });

      // Оновлюємо статус замовлення
      const updatedSale = await this.prisma.sale.update({
        where: { id: sale.id },
        data: {
          status: 'completed',
          paymentId: payment.id,
          completedAt: new Date(),
        },
      });

      // ✅ ВИПРАВЛЕНО: Оновлюємо статистику doctorOrtomat
      if (updatedSale.doctorOrtomatId && updatedSale.pointsEarned) {
        await this.prisma.doctorOrtomat.update({
          where: { id: updatedSale.doctorOrtomatId },
          data: {
            totalSales: { increment: 1 },
            totalPoints: { increment: updatedSale.pointsEarned },
          },
        });
        this.logger.log(`Updated doctor-ortomat stats: +${updatedSale.pointsEarned} points, +1 sale`);
      }

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
        this.logger.log('Cell opened automatically after payment');
      } catch (error) {
        this.logger.error(`Failed to open cell: ${error.message}`);
        // Не кидаємо помилку, щоб не блокувати webhook
      }

      this.logger.log('Order completed successfully');

      return {
        success: true,
        message: 'Payment processed and cell opened',
        orderNumber: sale.orderNumber,
        cellNumber: sale.cellNumber,
      };
    } else if (validatedData.status === 'failure') {
      this.logger.warn('Payment failed');

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
      this.logger.log(`Payment status: ${validatedData.status}`);

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
    this.logger.log(`Manually checking payment status for order: ${orderId}`);

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

    this.logger.log(`Found payment: ${payment?.id}`);

    if (!payment || !payment.invoiceId) {
      throw new Error('Payment not found or no invoice ID');
    }

    // Перевіряємо що це Monobank платіж
    if (payment.paymentProvider !== 'mono') {
      throw new Error('This is not a Monobank payment');
    }

    this.logger.log(`Checking Monobank invoice: ${payment.invoiceId}`);

    // Перевіряємо статус в Monobank API
    try {
      const invoiceStatus = await this.monoPaymentService.getInvoiceStatus(payment.invoiceId);
      this.logger.log(`Invoice status from Monobank: ${invoiceStatus.status}`);

      if (invoiceStatus.status === 'success') {
        this.logger.log('Payment confirmed, completing order');

        // Оновлюємо статуси
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'completed',
            monoStatus: invoiceStatus.status,
            monoData: invoiceStatus as any,
          },
        });

        const updatedSale = await this.prisma.sale.update({
          where: { id: sale.id },
          data: { status: 'completed' },
        });

        // ✅ ВИПРАВЛЕНО: Оновлюємо статистику doctorOrtomat
        let updatedDoctorOrtomat = null;
        if (updatedSale.doctorOrtomatId && updatedSale.pointsEarned) {
          updatedDoctorOrtomat = await this.prisma.doctorOrtomat.update({
            where: { id: updatedSale.doctorOrtomatId },
            data: {
              totalSales: { increment: 1 },
              totalPoints: { increment: updatedSale.pointsEarned },
            },
          });
          this.logger.log(`Updated doctor-ortomat stats: +${updatedSale.pointsEarned} points, +1 sale`);
        }

        // ✅ TELEGRAM: Відправляємо нотифікацію про продаж
        if (updatedSale.doctorId) {
          try {
            const product = await this.prisma.product.findUnique({
              where: { id: updatedSale.productId },
            });

            const totalPoints = updatedDoctorOrtomat?.totalPoints || 0;

            await this.telegramBotService.sendSaleNotification(updatedSale.doctorId, {
              productName: product?.name || sale.product?.name || 'Товар',
              points: updatedSale.pointsEarned || 0,
              totalPoints: totalPoints,
              amount: updatedSale.amount,
            });
            this.logger.log('📨 Telegram notification sent to doctor');
          } catch (error) {
            this.logger.error(`Failed to send Telegram notification: ${error.message}`);
          }
        }

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
          this.logger.log(`Opening cell #${sale.cellNumber}`);
          await this.ortomatsGateway.openCell(sale.ortomatId, sale.cellNumber, sale.id);
          this.logger.log('Cell opened successfully');
        } catch (error) {
          this.logger.error(`Failed to open cell: ${error.message}`);
        }

        return {
          success: true,
          message: 'Payment confirmed and order completed',
          status: 'completed',
          cellNumber: sale.cellNumber,
        };
      } else if (invoiceStatus.status === 'failure') {
        this.logger.warn('Payment failed according to Monobank');

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
        this.logger.log(`Payment still pending: ${invoiceStatus.status}`);

        return {
          success: true,
          message: 'Payment still pending',
          status: 'pending',
          monoStatus: invoiceStatus.status,
        };
      }
    } catch (error) {
      this.logger.error(`Error checking Monobank status: ${error.message}`);
      throw new Error(`Failed to check payment status: ${error.message}`);
    }
  }
}