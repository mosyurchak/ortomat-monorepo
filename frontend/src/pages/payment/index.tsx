import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { createPayment, generateLiqPayForm } from '../../lib/liqpay';
import Head from 'next/head';

export default function PaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Отримуємо параметри з URL
  const { productId, amount, ortomatId, doctorRef } = router.query;

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError('');

      // Генеруємо унікальний ID замовлення
      const orderId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Створюємо платіж
      const paymentData = await createPayment(
        orderId,
        Number(amount) || 100, // сума в гривнях
        `Оплата товару #${productId}`,
        doctorRef as string, // ID лікаря для комісії
      );

      // Створюємо та відправляємо форму LiqPay
      const formHtml = generateLiqPayForm(paymentData);
      
      // Вставляємо форму в DOM та автоматично відправляємо
      const div = document.createElement('div');
      div.innerHTML = formHtml;
      document.body.appendChild(div);
      
    } catch (err) {
      console.error('Payment error:', err);
      setError('Помилка при створенні платежу. Спробуйте ще раз.');
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Оплата - Ортомат</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-blue-600">🏥 Ортомат</h1>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="py-12">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-center mb-6">
              💳 Оплата товару
            </h1>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="border-b pb-2">
                <span className="text-gray-600">Товар:</span>
                <span className="float-right font-semibold">
                  #{productId || 'N/A'}
                </span>
              </div>
              
              <div className="border-b pb-2">
                <span className="text-gray-600">Ортомат:</span>
                <span className="float-right font-semibold">
                  #{ortomatId || 'N/A'}
                </span>
              </div>
              
              <div className="border-b pb-2">
                <span className="text-gray-600">Сума:</span>
                <span className="float-right font-bold text-xl text-green-600">
                  {amount || '100'} ₴
                </span>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Обробка...
                </span>
              ) : (
                'Оплатити через LiqPay'
              )}
            </button>

            <div className="mt-6 text-center">
              <img
                src="https://www.liqpay.ua/1530264903547469/static/img/logo-liqpay.svg"
                alt="LiqPay"
                className="h-8 mx-auto mb-2"
              />
              <p className="text-xs text-gray-500">
                Безпечний платіж через LiqPay
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <p className="text-center text-sm text-gray-500">
              © {new Date().getFullYear()} Ортомат. Всі права захищені.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
