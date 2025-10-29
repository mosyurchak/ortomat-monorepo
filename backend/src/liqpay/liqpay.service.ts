import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class LiqPayService {
  private readonly logger = new Logger(LiqPayService.name);
  private publicKey: string;
  private privateKey: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {
    this.publicKey = this.configService.get<string>('LIQPAY_PUBLIC_KEY');
    this.privateKey = this.configService.get<string>('LIQPAY_PRIVATE_KEY');
    
    if (!this.publicKey || !this.privateKey) {
      this.logger.error('LiqPay keys are not configured!');
      throw new Error('LiqPay configuration error');
    }
  }

  /**
   * Створення платежу
   */
  async createPayment(
    orderId: string,
    amount: number,
    description: string,
    doctorId?: string,
    productId?: string,
    ortomatId?: string,
  ) {
    const orderReference = `ORDER_${orderId}_${Date.now()}`;
    
    // Конвертуємо amount в число
    const numericAmount = parseFloat(amount.toString());
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error(`Invalid amount: ${amount}`);
    }
    
    const params = {
      public_key: this.publicKey,
      version: '3',
      action: 'pay',
      amount: numericAmount,
      currency: 'UAH',
      description: description,
      order_id: orderReference,
      result_url: `${this.configService.get('FRONTEND_URL')}/payment/success?order=${orderReference}`,
      server_url: `${this.configService.get('BACKEND_URL')}/api/liqpay/callback`,
      language: 'uk',
    };

    // Додаємо додаткову інформацію
    if (doctorId || productId || ortomatId) {
      params['info'] = JSON.stringify({ 
        doctorId, 
        productId, 
        ortomatId 
      });
    }

    this.logger.log(`Creating payment: ${orderReference}, amount: ${numericAmount} UAH`);

    const data = Buffer.from(JSON.stringify(params)).toString('base64');
    const signature = this.generateSignature(data);

    // Зберігаємо платіж в БД
    await this.prisma.payment.create({
      data: {
        orderId: orderReference,
        amount: numericAmount,
        status: 'PENDING',
        doctorId: doctorId || null,
        description,
        paymentDetails: {
          productId,
          ortomatId,
        },
      },
    });

    return {
      data,
      signature,
      publicKey: this.publicKey,
    };
  }

  /**
   * Генерація підпису
   */
  private generateSignature(data: string): string {
    const signString = this.privateKey + data + this.privateKey;
    return crypto.createHash('sha1').update(signString).digest('base64');
  }

  /**
   * Перевірка підпису від LiqPay
   */
  verifySignature(data: string, signature: string): boolean {
    const expectedSignature = this.generateSignature(data);
    const isValid = expectedSignature === signature;
    
    if (!isValid) {
      this.logger.error('Invalid signature from LiqPay!');
    }
    
    return isValid;
  }

  /**
   * Обробка callback від LiqPay
   */
  async processCallback(data: string, signature: string) {
    this.logger.log('Processing LiqPay callback...');
    
    // Перевіряємо підпис
    if (!this.verifySignature(data, signature)) {
      this.logger.error('Invalid signature from LiqPay');
      throw new Error('Invalid signature');
    }

    // Розшифровуємо дані
    const decodedData = Buffer.from(data, 'base64').toString('utf-8');
    const paymentData = JSON.parse(decodedData);

    this.logger.log(`Payment callback: ${paymentData.order_id}, status: ${paymentData.status}`);

    // Знаходимо платіж
    const payment = await this.prisma.payment.findFirst({
      where: { orderId: paymentData.order_id },
    });

    if (!payment) {
      this.logger.error(`Payment not found: ${paymentData.order_id}`);
      throw new Error('Payment not found');
    }

    // Визначаємо статус
    let newStatus = 'PENDING';
    if (paymentData.status === 'success' || paymentData.status === 'sandbox') {
      newStatus = 'SUCCESS';
    } else if (paymentData.status === 'failure' || paymentData.status === 'error') {
      newStatus = 'FAILED';
    }

    // Оновлюємо платіж
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        transactionId: paymentData.transaction_id,
        paymentDetails: paymentData,
      },
    });

    // Якщо успішний - обробляємо
    if (newStatus === 'SUCCESS') {
      await this.handleSuccessfulPayment(payment, paymentData);
    }

    return { status: newStatus };
  }

  /**
   * Обробка успішного платежу
   */
  private async handleSuccessfulPayment(payment: any, paymentData: any) {
    try {
      // Парсимо info
      let info: any = {};
      try {
        if (paymentData.info) {
          info = JSON.parse(paymentData.info);
        }
      } catch (e) {
        this.logger.warn('Failed to parse payment info');
      }

      // Отримуємо дані
      const storedDetails = payment.paymentDetails || {};
      const productId = storedDetails.productId || info.productId || null;
      const ortomatId = storedDetails.ortomatId || info.ortomatId || null;

      // Створюємо продаж
      const sale = await this.prisma.sale.create({
        data: {
          amount: payment.amount,
          doctorId: payment.doctorId || info.doctorId || null,
          paymentId: payment.id,
          ortomatId: ortomatId,
          productId: productId,
          status: 'completed',
          completedAt: new Date(),
        },
      });

      this.logger.log(`Sale created: ${sale.id}`);

      // Якщо є лікар - комісія
      if (payment.doctorId) {
        await this.handleDoctorCommission(payment, sale);
      }

      // Email покупцю
      if (paymentData.sender_email) {
        await this.handlePurchaseEmail(paymentData, payment);
      }

      this.logger.log(`Payment successful: ${payment.orderId}, amount: ${payment.amount} UAH`);
    } catch (error) {
      this.logger.error('Error handling successful payment:', error);
      throw error;
    }
  }

  /**
   * Обробка комісії лікаря
   */
  private async handleDoctorCommission(payment: any, sale: any) {
    try {
      const commission = payment.amount * 0.1; // 10%
      
      await this.prisma.commission.create({
        data: {
          amount: commission,
          doctorId: payment.doctorId,
          saleId: sale.id,
        },
      });

      // Email лікарю
      const doctor = await this.prisma.user.findUnique({
        where: { id: payment.doctorId },
      });

      if (doctor) {
        try {
          if (typeof this.emailService.sendSaleNotification === 'function') {
            await this.emailService.sendSaleNotification(
              doctor.email,
              {
                firstName: doctor.firstName,
                commission,
                saleAmount: payment.amount,
                orderId: payment.orderId,
              }
            );
          }
        } catch (error) {
          this.logger.error('Failed to send commission email:', error);
        }
      }

      this.logger.log(`Commission created: ${commission} UAH for doctor ${payment.doctorId}`);
    } catch (error) {
      this.logger.error('Error handling doctor commission:', error);
    }
  }

  /**
   * Email покупцю
   */
  private async handlePurchaseEmail(paymentData: any, payment: any) {
    try {
      await this.prisma.emailLog.create({
        data: {
          email: paymentData.sender_email,
          type: 'SALE_NOTIFICATION',
          subject: 'Дякуємо за покупку!',
          status: 'SENT',
          metadata: {
            orderId: payment.orderId,
            amount: payment.amount,
          },
        },
      });
      
      this.logger.log(`Purchase email logged for: ${paymentData.sender_email}`);
    } catch (error) {
      this.logger.error('Failed to log purchase email:', error);
    }
  }

  /**
   * Перевірка статусу платежу
   */
  async checkPaymentStatus(orderId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { orderId },
      include: {
        sales: true,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    return payment;
  }
}