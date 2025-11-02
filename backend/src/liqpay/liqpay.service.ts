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
    
    this.logger.log('=== LIQPAY SERVICE INITIALIZED ===');
    this.logger.log(`Public Key: ${this.publicKey?.substring(0, 20)}...`);
    this.logger.log(`BACKEND_URL: ${this.configService.get('BACKEND_URL')}`);
    this.logger.log(`FRONTEND_URL: ${this.configService.get('FRONTEND_URL')}`);
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
    cellNumber?: number,
  ) {
    const orderReference = `ORDER_${orderId}_${Date.now()}`;
    
    const numericAmount = parseFloat(amount.toString());
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error(`Invalid amount: ${amount}`);
    }
    
    const backendUrl = this.configService.get('BACKEND_URL');
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const serverUrl = `${backendUrl}/api/liqpay/callback`;
    const resultUrl = `${frontendUrl}/payment/success?order=${orderReference}`;
    
    this.logger.log('=== CREATING PAYMENT ===');
    this.logger.log(`Order: ${orderReference}`);
    this.logger.log(`Amount: ${numericAmount} UAH`);
    this.logger.log(`Description: ${description}`);
    this.logger.log(`Doctor ID: ${doctorId || 'none'}`);
    this.logger.log(`Product ID: ${productId || 'none'}`);
    this.logger.log(`Ortomat ID: ${ortomatId || 'none'}`);
    this.logger.log(`Cell Number: ${cellNumber || 'none'}`);
    this.logger.log(`---`);
    this.logger.log(`Server URL (callback): ${serverUrl}`);
    this.logger.log(`Result URL (redirect): ${resultUrl}`);
    
    const params = {
      public_key: this.publicKey,
      version: '3',
      action: 'pay',
      amount: numericAmount,
      currency: 'UAH',
      description: description,
      order_id: orderReference,
      result_url: resultUrl,
      server_url: serverUrl,
      language: 'uk',
    };

    if (doctorId || productId || ortomatId || cellNumber) {
      params['info'] = JSON.stringify({ 
        doctorId, 
        productId, 
        ortomatId,
        cellNumber,
      });
    }

    this.logger.log(`LiqPay params: ${JSON.stringify(params, null, 2)}`);

    const data = Buffer.from(JSON.stringify(params)).toString('base64');
    const signature = this.generateSignature(data);

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
          cellNumber,
        },
      },
    });
    
    this.logger.log(`Payment saved to DB: ${orderReference}`);
    this.logger.log('=== END CREATING PAYMENT ===\n');

    return {
      data,
      signature,
      publicKey: this.publicKey,
    };
  }

  private generateSignature(data: string): string {
    const signString = this.privateKey + data + this.privateKey;
    return crypto.createHash('sha1').update(signString).digest('base64');
  }

  verifySignature(data: string, signature: string): boolean {
    const expectedSignature = this.generateSignature(data);
    const isValid = expectedSignature === signature;
    
    if (!isValid) {
      this.logger.error('Invalid signature from LiqPay!');
      this.logger.error(`Expected: ${expectedSignature.substring(0, 30)}...`);
      this.logger.error(`Received: ${signature.substring(0, 30)}...`);
    }
    
    return isValid;
  }

  async processCallback(data: string, signature: string) {
    this.logger.log('\n=== CALLBACK RECEIVED FROM LIQPAY ===');
    this.logger.log(`Timestamp: ${new Date().toISOString()}`);
    
    if (!this.verifySignature(data, signature)) {
      this.logger.error('❌ Invalid signature from LiqPay');
      throw new Error('Invalid signature');
    }
    
    this.logger.log('✅ Signature valid');

    const decodedData = Buffer.from(data, 'base64').toString('utf-8');
    const paymentData = JSON.parse(decodedData);

    this.logger.log(`Payment Data: ${JSON.stringify(paymentData, null, 2)}`);
    this.logger.log(`Order ID: ${paymentData.order_id}`);
    this.logger.log(`Status: ${paymentData.status}`);
    this.logger.log(`Amount: ${paymentData.amount}`);

    const payment = await this.prisma.payment.findFirst({
      where: { orderId: paymentData.order_id },
    });

    if (!payment) {
      this.logger.error(`❌ Payment not found: ${paymentData.order_id}`);
      throw new Error('Payment not found');
    }
    
    this.logger.log(`✅ Payment found in DB: ${payment.id}`);

    let newStatus = 'PENDING';
    if (paymentData.status === 'success' || paymentData.status === 'sandbox') {
      newStatus = 'SUCCESS';
    } else if (paymentData.status === 'failure' || paymentData.status === 'error') {
      newStatus = 'FAILED';
    }
    
    this.logger.log(`New status: ${newStatus}`);

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        transactionId: paymentData.transaction_id?.toString() || null, // ✅ Конвертуємо в string
        paymentDetails: paymentData,
      },
    });
    
    this.logger.log(`✅ Payment updated in DB`);

    if (newStatus === 'SUCCESS') {
      this.logger.log(`Processing successful payment...`);
      await this.handleSuccessfulPayment(payment, paymentData);
    }
    
    this.logger.log('=== END CALLBACK PROCESSING ===\n');

    return { status: newStatus };
  }

  private async handleSuccessfulPayment(payment: any, paymentData: any) {
    try {
      this.logger.log('=== HANDLING SUCCESSFUL PAYMENT ===');
      
      // Перевірка на дублікати
      const existingSale = await this.prisma.sale.findFirst({
        where: { paymentId: payment.id },
      });

      if (existingSale) {
        this.logger.warn(`⚠️ Sale already exists for payment ${payment.id}, skipping duplicate...`);
        return;
      }
      
      let info: any = {};
      try {
        if (paymentData.info) {
          info = JSON.parse(paymentData.info);
          this.logger.log(`Info from callback: ${JSON.stringify(info)}`);
        }
      } catch (e) {
        this.logger.warn('Failed to parse payment info');
      }

      const storedDetails = payment.paymentDetails || {};
      const productId = storedDetails.productId || info.productId || null;
      const ortomatId = storedDetails.ortomatId || info.ortomatId || null;
      const cellNumber = storedDetails.cellNumber || info.cellNumber || null;
      
      this.logger.log(`Product ID: ${productId}`);
      this.logger.log(`Ortomat ID: ${ortomatId}`);
      this.logger.log(`Cell Number: ${cellNumber}`);
      this.logger.log(`Doctor ID: ${payment.doctorId || info.doctorId || 'none'}`);

      // Створюємо продаж
      const sale = await this.prisma.sale.create({
        data: {
          amount: payment.amount,
          doctorId: payment.doctorId || info.doctorId || null,
          paymentId: payment.id,
          ortomatId: ortomatId,
          productId: productId,
          cellNumber: cellNumber,
          status: 'completed',
          completedAt: new Date(),
        },
      });

      this.logger.log(`✅ Sale created: ${sale.id}`);

      // ✅ Оновити статус комірки (замість списання stock)
      if (ortomatId && cellNumber !== null) {
        await this.markCellAsUsed(ortomatId, cellNumber);
      } else {
        this.logger.warn('⚠️ Missing ortomatId or cellNumber to mark cell as used');
      }

      if (payment.doctorId) {
        await this.handleDoctorCommission(payment, sale);
      }

      if (paymentData.sender_email) {
        await this.handlePurchaseEmail(paymentData, payment);
      }

      // Створити лог активності
      try {
        await this.createActivityLog({
          category: 'orders',
          severity: 'INFO',
          message: `Продаж: ${payment.description}`,
          ortomatId: ortomatId,
          cellNumber: cellNumber,
          metadata: {
            saleId: sale.id,
            paymentId: payment.id,
            orderId: payment.orderId,
            amount: payment.amount,
            productId: productId,
          },
        });
      } catch (error) {
        this.logger.error('Failed to create activity log:', error);
        // Не критична помилка - продовжуємо
      }

      this.logger.log(`✅ Payment successful: ${payment.orderId}, amount: ${payment.amount} UAH`);
      this.logger.log('=== END HANDLING SUCCESSFUL PAYMENT ===\n');
    } catch (error) {
      this.logger.error('❌ Error handling successful payment:', error);
      throw error;
    }
  }

  /**
   * Позначити комірку як використану (очистити товар)
   */
  private async markCellAsUsed(ortomatId: string, cellNumber: number) {
    try {
      this.logger.log(`Marking cell as used: ortomat=${ortomatId}, cell=${cellNumber}`);
      
      // Знайти комірку за номером
      const cell = await this.prisma.cell.findFirst({
        where: {
          ortomatId: ortomatId,
          number: cellNumber,
        },
      });

      if (!cell) {
        this.logger.error(`❌ Cell not found: ortomat=${ortomatId}, cell=${cellNumber}`);
        return;
      }

      // ✅ ВИПРАВЛЕНО: Очистити комірку (видалити товар)
      await this.prisma.cell.update({
        where: { id: cell.id },
        data: {
          productId: null,          // ✅ Видаляємо товар з комірки
          isAvailable: false,       // Комірка пуста
          lastRefillDate: new Date(),
        },
      });

      this.logger.log(`✅ Cell cleared: ${cellNumber}, product removed`);
    } catch (error) {
      this.logger.error('❌ Error marking cell as used:', error);
    }
  }

  /**
   * Створити лог активності
   */
  private async createActivityLog(data: {
    category: string;
    severity: string;
    message: string;
    ortomatId?: string;
    cellNumber?: number;
    metadata?: any;
  }) {
    try {
      // Базові дані
      const logData: any = {
        type: 'PAYMENT_SUCCESS', // ✅ ДОДАНО: обов'язкове поле
        category: data.category,
        severity: data.severity,
        message: data.message,
        metadata: data.metadata || {},
      };

      // Додаємо cellNumber якщо є
      if (data.cellNumber !== null && data.cellNumber !== undefined) {
        logData.cellNumber = data.cellNumber;
      }

      // Додаємо ortomatId якщо є
      if (data.ortomatId) {
        logData.ortomatId = data.ortomatId;
      }

      await this.prisma.activityLog.create({
        data: logData,
      });
      
      this.logger.log(`✅ Activity log created: ${data.message}`);
    } catch (error) {
      this.logger.error('❌ Error creating activity log:', error);
      this.logger.error('Error details:', JSON.stringify(error));
      // Не кидаємо помилку - це не критично
    }
  }

  private async handleDoctorCommission(payment: any, sale: any) {
    try {
      const commission = payment.amount * 0.1;
      
      await this.prisma.commission.create({
        data: {
          amount: commission,
          doctorId: payment.doctorId,
          saleId: sale.id,
        },
      });

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

      this.logger.log(`✅ Commission created: ${commission} UAH for doctor ${payment.doctorId}`);
    } catch (error) {
      this.logger.error('Error handling doctor commission:', error);
    }
  }

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
      
      this.logger.log(`✅ Purchase email logged for: ${paymentData.sender_email}`);
    } catch (error) {
      this.logger.error('Failed to log purchase email:', error);
    }
  }

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