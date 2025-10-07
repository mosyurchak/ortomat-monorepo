// Замініть початок payment.tsx на це:

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ShoppingBag, CreditCard, Lock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentPage() {
  const router = useRouter();
  const { orderId } = router.query; // ⭐ Тепер отримуємо orderId
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Завантажуємо замовлення
  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const response = await fetch(`http://localhost:3001/orders/${orderId}`);
      if (!response.ok) throw new Error('Order not found');
      
      const data = await response.json();
      setOrder(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load order:', error);
      toast.error('Order not found');
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setPaymentProcessing(true);

    try {
      // Ініціюємо оплату
      await fetch(`http://localhost:3001/orders/${orderId}/pay`, {
        method: 'POST',
      });

      // Симулюємо обробку платежу (stub)
      setTimeout(async () => {
        // Відправляємо callback (імітуємо LiqPay)
        await fetch('http://localhost:3001/orders/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: orderId,
            status: 'success',
            paymentId: `PAY-${Date.now()}`,
          }),
        });

        setPaymentProcessing(false);
        setPaymentSuccess(true);
        toast.success('Payment successful!');
        
        // Redirect to success page
        setTimeout(() => {
          router.push(`/success?orderId=${orderId}`);
        }, 2000);
      }, 3000);
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment failed');
      setPaymentProcessing(false);
    }
  };

  useEffect(() => {
    // Auto-trigger payment when order is loaded
    if (order) {
      handlePayment();
    }
  }, [order]);

  if (loading || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Далі ваш існуючий JSX, але замініть productData на order.product
  // і ortomatData на order.ortomat
  
  return (
    <div>
      <Head>
        <title>Payment Processing - Ortomat</title>
      </Head>

      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                {paymentSuccess ? (
                  <CheckCircle className="h-8 w-8 text-primary-600" />
                ) : (
                  <CreditCard className="h-8 w-8 text-primary-600" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {paymentSuccess ? 'Payment Successful!' : 'Processing Payment...'}
              </h1>
              <p className="text-gray-600 mt-2">
                {paymentSuccess 
                  ? 'Your payment has been processed successfully'
                  : 'Please wait while we process your payment'
                }
              </p>
            </div>

            {/* Payment Info */}
            <div className="border-t border-b py-6 mb-6">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0">
                  {order.product?.imageUrl ? (
                    <img
                      src={order.product.imageUrl}
                      alt={order.product.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <p className="font-medium text-gray-900">{order.product?.name}</p>
                  <p className="text-sm text-gray-600">Order #{order.orderNumber}</p>
                </div>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900">Total:</span>
                <span className="text-primary-600">{order.amount} UAH</span>
              </div>
            </div>

            {/* Processing Animation */}
            {paymentProcessing && (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-600">Connecting to LiqPay...</p>
                <p className="text-xs text-gray-500 mt-2">This may take a few moments</p>
              </div>
            )}

            {/* Success Message */}
            {paymentSuccess && (
              <div className="text-center py-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-800 font-medium">Payment completed!</p>
                  <p className="text-green-600 text-sm mt-1">
                    Redirecting to pickup instructions...
                  </p>
                </div>
              </div>
            )}

            {/* Security Badge */}
            <div className="flex items-center justify-center text-xs text-gray-500">
              <Lock className="h-3 w-3 mr-1" />
              <span>Secured by LiqPay</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}