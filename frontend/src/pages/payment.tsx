import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTranslation } from '../hooks/useTranslation';

export default function PaymentPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { orderId } = router.query;
  const [processing, setProcessing] = useState(false);

  // ✅ Завантажити дані замовлення
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.getOrder(orderId as string),
    enabled: !!orderId,
  });

  // ✅ Обробка оплати
  const paymentMutation = useMutation({
    mutationFn: (orderId: string) => api.processPayment(orderId),
    onSuccess: () => {
      // Stub оплата завжди успішна
      setTimeout(() => {
        router.push(`/success?orderId=${orderId}`);
      }, 1000);
    },
    onError: (error: any) => {
      alert(`${t('payment.paymentError')}: ${error.message}`);
      setProcessing(false);
    },
  });

  const handlePayment = () => {
    if (!orderId) return;
    
    setProcessing(true);
    
    // Stub: симулюємо оплату через LiqPay
    setTimeout(() => {
      paymentMutation.mutate(orderId as string);
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">{t('payment.loadingOrder')}</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">
            {t('payment.orderNotFound')}
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700"
          >
            {t('payment.backToHome')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('payment.title')}
            </h1>
            <p className="text-gray-600">
              #{order.orderNumber}
            </p>
          </div>

          <div className="border-t border-b border-gray-200 py-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">{t('payment.product')}:</span>
              <span className="font-medium">{order.product?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">{t('payment.ortomat')}:</span>
              <span className="font-medium">{order.ortomat?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t('payment.cell')}:</span>
              <span className="font-medium">#{order.cellNumber}</span>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xl font-semibold">{t('payment.toPay')}:</span>
              <span className="text-3xl font-bold text-gray-900">
                {order.amount} {t('common.currency')}
              </span>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={processing || paymentMutation.isPending}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {processing || paymentMutation.isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('payment.processing')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                {t('payment.payButton')}
              </>
            )}
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            {t('payment.testMode')}
          </p>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}