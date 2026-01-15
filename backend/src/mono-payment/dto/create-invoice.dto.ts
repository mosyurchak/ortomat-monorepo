import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';

/**
 * DTO для створення invoice в Monobank
 * Документація: https://api.monobank.ua/docs/acquiring.html
 */
export class CreateInvoiceDto {
  /**
   * Сума платежу в копійках (мінімальні одиниці валюти)
   * Наприклад: 4200 = 42.00 грн
   */
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  amount: number;

  /**
   * Код валюти за стандартом ISO 4217
   * 980 = UAH (гривня)
   * За замовчуванням використовується 980
   */
  @IsNumber()
  @IsOptional()
  ccy?: number = 980;

  /**
   * Інформація про платіж для мерчанта
   */
  @IsOptional()
  merchantPaymInfo?: {
    /**
     * Номер замовлення в системі мерчанта
     */
    reference?: string;

    /**
     * Призначення платежу (опис)
     */
    destination?: string;

    /**
     * Кошик товарів
     */
    basketOrder?: Array<{
      name: string;
      qty: number;
      sum: number;
      icon?: string;
      unit?: string;
      code?: string;
    }>;
  };

  /**
   * URL для редіректу після успішної оплати
   */
  @IsUrl()
  @IsOptional()
  redirectUrl?: string;

  /**
   * URL для отримання callback про зміну статусу платежу (webhook)
   */
  @IsUrl()
  @IsOptional()
  webHookUrl?: string;

  /**
   * Строк дії інвойсу в секундах
   * За замовчуванням: 86400 (24 години)
   */
  @IsNumber()
  @IsOptional()
  validity?: number;

  /**
   * Додаткові параметри
   */
  @IsOptional()
  paymentType?: string; // 'debit' (default) or 'hold'

  @IsOptional()
  qrId?: string; // QR код для оплати

  @IsOptional()
  code?: string; // Код для оплати (для фізичних терміналів)
}
