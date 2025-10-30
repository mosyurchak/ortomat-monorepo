import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState('checking');
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [isOpeningCell, setIsOpeningCell] = useState(false);
  
  // ✅ ВИПРАВЛЕНО: LiqPay повертає параметр "order", а не "order_id"
  const { order } = router.query;

  useEffect(() => {
    if (order) {
      checkStatus();
    }
  }, [order]);

  const checkStatus = async () => {
    try {
      console.log('🔍 Checking payment status for:', order);
      
      // ✅ ВИПРАВЛЕНО: Викликаємо правильний API endpoint
      const response = await axios.get(`${API_URL}/api/liqpay/status/${order}`);
      console.log('✅ Payment status:', response.data);
      
      setPaymentInfo(response.data);
      
      if (response.data.status === 'SUCCESS') {
        setStatus('success');
      } else if (response.data.status === 'FAILED') {
        setStatus('failed');
      } else if (response.data.status === 'PENDING') {
        setStatus('pending');
        // Якщо ще pending - перевіряємо ще раз через 2 секунди
        setTimeout(checkStatus, 2000);
      }
    } catch (error) {
      console.error('❌ Error checking status:', error);
      setStatus('error');
    }
  };

  // ✅ ДОДАНО: Функція відкриття комірки
  const handleOpenCell = async () => {
    if (!paymentInfo?.sales || paymentInfo.sales.length === 0) {
      alert('Інформація про продаж відсутня');
      return;
    }

    const sale = paymentInfo.sales[0];
    
    if (!sale.ortomatId) {
      alert('Інформація про ортомат відсутня');
      return;
    }

    setIsOpeningCell(true);

    try {
      console.log('🔓 Opening cell for sale:', sale.id);

      // TODO: Замініть на ваш реальний endpoint для відкриття комірки
      await axios.post(`${API_URL}/api/ortomats/${sale.ortomatId}/open-cell`, {
        saleId: sale.id,
        productId: sale.productId,
      });

      alert('✅ Комірка відкрита! Заберіть ваш товар.');
      
      // Перенаправляємо на головну через 3 секунди
      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (err: any) {
      console.error('❌ Error opening cell:', err);
      alert('Помилка відкриття комірки. Спробуйте ще раз або зверніться до служби підтримки.');
    } finally {
      setIsOpeningCell(false);
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'checking':
        return {
          icon: '⏳',
          title: 'Перевіряємо статус платежу...',
          color: 'text-blue-600',
        };
      case 'success':
        return {
          icon: '✅',
          title: 'Платіж успішний!',
          color: 'text-green-600',
        };
      case 'failed':
        return {
          icon: '❌',
          title: 'Платіж не вдався',
          color: 'text-red-600',
        };
      case 'pending':
        return {
          icon: '⏰',
          title: 'Платіж в обробці',
          color: 'text-yellow-600',
        };
      default:
        return {
          icon: '⚠️',
          title: 'Помилка перевірки статусу',
          color: 'text-gray-600',
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <>
      <Head>
        <title>Статус платежу - Ортомат</title>
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
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">{statusInfo.icon}</div>
            
            <h1 className={`text-2xl font-bold mb-4 ${statusInfo.color}`}>
              {statusInfo.title}
            </h1>

            {paymentInfo && (
              <div className="bg-gray-50 rounded p-4 mb-6 text-left">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Номер замовлення:</strong> {paymentInfo.orderId}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Сума:</strong> {paymentInfo.amount} ₴
                </p>
                {paymentInfo.transactionId && (
                  <p className="text-sm text-gray-600">
                    <strong>ID транзакції:</strong> {paymentInfo.transactionId}
                  </p>
                )}
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">
                  Дякуємо за покупку! Ваше замовлення успішно оплачено.
                </p>

                {/* ✅ ДОДАНО: Кнопка відкриття комірки */}
                {paymentInfo?.sales && paymentInfo.sales.length > 0 && paymentInfo.sales[0].ortomatId && (
                  <div className="mb-6">
                    <button
                      onClick={handleOpenCell}
                      disabled={isOpeningCell}
                      className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isOpeningCell ? (
                        <>
                          <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Відкриваємо комірку...
                        </>
                      ) : (
                        <>
                          🔓 Відкрити комірку
                        </>
                      )}
                    </button>
                    <p className="mt-2 text-sm text-gray-500">
                      Натисніть щоб відкрити комірку та забрати товар
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                  <p className="font-semibold mb-2">💡 Що далі?</p>
                  <ol className="text-left space-y-1">
                    <li>1. Натисніть кнопку "Відкрити комірку"</li>
                    <li>2. Підійдіть до ортомату</li>
                    <li>3. Заберіть ваш товар з комірки</li>
                  </ol>
                </div>
              </div>
            )}

            {status === 'failed' && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  На жаль, платіж не пройшов. Спробуйте ще раз або
                  зверніться до служби підтримки.
                </p>
                <button
                  onClick={() => router.back()}
                  className="bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700"
                >
                  Спробувати знову
                </button>
              </div>
            )}

            {status === 'pending' && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Платіж обробляється. Будь ласка, зачекайте...
                </p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Не вдалося перевірити статус платежу. Спробуйте оновити сторінку.
                </p>
                <button
                  onClick={checkStatus}
                  className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700"
                >
                  Перевірити ще раз
                </button>
              </div>
            )}

            <div className="mt-8 space-x-4">
              <Link href="/" className="text-blue-600 hover:underline">
                На головну
              </Link>
              {status === 'success' && (
                <Link href="/profile" className="text-blue-600 hover:underline">
                  Мої замовлення
                </Link>
              )}
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
