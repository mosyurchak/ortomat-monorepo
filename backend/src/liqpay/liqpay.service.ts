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
    
    // Перевірка наявності ключів
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
    // Генеруємо унікальний ID замовлення
    const orderReference = `ORDER_${orderId}_${Date.now()}`;
    
    // ⚠️ ВАЖЛИВО: amount має бути ЧИСЛОМ, а не рядком!
    const numericAmount = parseFloat(amount.toString());
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error(`Invalid amount: ${amount}`);
    }
    
    const params = {
      public_key: this.publicKey,
      version: '3',
      action: 'pay',
      amount: numericAmount, // ✅ Число, не рядок!
      currency: 'UAH',
      description: description,
      order_id: orderReference,
      result_url: `${this.configService.get('FRONTEND_URL')}/payment/success?order=${orderReference}`,
      server_url: `${this.configService.get('BACKEND_URL')}/api/liqpay/callback`,
      language: 'uk',
    };

    // Додаємо додаткову інформацію для callback
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

    // Зберігаємо інформацію про платіж в базі
    await this.prisma.payment.create({
      data: {
        orderId: orderReference,
        amount: numericAmount,
        status: 'PENDING',
        doctorId: doctorId || null,
        description,
        metadata: {
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
    const hash = crypto.createHash('sha1').update(signString).digest('base64');
    this.logger.debug(`Generated signature for data length: ${data.length}`);
    return hash;
  }

  /**
   * Перевірка підпису від LiqPay
   */
  verifySignature(data: string, signature: string): boolean {
    const expectedSignature = this.generateSignature(data);
    const isValid = expectedSignature === signature;
    
    if (!isValid) {
      this.logger.error('Signature mismatch!');
      this.logger.debug(`Expected: ${expectedSignature}`);
      this.logger.debug(`Received: ${signature}`);
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

    // Знаходимо платіж в базі
    const payment = await this.prisma.payment.findFirst({
      where: { orderId: paymentData.order_id },
    });

    if (!payment) {
      this.logger.error(`Payment not found: ${paymentData.order_id}`);
      throw new Error('Payment not found');
    }

    // Визначаємо новий статус
    let newStatus = 'PENDING';
    if (paymentData.status === 'success' || paymentData.status === 'sandbox') {
      newStatus = 'SUCCESS';
    } else if (paymentData.status === 'failure' || paymentData.status === 'error') {
      newStatus = 'FAILED';
    }

    // Оновлюємо статус платежу
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        transactionId: paymentData.transaction_id,
        paymentDetails: paymentData,
      },
    });

    // Якщо платіж успішний - обробляємо продаж
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
      // Парсимо додаткову інформацію
      let info = {};
      try {
        info = JSON.parse(paymentData.info || '{}');
      } catch (e) {
        this.logger.warn('Failed to parse payment info');
      }

      // Створюємо запис про продаж
      const sale = await this.prisma.sale.create({
        data: {
          amount: payment.amount,
          doctorId: payment.doctorId || info['doctorId'] || null,
          paymentId: payment.id,
          ortomatId: info['ortomatId'] || null,
          productId: info['productId'] || null,
        },
      });

      this.logger.log(`Sale created: ${sale.id}`);

      // Якщо є лікар - нараховуємо комісію (10%)
      if (payment.doctorId) {
        await this.handleDoctorCommission(payment, sale);
      }

      // Відправляємо email покупцю (якщо є email)
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

      // Відправляємо email лікарю
      const doctor = await this.prisma.user.findUnique({
        where: { id: payment.doctorId },
      });

      if (doctor) {
        try {
          if (this.emailService.sendSaleNotification) {
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
   * Відправка email покупцю
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
        sale: true,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    return payment;
  }
}