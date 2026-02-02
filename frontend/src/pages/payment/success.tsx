import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { orderId } = router.query;
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingCell, setOpeningCell] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    // Функція перевірки статусу замовлення
    const checkOrderStatus = async () => {
      try {
        console.log('🔍 Checking order status:', orderId);
        const orderData = await api.getOrder(orderId as string);
        console.log('✅ Order status:', orderData);
        setOrder(orderData);
        setLoading(false);

        // Якщо статус completed, зупиняємо перевірку
        if (orderData.status === 'completed') {
          return true;
        }
        return false;
      } catch (error) {
        console.error('❌ Error checking order:', error);
        setLoading(false);
        return false;
      }
    };

    // Перша перевірка одразу
    checkOrderStatus();

    // Періодична перевірка статусу (кожні 3 секунди, максимум 10 разів)
    const interval = setInterval(async () => {
      if (checkCount >= 10) {
        clearInterval(interval);
        return;
      }

      const isCompleted = await checkOrderStatus();
      setCheckCount(prev => prev + 1);

      if (isCompleted) {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId, checkCount]);

  const handleOpenCell = async () => {
    if (!order || !order.id) {
      toast.error('Помилка: інформація про замовлення не знайдена');
      return;
    }

    try {
      setOpeningCell(true);
      console.log('🔓 Opening cell for order:', order.id);

      const response = await api.openCell(String(order.id));
      console.log('✅ Cell opened:', response);

      const message = response.mode === 'demo'
        ? `🎭 DEMO MODE: Комірка #${response.cellNumber} відкрита!\n\n${response.note}`
        : `🔓 Комірка #${response.cellNumber} відкрита!\n\nЗаберіть свій товар: ${response.product}`;

      toast.success(message, { duration: 6000 });

      // Перенаправляємо на головну
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (error: unknown) {
      console.error('❌ Error opening cell:', error);
      const isAxiosError = error && typeof error === 'object' && 'response' in error;
      const message = isAxiosError
        ? (error as any).response?.data?.message || 'Помилка відкриття комірки'
        : 'Помилка відкриття комірки';
      toast.error(`Помилка: ${message}`);
    } finally {
      setOpeningCell(false);
    }
  };

  const handleManualCheck = async () => {
    if (!orderId) return;

    try {
      setCheckingPayment(true);
      console.log('🔍 Manually checking payment status...');

      const result = await api.checkPaymentStatus(orderId as string);
      console.log('✅ Manual check result:', result);

      if (result.status === 'completed') {
        // Перезавантажуємо дані замовлення
        const orderData = await api.getOrder(orderId as string);
        setOrder(orderData);
        toast.success('✅ Оплата підтверджена! Замовлення завершено.');
      } else if (result.status === 'failed') {
        const orderData = await api.getOrder(orderId as string);
        setOrder(orderData);
        toast.error('❌ Оплата не пройшла');
      } else {
        toast('⏳ Оплата ще обробляється. Спробуйте через декілька секунд.');
      }
    } catch (error: unknown) {
      console.error('❌ Error checking payment:', error);
      const message = error instanceof Error ? error.message : 'Невідома помилка';
      toast.error(`Помилка перевірки: ${message}`);
    } finally {
      setCheckingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Перевірка статусу оплати...</p>
          {checkCount > 0 && (
            <p className="text-sm text-gray-400 mt-2">
              Перевірка {checkCount}/10
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Замовлення не знайдено</h1>
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
        {order.status === 'completed' && (
          <>
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">✅ Оплата успішна!</h1>
              <p className="text-gray-600 mb-4">Дякуємо за покупку через Monobank</p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-500">Товар</p>
                <p className="text-lg font-semibold text-gray-900">{String((order.product as Record<string, unknown> | undefined)?.name || 'N/A')}</p>

                <p className="text-sm text-gray-500 mt-3">Сума платежу</p>
                <p className="text-3xl font-bold text-gray-900">
                  {new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(Number(order.amount))}
                </p>

                <p className="text-xs text-gray-400 mt-2">Замовлення: {String(order.orderNumber)}</p>

                {order.cellNumber !== null && (
                  <p className="text-sm text-green-600 mt-2">
                    📦 Комірка #{String(order.cellNumber)}
                  </p>
                )}
              </div>
            </div>

            {/* Кнопка відкрити комірку */}
            {order.cellNumber !== null && (
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
        {order.status === 'pending' && (
          <>
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                <svg className="animate-spin h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">⏳ Очікування оплати</h1>
              <p className="text-gray-600 mb-4">Платіж обробляється Monobank...</p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-500">Сума платежу</p>
                <p className="text-3xl font-bold text-gray-900">
                  {new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(Number(order.amount))}
                </p>
              </div>

              <p className="text-xs text-gray-400">
                Автоматична перевірка: {checkCount}/10
              </p>
            </div>

            <button
              onClick={handleManualCheck}
              disabled={checkingPayment}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold mb-3 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {checkingPayment ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Перевірка...
                </>
              ) : (
                <>🔍 Перевірити статус оплати вручну</>
              )}
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              На головну
            </button>
          </>
        )}

        {/* FAILED */}
        {order.status === 'failed' && (
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
