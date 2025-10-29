import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { checkPaymentStatus } from '../../lib/liqpay';
import Head from 'next/head';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState('checking');
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  
  const { order_id } = router.query;

  useEffect(() => {
    if (order_id) {
      checkStatus();
    }
  }, [order_id]);

  const checkStatus = async () => {
    try {
      const result = await checkPaymentStatus(order_id as string);
      setPaymentInfo(result);
      
      if (result.status === 'SUCCESS') {
        setStatus('success');
      } else if (result.status === 'FAILED') {
        setStatus('failed');
      } else {
        setStatus('pending');
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setStatus('error');
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
                <p className="text-gray-600">
                  Дякуємо за покупку! Ваше замовлення успішно оплачено.
                </p>
                <p className="text-sm text-gray-500">
                  Ви можете забрати товар з ортомату, використовуючи код,
                  який був відправлений на ваш email.
                </p>
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
