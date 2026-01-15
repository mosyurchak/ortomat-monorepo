/**
 * DTO для webhook callback від Monobank
 * Webhook надсилається при зміні статусу платежу
 * Документація: https://api.monobank.ua/docs/acquiring.html#tag/Acquiring-Webhooks
 */
export class MonoWebhookDto {
  /**
   * Ідентифікатор invoice в системі Monobank
   */
  invoiceId: string;

  /**
   * Статус платежу:
   * - created - створено
   * - processing - в обробці
   * - hold - холд (якщо використовується paymentType=hold)
   * - success - успішно оплачено
   * - failure - помилка оплати
   * - reversed - скасовано
   * - expired - прострочено
   */
  status: 'created' | 'processing' | 'hold' | 'success' | 'failure' | 'reversed' | 'expired';

  /**
   * Код помилки (якщо є)
   */
  failureReason?: string;

  /**
   * Сума платежу в копійках
   */
  amount: number;

  /**
   * Код валюти (980 = UAH)
   */
  ccy: number;

  /**
   * Час створення в форматі ISO 8601
   * Приклад: "2024-01-15T12:00:00Z"
   */
  createdDate: string;

  /**
   * Час останньої модифікації в форматі ISO 8601
   * ВАЖЛИВО: Використовуйте це поле для визначення актуального статусу,
   * оскільки webhook може прийти не в послідовності
   */
  modifiedDate: string;

  /**
   * Референс (номер замовлення) з merchantPaymInfo
   */
  reference?: string;

  /**
   * Призначення платежу
   */
  destination?: string;

  /**
   * Фінальна сума яку отримає мерчант (після комісії)
   * Доступно тільки після успішної оплати
   */
  finalAmount?: number;

  /**
   * Токен картки для рекурентних платежів (якщо використовується)
   */
  cardToken?: string;

  /**
   * Маскований номер картки
   * Приклад: "444443******3377"
   */
  maskedPan?: string;

  /**
   * Тип картки (MC, VISA, та ін.)
   */
  cardType?: string;

  /**
   * Ідентифікатор еквайра
   */
  acquirerCode?: string;

  /**
   * RRN транзакції
   */
  rrn?: string;

  /**
   * Код авторизації
   */
  approvalCode?: string;
}

/**
 * Заголовки webhook запиту від Monobank
 */
export interface MonoWebhookHeaders {
  /**
   * Підпис тіла запиту в форматі Base64
   * Підписується за допомогою ECDSA
   */
  'x-sign': string;
}
