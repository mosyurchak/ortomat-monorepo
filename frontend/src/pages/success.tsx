import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CheckCircle, MapPin, ShoppingBag, Clock, Home, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuccessPage() {
  const router = useRouter();
  const { orderId } = router.query;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cellOpening, setCellOpening] = useState(false);
  const [cellOpened, setCellOpened] = useState(false);

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

  const handleOpenCell = async () => {
    if (!order) return;

    setCellOpening(true);
    toast.loading('Opening cell...', { id: 'opening' });

    try {
      // Відправляємо запит на відкриття комірки
      const response = await fetch(`http://localhost:3001/orders/${orderId}/open-cell`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to open cell');
      }

      // Симулюємо відкриття комірки
      await new Promise(resolve => setTimeout(resolve, 2000));

      setCellOpening(false);
      setCellOpened(true);
      toast.success('Cell opened!', { id: 'opening' });
    } catch (error) {
      console.error('Error opening cell:', error);
      setCellOpening(false);
      toast.error('Failed to open cell. Please contact support.', { id: 'opening' });
    }
  };

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

  return (
    <div>
      <Head>
        <title>Order Complete - Ortomat</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-8 py-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Order Successful!
              </h1>
              <p className="text-green-100">
                Thank you for your purchase
              </p>
              <p className="text-green-100 text-sm mt-2">
                Order #{order.orderNumber}
              </p>
            </div>

            {/* Order Details */}
            <div className="px-8 py-6">
              {/* Cell Status */}
              <div className="mb-8">
                {!cellOpened && !cellOpening && (
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
                    <div className="text-center mb-4">
                      <div className="text-6xl mb-4">🚪</div>
                      <h2 className="text-xl font-semibold text-blue-900 mb-2">
                        Ready to collect your product?
                      </h2>
                      <p className="text-blue-700 mb-4">
                        Go to the ortomat and press the button below to open cell #{order.cellNumber}
                      </p>
                      
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start text-sm text-yellow-800">
                          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                          <div className="text-left">
                            <p className="font-semibold mb-1">Important:</p>
                            <p>Make sure you are at the ortomat before pressing the button. The cell will only stay open for 30 seconds.</p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleOpenCell}
                        className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors shadow-lg"
                      >
                        🔓 Open Cell #{order.cellNumber}
                      </button>
                    </div>
                  </div>
                )}

                {cellOpening && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                    <p className="text-blue-800 font-medium">Opening cell #{order.cellNumber}...</p>
                    <p className="text-blue-600 text-sm mt-1">Please wait a moment</p>
                  </div>
                )}

                {cellOpened && (
                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 text-center">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                    <p className="text-green-800 font-bold text-xl mb-2">Cell #{order.cellNumber} is now open!</p>
                    <p className="text-green-700 mb-4">Please collect your product within 30 seconds</p>
                    <div className="flex items-center justify-center text-sm text-green-600">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Cell will close automatically</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="border rounded-lg p-6 mb-6">
                <h2 className="font-semibold text-gray-900 mb-4">Your Purchase</h2>
                <div className="flex items-start">
                  <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0">
                    {order.product?.imageUrl ? (
                      <img
                        src={order.product.imageUrl}
                        alt={order.product.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">{order.product?.name}</p>
                    {order.product?.size && (
                      <p className="text-sm text-gray-600 mt-1">Size: {order.product.size}</p>
                    )}
                    <p className="text-lg font-bold text-primary-600 mt-2">
                      {order.amount} UAH
                    </p>
                  </div>
                </div>
              </div>

              {/* Pickup Location */}
              <div className="border rounded-lg p-6 mb-6">
                <h2 className="font-semibold text-gray-900 mb-4">Pickup Location</h2>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">Check the ortomat location</p>
                    <p className="text-sm text-gray-600 mt-1">Cell number: {order.cellNumber}</p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h2 className="font-semibold text-gray-900 mb-3">Next Steps</h2>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="font-bold text-primary-600 mr-2">1.</span>
                    <span>Go to the ortomat at the assigned location</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold text-primary-600 mr-2">2.</span>
                    <span>Press the "Open Cell" button above when you're ready</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold text-primary-600 mr-2">3.</span>
                    <span>Cell #{order.cellNumber} will open for 30 seconds</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold text-primary-600 mr-2">4.</span>
                    <span>Collect your product and inspect it</span>
                  </li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <Link
                  href="/"
                  className="flex-1 bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors text-center flex items-center justify-center"
                >
                  <Home className="h-5 w-5 mr-2" />
                  Back to Home
                </Link>
              </div>

              {/* Support */}
              <p className="text-center text-xs text-gray-500 mt-6">
                Need help? Contact support at support@ortomat.ua
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}