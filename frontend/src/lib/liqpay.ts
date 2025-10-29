import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface PaymentData {
  data: string;
  signature: string;
  publicKey: string;
}

export interface CreatePaymentParams {
  orderId: string;
  amount: number;
  description: string;
  doctorId?: string;
  productId?: string;
  ortomatId?: string;
}

/**
 * Створення платежу
 */
export async function createPayment(
  params: CreatePaymentParams
): Promise<PaymentData> {
  try {
    console.log('Creating payment with params:', params);
    
    // Валідація
    if (!params.orderId || !params.amount || !params.description) {
      throw new Error('Missing required payment parameters');
    }

    if (params.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const response = await axios.post(`${API_URL}/api/liqpay/create-payment`, {
      orderId: params.orderId,
      amount: params.amount,
      description: params.description,
      doctorId: params.doctorId,
      productId: params.productId,
      ortomatId: params.ortomatId,
    });
    
    console.log('Payment created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
}

/**
 * Перевірка статусу платежу
 */
export async function checkPaymentStatus(orderId: string) {
  try {
    const response = await axios.get(`${API_URL}/api/liqpay/status/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('Error checking payment status:', error);
    throw error;
  }
}

/**
 * Генерація HTML форми для LiqPay
 */
export function generateLiqPayForm(paymentData: PaymentData): string {
  return `
    <form method="POST" action="https://www.liqpay.ua/api/3/checkout" id="liqpay-form">
      <input type="hidden" name="data" value="${paymentData.data}" />
      <input type="hidden" name="signature" value="${paymentData.signature}" />
    </form>
    <script>
      document.getElementById('liqpay-form').submit();
    </script>
  `;
}

/**
 * Відкриття LiqPay віджету для оплати
 */
export function openLiqPayWidget(paymentData: PaymentData) {
  // Створюємо форму
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://www.liqpay.ua/api/3/checkout';
  form.acceptCharset = 'utf-8';

  // Додаємо поля
  const dataInput = document.createElement('input');
  dataInput.type = 'hidden';
  dataInput.name = 'data';
  dataInput.value = paymentData.data;

  const signatureInput = document.createElement('input');
  signatureInput.type = 'hidden';
  signatureInput.name = 'signature';
  signatureInput.value = paymentData.signature;

  form.appendChild(dataInput);
  form.appendChild(signatureInput);
  
  // Додаємо форму на сторінку та відправляємо
  document.body.appendChild(form);
  form.submit();
}