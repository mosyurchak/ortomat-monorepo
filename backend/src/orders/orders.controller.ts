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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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
   */
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
      console.error('❌ Monobank webhook error:', error.message);

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

  @Post(':id/open-cell')
  openCell(@Param('id') id: string) {
    return this.ordersService.openCell(id);
  }
}