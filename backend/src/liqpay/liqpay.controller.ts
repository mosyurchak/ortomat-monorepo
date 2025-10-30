import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { LiqPayService } from './liqpay.service';

@Controller('liqpay')
export class LiqPayController {
  private readonly logger = new Logger(LiqPayController.name);

  constructor(private readonly liqPayService: LiqPayService) {}

  /**
   * Створення платежу
   */
  @Post('create-payment')
  async createPayment(
    @Body()
    body: {
      orderId: string;
      amount: number;
      description: string;
      doctorId?: string;
      productId?: string;
      ortomatId?: string;
    },
  ) {
    try {
      this.logger.log(`Creating payment: ${JSON.stringify(body)}`);
      
      // Валідація
      if (!body.orderId || !body.amount || !body.description) {
        throw new HttpException(
          'Missing required fields: orderId, amount, description',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (body.amount <= 0) {
        throw new HttpException(
          'Amount must be greater than 0',
          HttpStatus.BAD_REQUEST,
        );
      }

      const payment = await this.liqPayService.createPayment(
        body.orderId,
        body.amount,
        body.description,
        body.doctorId,
        body.productId,
        body.ortomatId,
      );
      
      return payment;
    } catch (error) {
      this.logger.error('Error creating payment:', error);
      throw new HttpException(
        error.message || 'Failed to create payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Callback від LiqPay (webhook)
   */
  @Post('callback')
  async handleCallback(
    @Body() body: { data: string; signature: string },
  ) {
    try {
      // ✅ ДОДАНО: Детальне логування
      this.logger.log('\n╔════════════════════════════════════════════╗');
      this.logger.log('║   🔔 LIQPAY CALLBACK RECEIVED!           ║');
      this.logger.log('╚════════════════════════════════════════════╝');
      this.logger.log(`Timestamp: ${new Date().toISOString()}`);
      this.logger.log(`Has data: ${!!body.data}`);
      this.logger.log(`Has signature: ${!!body.signature}`);
      
      if (!body.data || !body.signature) {
        this.logger.error('❌ Missing data or signature in callback!');
        throw new HttpException(
          'Missing data or signature',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.liqPayService.processCallback(
        body.data,
        body.signature,
      );
      
      this.logger.log(`✅ Callback processed successfully: ${JSON.stringify(result)}`);
      
      return { success: true, ...result };
    } catch (error) {
      this.logger.error('❌ Error processing callback:', error);
      this.logger.error(`Error stack: ${error.stack}`);
      throw new HttpException(
        'Failed to process payment',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Перевірка статусу платежу
   */
  @Get('status/:orderId')
  async checkStatus(@Param('orderId') orderId: string) {
    try {
      const status = await this.liqPayService.checkPaymentStatus(orderId);
      return status;
    } catch (error) {
      this.logger.error('Error checking payment status:', error);
      throw new HttpException(
        'Payment not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * ✅ ДОДАНО: Тестовий endpoint для перевірки доступності
   */
  @Get('test-endpoint')
  testEndpoint() {
    this.logger.log('✅ Test endpoint called');
    return {
      success: true,
      message: 'LiqPay endpoint is accessible',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * ✅ ДОДАНО: Тестовий callback для симуляції
   */
  @Post('test-callback/:orderId')
  async testCallback(@Param('orderId') orderId: string) {
    this.logger.log(`🧪 TEST CALLBACK triggered for: ${orderId}`);
    
    // Симулюємо успішний callback від LiqPay
    const fakeCallbackData = {
      order_id: orderId,
      status: 'sandbox',
      transaction_id: `TEST_${Date.now()}`,
      amount: 130,
      currency: 'UAH',
      sender_email: 'test@example.com',
    };
    
    const data = Buffer.from(JSON.stringify(fakeCallbackData)).toString('base64');
    
    // Генеруємо правильний підпис використовуючи private метод
    const signature = this.liqPayService['generateSignature'](data);
    
    this.logger.log('Simulated callback data prepared');
    
    return await this.liqPayService.processCallback(data, signature);
  }

  /**
   * ✅ ДОДАНО: Endpoint для перевірки конфігурації
   */
  @Get('check-config')
  checkConfig() {
    const backendUrl = process.env.BACKEND_URL;
    const frontendUrl = process.env.FRONTEND_URL;
    const hasPublicKey = !!process.env.LIQPAY_PUBLIC_KEY;
    const hasPrivateKey = !!process.env.LIQPAY_PRIVATE_KEY;
    
    this.logger.log('Configuration check requested');
    
    return {
      backendUrl,
      frontendUrl,
      hasPublicKey,
      hasPrivateKey,
      callbackUrl: `${backendUrl}/api/liqpay/callback`,
      isConfigured: backendUrl && frontendUrl && hasPublicKey && hasPrivateKey,
    };
  }
}