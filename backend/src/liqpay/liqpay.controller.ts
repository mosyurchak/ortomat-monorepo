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
    },
  ) {
    try {
      const payment = await this.liqPayService.createPayment(
        body.orderId,
        body.amount,
        body.description,
        body.doctorId,
      );
      return payment;
    } catch (error) {
      this.logger.error('Error creating payment:', error);
      throw new HttpException(
        'Failed to create payment',
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
      const result = await this.liqPayService.processCallback(
        body.data,
        body.signature,
      );
      return { success: true, ...result };
    } catch (error) {
      this.logger.error('Error processing callback:', error);
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
}