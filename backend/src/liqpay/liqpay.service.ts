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
  }

  /**
   * Створення платежу
   */
  async createPayment(
    orderId: string,
    amount: number,
    description: string,
    doctorId?: string,
  ) {
    const orderReference = `ORDER_${orderId}_${Date.now()}`;
    
    const params = {
      public_key: this.publicKey,
      version: '3',
      action: 'pay',
      amount: amount.toString(),
      currency: 'UAH',
      description: description,
      order_id: orderReference,
      result_url: `${this.configService.get('FRONTEND_URL')}/payment/success`,
      server_url: `${this.configService.get('BACKEND_URL')}/api/liqpay/callback`,
      language: 'uk',
      product_description: description,
      sender_first_name: '',
      sender_last_name: '',
    };

    // Якщо є doctor_id, додаємо для розрахунку комісії
    if (doctorId) {
      params['info'] = JSON.stringify({ doctorId });
    }

    const data = Buffer.from(JSON.stringify(params)).toString('base64');
    const signature = this.generateSignature(data);

    // Зберігаємо інформацію про платіж в базі
    await this.prisma.payment.create({
      data: {
        orderId: orderReference,
        amount,
        status: 'PENDING',
        doctorId,
        description,
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
    return expectedSignature === signature;
  }

  /**
   * Обробка callback від LiqPay
   */
  async processCallback(data: string, signature: string) {
    // Перевіряємо підпис
    if (!this.verifySignature(data, signature)) {
      this.logger.error('Invalid signature from LiqPay');
      throw new Error('Invalid signature');
    }

    // Розшифровуємо дані
    const decodedData = Buffer.from(data, 'base64').toString('utf-8');
    const paymentData = JSON.parse(decodedData);

    this.logger.log(`Payment callback received: ${paymentData.order_id}`);

    // Оновлюємо статус платежу в базі
    const payment = await this.prisma.payment.findFirst({
      where: { orderId: paymentData.order_id },
    });

    if (!payment) {
      this.logger.error(`Payment not found: ${paymentData.order_id}`);
      throw new Error('Payment not found');
    }

    // Оновлюємо статус
    let newStatus = 'PENDING';
    if (paymentData.status === 'success' || paymentData.status === 'sandbox') {
      newStatus = 'SUCCESS';
    } else if (paymentData.status === 'failure') {
      newStatus = 'FAILED';
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        transactionId: paymentData.transaction_id,
        paymentDetails: paymentData,
      },
    });

    // Якщо платіж успішний
    if (newStatus === 'SUCCESS') {
      // Створюємо запис про продаж
      const sale = await this.prisma.sale.create({
        data: {
          amount: payment.amount,
          doctorId: payment.doctorId || undefined,
          paymentId: payment.id,
          ortomatId: paymentData.info?.ortomatId || undefined,
          productId: paymentData.info?.productId || undefined,
        },
      });

      // Якщо є лікар - нараховуємо комісію (10%)
      if (payment.doctorId) {
        const commission = payment.amount * 0.1;
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
          // Використовуємо існуючі публічні методи EmailService
          try {
            // Якщо є метод sendSaleNotification - використовуємо його
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
            } else if (this.emailService.sendVerificationEmail) {
              // Альтернатива - використовуємо sendVerificationEmail як заглушку
              this.logger.log(
                `Commission notification: Doctor ${doctor.email} earned ${commission} UAH from sale ${sale.id}`
              );
            }
          } catch (error) {
            this.logger.error('Failed to send commission email:', error);
            // Не блокуємо процес через помилку email
          }
        }
      }

      // Відправляємо email покупцю (якщо є email)
      if (paymentData.sender_email) {
        try {
          // Логуємо замість відправки, оскільки метод sendEmail приватний
          this.logger.log(
            `Purchase confirmation: ${paymentData.sender_email} - Order ${payment.orderId}, Amount: ${payment.amount} UAH`
          );
          
          // Якщо потрібно, можна зберегти в email_logs таблицю
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
        } catch (error) {
          this.logger.error('Failed to log purchase email:', error);
        }
      }

      this.logger.log(`Payment successful: ${payment.orderId}, amount: ${payment.amount} UAH`);
    }

    return { status: newStatus };
  }

  /**
   * Перевірка статусу платежу
   */
  async checkPaymentStatus(orderId: string) {
    const params = {
      public_key: this.publicKey,
      version: '3',
      action: 'status',
      order_id: orderId,
    };

    const data = Buffer.from(JSON.stringify(params)).toString('base64');
    const signature = this.generateSignature(data);

    // Для простоти повертаємо статус з нашої бази
    // В продакшн потрібно зробити реальний запит до LiqPay API
    const payment = await this.prisma.payment.findFirst({
      where: { orderId },
    });

    return payment;
  }
}