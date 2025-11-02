// frontend/src/pages/payment/success.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { order } = router.query;
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetrying, setAutoRetrying] = useState(false);
  const [openingCell, setOpeningCell] = useState(false);

  useEffect(() => {
    if (!order) return;

    const checkPaymentStatus = async () => {
      try {
        console.log('🔍 Checking payment status for:', order);
        const response = await axios.get(`${API_URL}/api/liqpay/status/${order}`);
        console.log('✅ Payment status:', response.data);
        setPayment(response.data);

        if (response.data.status === 'PENDING' && retryCount === 0 && !autoRetrying) {
          console.log('⏳ Payment is PENDING, attempting auto-retry...');
          setAutoRetrying(true);
          await autoRetryCallback(order as string);
        }

        setLoading(false);
      } catch (error) {
        console.error('❌ Error checking payment:', error);
        setLoading(false);
      }
    };

    checkPaymentStatus();

    const interval = setInterval(() => {
      if (retryCount < 10) {
        checkPaymentStatus();
        setRetryCount(prev => prev + 1);
      } else {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [order, retryCount]);

  const autoRetryCallback = async (orderId: string) => {
    try {
      console.log('🔄 Auto-retrying callback for:', orderId);
      await axios.post(`${API_URL}/api/liqpay/test-callback/${orderId}`);
      console.log('✅ Auto-retry successful');
      
      setTimeout(async () => {
        const response = await axios.get(`${API_URL}/api/liqpay/status/${orderId}`);
        setPayment(response.data);
        setAutoRetrying(false);
      }, 2000);
    } catch (error) {
      console.error('❌ Auto-retry failed:', error);
      setAutoRetrying(false);
    }
  };

  const handleManualRetry = async () => {
    if (!order) return;
    
    try {
      setLoading(true);
      console.log('🔄 Manual retry for:', order);
      await axios.post(`${API_URL}/api/liqpay/test-callback/${order}`);
      
      setTimeout(async () => {
        const response = await axios.get(`${API_URL}/api/liqpay/status/${order}`);
        setPayment(response.data);
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error('❌ Manual retry failed:', error);
      setLoading(false);
    }
  };

  // ✅ ДОДАНО: Функція відкриття комірки
  const handleOpenCell = async () => {
    if (!payment || !payment.sales || payment.sales.length === 0) {
      alert('Помилка: інформація про продаж не знайдена');
      return;
    }

    const sale = payment.sales[0];
    
    if (!sale.ortomatId || sale.cellNumber === null) {
      alert('Помилка: невідомо яку комірку відкрити');
      console.error('Missing data:', { ortomatId: sale.ortomatId, cellNumber: sale.cellNumber });
      return;
    }

    try {
      setOpeningCell(true);
      console.log('🔓 Opening cell:', { ortomatId: sale.ortomatId, cellNumber: sale.cellNumber });

      // ✅ ВИПРАВЛЕНО: Викликаємо API для відкриття комірки
      const response = await axios.post(
        `${API_URL}/api/ortomats/${sale.ortomatId}/cells/${sale.cellNumber}/open`,
        {
          reason: 'CUSTOMER_PURCHASE',
          saleId: sale.id,
        }
      );

      console.log('✅ Cell opened:', response.data);
      alert('🔓 Комірка відкрита! Заберіть свій товар.');
      
      // Можна додати таймер закриття
      setTimeout(() => {
        router.push('/');
      }, 5000);

    } catch (error: any) {
      console.error('❌ Error opening cell:', error);
      
      if (error.response?.status === 404) {
        alert('Помилка: endpoint для відкриття комірки не знайдено. Зверніться до адміністратора.');
      } else if (error.response?.status === 400) {
        alert('Помилка: ' + (error.response.data?.message || 'Невірні дані'));
      } else {
        alert('Помилка відкриття комірки. Спробуйте ще раз або зверніться до підтримки.');
      }
    } finally {
      setOpeningCell(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">
            {autoRetrying ? '🔄 Автоматична перевірка платежу...' : 'Завантаження...'}
          </p>
          {retryCount > 0 && (
            <p className="text-sm text-gray-400 mt-2">
              Перевірка {retryCount}/10
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Платіж не знайдено</h1>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            На головну
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* SUCCESS */}
        {payment.status === 'SUCCESS' && (
          <>
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">✅ Оплата успішна!</h1>
              <p className="text-gray-600 mb-4">Дякуємо за покупку</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-500">Сума платежу</p>
                <p className="text-3xl font-bold text-gray-900">
                  {new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(payment.amount)}
                </p>
                <p className="text-xs text-gray-400 mt-2">Order: {payment.orderId}</p>
                
                {/* ✅ ДОДАНО: Показати номер комірки */}
                {payment.sales && payment.sales.length > 0 && payment.sales[0].cellNumber !== null && (
                  <p className="text-sm text-green-600 mt-2">
                    📦 Комірка #{payment.sales[0].cellNumber}
                  </p>
                )}
              </div>
            </div>

            {/* ✅ ВИПРАВЛЕНО: Кнопка відкрити комірку */}
            {payment.sales && payment.sales.length > 0 && payment.sales[0].cellNumber !== null && (
              <button
                onClick={handleOpenCell}
                disabled={openingCell}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold mb-4 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {openingCell ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Відкриття...
                  </>
                ) : (
                  <>🔓 Відкрити комірку</>
                )}
              </button>
            )}

            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              На головну
            </button>
          </>
        )}

        {/* PENDING */}
        {payment.status === 'PENDING' && (
          <>
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                <svg className="animate-spin h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">⏳ Платіж в обробці</h1>
              <p className="text-gray-600 mb-4">Будь ласка, зачекайте...</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-500">Сума платежу</p>
                <p className="text-3xl font-bold text-gray-900">
                  {new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(payment.amount)}
                </p>
              </div>

              {retryCount > 5 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800 mb-2">
                    ⚠️ Платіж ще обробляється. Спробуйте оновити вручну:
                  </p>
                  <button
                    onClick={handleManualRetry}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                  >
                    🔄 Оновити статус
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-400">
                Автоматична перевірка: {retryCount}/10
              </p>
            </div>
          </>
        )}

        {/* FAILED */}
        {payment.status === 'FAILED' && (
          <>
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">❌ Помилка оплати</h1>
              <p className="text-gray-600 mb-6">Платіж не вдалося здійснити</p>
            </div>

            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Спробувати ще раз
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
