import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface PaymentData {
  data: string;
  signature: string;
  publicKey: string;
}

/**
 * Створення платежу
 */
export async function createPayment(
  orderId: string,
  amount: number,
  description: string,
  doctorId?: string,
): Promise<PaymentData> {
  const response = await axios.post(`${API_URL}/api/liqpay/create-payment`, {
    orderId,
    amount,
    description,
    doctorId,
  });
  return response.data;
}

/**
 * Перевірка статусу платежу
 */
export async function checkPaymentStatus(orderId: string) {
  const response = await axios.get(`${API_URL}/api/liqpay/status/${orderId}`);
  return response.data;
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