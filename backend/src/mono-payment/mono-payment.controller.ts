import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { MonoPaymentService } from './mono-payment.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { MonoWebhookDto } from './dto/webhook.dto';

/**
 * Контролер для роботи з Monobank платежами
 * Endpoints для frontend та webhook від Monobank
 */
@Controller('mono-payment')
export class MonoPaymentController {
  private readonly logger = new Logger(MonoPaymentController.name);

  constructor(private readonly monoPaymentService: MonoPaymentService) {}

  /**
   * Створення invoice (рахунку на оплату)
   * Викликається з frontend коли користувач натискає "Оплатити"
   *
   * POST /api/mono-payment/create-invoice
   *
   * Body:
   * {
   *   "amount": 4200,  // в копійках (42.00 грн)
   *   "merchantPaymInfo": {
   *     "reference": "order-123",
   *     "destination": "Оплата за ортопедичний виріб"
   *   },
   *   "redirectUrl": "https://ortomat.com.ua/payment/success",
   *   "webHookUrl": "https://your-backend.com/api/mono-payment/webhook"
   * }
   *
   * Response:
   * {
   *   "invoiceId": "p2_9ZgpZVsl3",
   *   "pageUrl": "https://pay.mbnk.biz/p2_9ZgpZVsl3"
   * }
   */
  @Post('create-invoice')
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(@Body() createInvoiceDto: CreateInvoiceDto) {
    this.logger.log('Запит на створення invoice від frontend');

    try {
      const result = await this.monoPaymentService.createInvoice(createInvoiceDto);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Помилка створення invoice:', error.message);
      throw error;
    }
  }

  /**
   * Перевірка статусу платежу
   * Викликається з frontend для перевірки чи оплачено
   *
   * GET /api/mono-payment/status/:invoiceId
   *
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "invoiceId": "p2_9ZgpZVsl3",
   *     "status": "success",
   *     "amount": 4200,
   *     ...
   *   }
   * }
   */
  @Get('status/:invoiceId')
  async getInvoiceStatus(@Param('invoiceId') invoiceId: string) {
    this.logger.log(`Перевірка статусу invoice: ${invoiceId}`);

    try {
      const status = await this.monoPaymentService.getInvoiceStatus(invoiceId);

      return {
        success: true,
        data: status,
      };
    } catch (error) {
      this.logger.error(`Помилка отримання статусу ${invoiceId}:`, error.message);
      throw error;
    }
  }

  /**
   * Webhook endpoint для отримання callback від Monobank
   * Викликається Monobank коли змінюється статус платежу
   *
   * POST /api/mono-payment/webhook
   *
   * Headers:
   *   X-Sign: Base64 підпис тіла запиту
   *
   * Body: MonoWebhookDto (JSON)
   *
   * Response: HTTP 200 OK (обов'язково!)
   *
   * ВАЖЛИВО:
   * - Monobank робить до 3 спроб відправки webhook
   * - Webhook вважається прийнятим тільки якщо повернути HTTP 200
   * - Webhook може прийти не в послідовності (success до processing)
   * - Використовуйте modifiedDate для визначення актуального статусу
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-sign') signature: string,
    @Body() webhookData: MonoWebhookDto,
    @Req() request: Request,
  ) {
    this.logger.log('Отримано webhook від Monobank');

    try {
      // Отримуємо raw body для перевірки підпису
      // ВАЖЛИВО: потрібно налаштувати NestJS для збереження raw body
      const rawBody = (request as any).rawBody || JSON.stringify(webhookData);

      // Перевіряємо підпис та обробляємо webhook
      const validatedData = await this.monoPaymentService.handleWebhook(
        webhookData,
        signature,
        rawBody,
      );

      this.logger.log(
        `Webhook оброблено: invoice=${validatedData.invoiceId}, status=${validatedData.status}`,
      );

      // ТУТ ПОТРІБНО ДОДАТИ ВАШУ БІЗНЕС-ЛОГІКУ:
      // 1. Оновити статус замовлення в БД
      // 2. Якщо status === 'success' - відкрити комірку в ортоматі
      // 3. Нарахувати комісію лікарю
      // 4. Відправити email користувачу
      //
      // Це буде зроблено в orders.service.ts

      // Обов'язково повертаємо HTTP 200 OK
      return {
        success: true,
        message: 'Webhook received and processed',
      };
    } catch (error) {
      this.logger.error('Помилка обробки webhook:', error.message);

      // Навіть якщо помилка - повертаємо 200 щоб Monobank не робив retry
      // Але логуємо помилку для debugging
      return {
        success: false,
        message: 'Webhook received but failed to process',
        error: error.message,
      };
    }
  }

  /**
   * Скасування invoice (якщо ще не оплачено)
   *
   * POST /api/mono-payment/cancel/:invoiceId
   */
  @Post('cancel/:invoiceId')
  @HttpCode(HttpStatus.OK)
  async cancelInvoice(@Param('invoiceId') invoiceId: string) {
    this.logger.log(`Запит на скасування invoice: ${invoiceId}`);

    try {
      const result = await this.monoPaymentService.cancelInvoice(invoiceId);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Помилка скасування ${invoiceId}:`, error.message);
      throw error;
    }
  }

  /**
   * Повернення коштів
   *
   * POST /api/mono-payment/refund/:invoiceId
   *
   * Body (optional):
   * {
   *   "amount": 2100  // часткове повернення в копійках
   * }
   */
  @Post('refund/:invoiceId')
  @HttpCode(HttpStatus.OK)
  async refundPayment(
    @Param('invoiceId') invoiceId: string,
    @Body('amount') amount?: number,
  ) {
    this.logger.log(`Запит на повернення коштів для invoice: ${invoiceId}`);

    try {
      const result = await this.monoPaymentService.refundPayment(invoiceId, amount);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Помилка повернення коштів ${invoiceId}:`, error.message);
      throw error;
    }
  }
}
