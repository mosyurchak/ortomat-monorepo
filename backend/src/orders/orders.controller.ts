import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  /**
   * ✅ SECURITY: Rate limited to 10 orders per minute to prevent spam
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  @Post('create')
  createOrder(@Body() createOrderDto: any) {
    return this.ordersService.createOrder(createOrderDto);
  }

  @Post(':id/pay')
  processPayment(@Param('id') id: string) {
    return this.ordersService.processPayment(id);
  }

  @Post('callback')
  handleCallback(@Body() callbackData: any) {
    return this.ordersService.handlePaymentCallback(callbackData);
  }

  /**
   * Створення Monobank платежу
   * POST /api/orders/:id/create-mono-payment
   *
   * Викликається з frontend після створення замовлення
   * Повертає pageUrl для перенаправлення користувача на оплату
   * ✅ SECURITY: Rate limited to 5 payments per minute
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  @Post(':id/create-mono-payment')
  @HttpCode(HttpStatus.OK)
  async createMonoPayment(@Param('id') orderId: string) {
    return this.ordersService.createMonoPayment(orderId);
  }

  /**
   * Webhook від Monobank
   * POST /api/orders/mono-webhook
   *
   * Викликається автоматично Monobank при зміні статусу платежу
   * ВАЖЛИВО: Повертає HTTP 200 навіть при помилках, щоб Monobank не робив retry
   */
  @Post('mono-webhook')
  @HttpCode(HttpStatus.OK)
  async handleMonoWebhook(
    @Headers('x-sign') signature: string,
    @Body() webhookData: any,
    @Req() request: Request,
  ) {
    try {
      // Отримуємо raw body для перевірки підпису
      const rawBody = (request as any).rawBody || JSON.stringify(webhookData);

      const result = await this.ordersService.handleMonoWebhook(
        webhookData,
        signature,
        rawBody,
      );

      // Завжди повертаємо 200 OK для Monobank
      return result;
    } catch (error) {
      this.logger.error(`Monobank webhook error: ${error.message}`);

      // Навіть при помилці повертаємо 200, щоб Monobank не робив retry
      return {
        success: false,
        message: 'Webhook received but failed to process',
        error: error.message,
      };
    }
  }

  @Get(':id')
  getOrder(@Param('id') id: string) {
    return this.ordersService.getOrder(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  /**
   * ✅ SECURITY: Rate limited to 3 cell operations per minute (CRITICAL)
   * This endpoint physically opens a locker cell
   */
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 per minute
  @Post(':id/open-cell')
  openCell(@Param('id') id: string) {
    return this.ordersService.openCell(id);
  }

  /**
   * Ручна перевірка статусу оплати в Monobank
   * POST /api/orders/:id/check-payment-status
   *
   * Використовується якщо webhook не спрацював
   * Перевіряє статус напряму в Monobank API і завершує замовлення якщо оплачено
   * ✅ SECURITY: Rate limited to 10 status checks per minute
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  @Post(':id/check-payment-status')
  @HttpCode(HttpStatus.OK)
  async checkPaymentStatus(@Param('id') orderId: string) {
    return this.ordersService.checkPaymentStatus(orderId);
  }
}