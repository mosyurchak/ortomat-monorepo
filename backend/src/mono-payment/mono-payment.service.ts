import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { MonoWebhookDto } from './dto/webhook.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { EmailService } from '../email/email.service';

/**
 * Сервіс для роботи з Monobank Acquiring API (Plata by Mono)
 * Документація: https://api.monobank.ua/docs/acquiring.html
 */
@Injectable()
export class MonoPaymentService {
  private readonly logger = new Logger(MonoPaymentService.name);
  private readonly apiClient: AxiosInstance;
  private readonly apiUrl = 'https://api.monobank.ua';
  private readonly token: string;
  private publicKey: string | null = null;

  constructor(
    private prisma: PrismaService,
    private telegramBotService: TelegramBotService,
    private emailService: EmailService,
  ) {
    // Отримуємо токен з змінних оточення
    this.token = process.env.MONO_TOKEN;

    if (!this.token) {
      this.logger.error('MONO_TOKEN не знайдено в змінних оточення!');
      throw new Error('MONO_TOKEN is required');
    }

    // Створюємо HTTP клієнт з базовими заголовками
    this.apiClient = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'X-Token': this.token,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 секунд
    });

    this.logger.log('MonoPaymentService ініціалізовано');
  }

  /**
   * Створення invoice (рахунку на оплату)
   *
   * @param dto - дані для створення invoice
   * @returns об'єкт з invoiceId та pageUrl для оплати
   */
  async createInvoice(dto: CreateInvoiceDto): Promise<{
    invoiceId: string;
    pageUrl: string;
  }> {
    try {
      this.logger.log(`Створення invoice на суму ${dto.amount} копійок`);

      // Відправляємо запит до Monobank API
      const response = await this.apiClient.post('/api/merchant/invoice/create', {
        amount: dto.amount,
        ccy: dto.ccy || 980,
        merchantPaymInfo: dto.merchantPaymInfo,
        redirectUrl: dto.redirectUrl,
        webHookUrl: dto.webHookUrl,
        validity: dto.validity,
        paymentType: dto.paymentType,
      });

      const { invoiceId, pageUrl } = response.data;

      this.logger.log(`Invoice створено: ${invoiceId}`);

      return {
        invoiceId,
        pageUrl, // URL на який потрібно перенаправити користувача для оплати
      };
    } catch (error) {
      this.logger.error('Помилка створення invoice:', error.response?.data || error.message);

      if (error.response?.data) {
        throw new BadRequestException({
          message: 'Помилка створення платежу в Monobank',
          error: error.response.data,
        });
      }

      throw new BadRequestException('Не вдалося створити платіж');
    }
  }

  /**
   * Отримання статусу invoice
   *
   * @param invoiceId - ідентифікатор invoice в Monobank
   * @returns статус платежу та всі деталі
   */
  async getInvoiceStatus(invoiceId: string): Promise<MonoWebhookDto> {
    try {
      this.logger.log(`Перевірка статусу invoice: ${invoiceId}`);

      const response = await this.apiClient.get(`/api/merchant/invoice/status`, {
        params: { invoiceId },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Помилка отримання статусу invoice ${invoiceId}:`, error.response?.data || error.message);
      throw new BadRequestException('Не вдалося отримати статус платежу');
    }
  }

  /**
   * Отримання публічного ключа Monobank для перевірки підпису webhook
   * Ключ кешується після першого запиту
   *
   * @returns публічний ключ в форматі PEM
   */
  async getPublicKey(): Promise<string> {
    // Якщо ключ вже завантажено - повертаємо з кешу
    if (this.publicKey) {
      return this.publicKey;
    }

    try {
      this.logger.log('Завантаження публічного ключа Monobank...');

      const response = await axios.get(`${this.apiUrl}/api/merchant/pubkey`, {
        headers: {
          'X-Token': this.token,
        },
      });

      // Конвертуємо Base64 ключ в PEM формат
      const keyBase64 = response.data.key;
      this.publicKey = this.base64ToPem(keyBase64);

      this.logger.log('Публічний ключ завантажено та закешовано');

      return this.publicKey;
    } catch (error) {
      this.logger.error('Помилка завантаження публічного ключа:', error.message);
      throw new BadRequestException('Не вдалося завантажити публічний ключ');
    }
  }

  /**
   * Перевірка підпису webhook від Monobank
   * Monobank підписує тіло запиту за допомогою ECDSA
   *
   * @param body - тіло webhook запиту (string або Buffer)
   * @param signature - підпис з заголовка X-Sign (Base64)
   * @returns true якщо підпис валідний, false якщо ні
   */
  async verifyWebhookSignature(body: string | Buffer, signature: string): Promise<boolean> {
    try {
      const publicKey = await this.getPublicKey();

      // Конвертуємо тіло в Buffer якщо це string
      const bodyBuffer = typeof body === 'string' ? Buffer.from(body) : body;

      // Створюємо verify об'єкт
      const verify = crypto.createVerify('SHA256');
      verify.update(bodyBuffer);
      verify.end();

      // Перевіряємо підпис
      const isValid = verify.verify(publicKey, signature, 'base64');

      if (!isValid) {
        this.logger.warn('Неправильний підпис webhook від Monobank!');
      }

      return isValid;
    } catch (error) {
      this.logger.error('Помилка перевірки підпису:', error.message);
      return false;
    }
  }

  /**
   * Обробка webhook від Monobank
   * Викликається коли змінюється статус платежу
   *
   * @param webhookData - дані з webhook
   * @param signature - підпис з заголовка X-Sign
   * @param rawBody - оригінальне тіло запиту для перевірки підпису
   * @returns оброблені дані webhook
   */
  async handleWebhook(
    webhookData: MonoWebhookDto,
    signature: string,
    rawBody: string | Buffer,
  ): Promise<MonoWebhookDto> {
    this.logger.log(`Отримано webhook для invoice ${webhookData.invoiceId}, статус: ${webhookData.status}`);

    // Перевіряємо підпис
    const isValidSignature = await this.verifyWebhookSignature(rawBody, signature);

    if (!isValidSignature) {
      this.logger.error('Отримано webhook з неправильним підписом!');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.log(`Webhook підпис валідний. Invoice: ${webhookData.invoiceId}, Status: ${webhookData.status}`);

    return webhookData;
  }

  /**
   * Конвертація Base64 ключа в PEM формат
   *
   * @param base64Key - ключ в форматі Base64
   * @returns ключ в форматі PEM
   */
  private base64ToPem(base64Key: string): string {
    // Розбиваємо ключ на рядки по 64 символи
    const keyLines: string[] = [];
    for (let i = 0; i < base64Key.length; i += 64) {
      keyLines.push(base64Key.substring(i, i + 64));
    }

    // Формуємо PEM ключ
    return [
      '-----BEGIN PUBLIC KEY-----',
      ...keyLines,
      '-----END PUBLIC KEY-----',
    ].join('\n');
  }

  /**
   * Скасування invoice (якщо ще не оплачено)
   *
   * @param invoiceId - ідентифікатор invoice
   * @returns результат скасування
   */
  async cancelInvoice(invoiceId: string): Promise<{ status: string }> {
    try {
      this.logger.log(`Скасування invoice: ${invoiceId}`);

      const response = await this.apiClient.post('/api/merchant/invoice/cancel', {
        invoiceId,
      });

      this.logger.log(`Invoice ${invoiceId} скасовано`);

      return response.data;
    } catch (error) {
      this.logger.error(`Помилка скасування invoice ${invoiceId}:`, error.response?.data || error.message);
      throw new BadRequestException('Не вдалося скасувати платіж');
    }
  }

  /**
   * Повернення коштів (refund) для успішного платежу
   *
   * @param invoiceId - ідентифікатор invoice
   * @param amount - сума для повернення в копійках (необов'язково, за замовчуванням повна сума)
   * @returns результат повернення
   */
  async refundPayment(invoiceId: string, amount?: number): Promise<{ status: string }> {
    try {
      this.logger.log(`Повернення коштів для invoice: ${invoiceId}, сума: ${amount || 'повна'}`);

      const payload: any = { invoiceId };
      if (amount) {
        payload.amount = amount;
      }

      const response = await this.apiClient.post('/api/merchant/invoice/remove', payload);

      this.logger.log(`Кошти повернено для invoice ${invoiceId}`);

      return response.data;
    } catch (error) {
      this.logger.error(`Помилка повернення коштів для ${invoiceId}:`, error.response?.data || error.message);
      throw new BadRequestException('Не вдалося повернути кошти');
    }
  }

  /**
   * Обробка успішного платежу через Monobank
   * Створює продаж, нараховує бали, відправляє нотифікації
   */
  async handleSuccessfulMonoPayment(webhookData: MonoWebhookDto) {
    try {
      this.logger.log('=== HANDLING SUCCESSFUL MONO PAYMENT ===');
      this.logger.log(`Invoice ID: ${webhookData.invoiceId}`);
      this.logger.log(`Amount: ${webhookData.amount / 100} UAH`);

      // Знаходимо payment record в БД
      const payment = await this.prisma.payment.findUnique({
        where: { invoiceId: webhookData.invoiceId },
      });

      if (!payment) {
        this.logger.error(`❌ Payment not found for invoiceId: ${webhookData.invoiceId}`);
        return;
      }

      // Перевірка на дублікати
      const existingSale = await this.prisma.sale.findFirst({
        where: { paymentId: payment.id },
      });

      if (existingSale) {
        this.logger.warn(`⚠️ Sale already exists for payment ${payment.id}, skipping duplicate...`);
        return;
      }

      // Витягуємо дані з payment details
      const details = payment.paymentDetails as any || {};
      const productId = details.productId || null;
      const ortomatId = details.ortomatId || null;
      const cellNumber = details.cellNumber !== undefined ? details.cellNumber : null;
      const doctorId = payment.doctorId || null;

      this.logger.log(`📋 Extracted data:`);
      this.logger.log(`  - Product ID: ${productId}`);
      this.logger.log(`  - Ortomat ID: ${ortomatId}`);
      this.logger.log(`  - Cell Number: ${cellNumber}`);
      this.logger.log(`  - Doctor ID: ${doctorId}`);

      // Розраховуємо бали для реферала
      let pointsEarned = null;
      let doctorOrtomatId = null;

      if (doctorId && productId) {
        const product = await this.prisma.product.findUnique({
          where: { id: productId },
        });

        if (product && product.referralPoints > 0) {
          pointsEarned = product.referralPoints;
          this.logger.log(`💰 Points to award: ${pointsEarned} points`);

          if (ortomatId) {
            const doctorOrtomat = await this.prisma.doctorOrtomat.findFirst({
              where: {
                doctorId: doctorId,
                ortomatId: ortomatId,
              },
            });

            if (doctorOrtomat) {
              doctorOrtomatId = doctorOrtomat.id;
              this.logger.log(`✅ Found doctor-ortomat relation: ${doctorOrtomatId}`);
            }
          }
        }
      }

      // Генеруємо унікальний номер замовлення
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Створюємо продаж
      const sale = await this.prisma.sale.create({
        data: {
          orderNumber: orderNumber,
          amount: webhookData.amount / 100, // Конвертуємо копійки в гривні
          doctorId: doctorId,
          pointsEarned: pointsEarned,
          doctorOrtomatId: doctorOrtomatId,
          paymentId: payment.id,
          ortomatId: ortomatId,
          productId: productId,
          cellNumber: cellNumber,
          status: 'completed',
          completedAt: new Date(),
        },
      });

      this.logger.log(`✅ Sale created: ${sale.id}`);
      this.logger.log(`   - Order Number: ${sale.orderNumber}`);
      this.logger.log(`   - Points earned: ${pointsEarned || 0}`);

      // Оновлюємо статистику doctorOrtomat ЗАВЖДИ якщо є doctorOrtomatId
      let updatedDoctorOrtomat = null;
      if (doctorOrtomatId) {
        updatedDoctorOrtomat = await this.prisma.doctorOrtomat.update({
          where: { id: doctorOrtomatId },
          data: {
            totalSales: { increment: 1 },
            totalPoints: pointsEarned ? { increment: pointsEarned } : undefined,
          },
        });
        this.logger.log(`✅ Updated doctor-ortomat stats: +${pointsEarned || 0} points, +1 sale`);
      }

      // ✅ TELEGRAM: Відправляємо нотифікацію ЗАВЖДИ якщо є doctorId
      if (doctorId) {
        try {
          const product = await this.prisma.product.findUnique({
            where: { id: productId },
          });

          // Отримуємо totalPoints з БД якщо не було оновлення
          const totalPoints = updatedDoctorOrtomat?.totalPoints || 0;

          await this.telegramBotService.sendSaleNotification(doctorId, {
            productName: product?.name || 'Товар',
            points: pointsEarned || 0,
            totalPoints: totalPoints,
            amount: webhookData.amount / 100,
          });
        } catch (error) {
          this.logger.error('Failed to send Telegram notification:', error);
        }
      }

      // Оновити статус комірки якщо є дані
      if (ortomatId && cellNumber !== null) {
        this.logger.log(`🔄 Marking cell as used: ortomat=${ortomatId}, cell=${cellNumber}`);
        await this.prisma.cell.updateMany({
          where: {
            ortomatId: ortomatId,
            number: cellNumber,
          },
          data: {
            isAvailable: true, // Вивільняємо комірку після видачі
          },
        });
      }

      this.logger.log('=== END HANDLING SUCCESSFUL MONO PAYMENT ===');
    } catch (error) {
      this.logger.error('Error handling successful Mono payment:', error);
      throw error;
    }
  }
}
