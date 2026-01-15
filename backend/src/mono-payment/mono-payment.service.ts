import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { MonoWebhookDto } from './dto/webhook.dto';

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

  constructor() {
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
}
