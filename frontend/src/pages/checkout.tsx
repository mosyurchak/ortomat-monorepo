import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { productsApi, ortomatsApi } from '../lib/api';
import { ArrowLeft, ShoppingBag, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const router = useRouter();
  const { product: productId, ortomat: ortomatId, ref } = router.query;
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: product } = useQuery(
    ['product', productId],
    () => productsApi.getOne(productId as string),
    { enabled: !!productId }
  );

  const { data: ortomat } = useQuery(
    ['ortomat', ortomatId],
    () => ortomatsApi.getOne(ortomatId as string),
    { enabled: !!ortomatId }
  );

  const productData = product?.data;
  const ortomatData = ortomat?.data;

  // Замініть функцію handlePayment в checkout.tsx на цю:

const handlePayment = async () => {
  if (!acceptedTerms) {
    toast.error('Please accept the terms and conditions');
    return;
  }

  setIsProcessing(true);

  try {
    // Створюємо замовлення через новий API
    const response = await fetch('http://localhost:3001/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: productId,
        ortomatId: ortomatId,
        referralCode: ref || undefined,
        customerPhone: undefined, // можна додати поле для телефону
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create order');
    }

    const order = await response.json();
    
    toast.success('Order created! Redirecting to payment...');
    
    // Переходимо на payment з orderId
    setTimeout(() => {
      router.push(`/payment?orderId=${order.id}`);
    }, 500);
    
  } catch (error) {
    console.error('Order creation failed:', error);
    toast.error('Failed to create order');
    setIsProcessing(false);
  }
};

  if (!productData || !ortomatData) {
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
        <title>Checkout - Ortomat</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </button>
              <div className="flex items-center">
                <ShoppingBag className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Checkout</span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h1>

            {/* Product Info */}
            <div className="border-b pb-6 mb-6">
              <div className="flex items-start">
                <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0">
                  {productData.imageUrl ? (
                    <img
                      src={productData.imageUrl}
                      alt={productData.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{productData.name}</h3>
                  {productData.size && (
                    <p className="text-sm text-gray-600 mt-1">Size: {productData.size}</p>
                  )}
                  <p className="text-2xl font-bold text-primary-600 mt-2">
                    {productData.price} UAH
                  </p>
                </div>
              </div>
            </div>

            {/* Pickup Location */}
            <div className="border-b pb-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Pickup Location</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">{ortomatData.name}</p>
                <p className="text-sm text-gray-600 mt-1">{ortomatData.address}</p>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Terms and Conditions</h2>
              <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto mb-4">
                <p className="text-sm text-gray-700">
                  By purchasing this product, you agree to the following terms:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-700 mt-2 space-y-1">
                  <li>Payment is processed securely through LiqPay</li>
                  <li>After successful payment, the ortomat cell will open automatically</li>
                  <li>You have 30 seconds to collect your product after the cell opens</li>
                  <li>No refunds after the cell has been opened</li>
                  <li>Products are sold as-is, please inspect before leaving</li>
                  <li>Contact support if you experience any issues</li>
                </ul>
              </div>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  I have read and accept the terms and conditions
                </span>
              </label>
            </div>

            {/* Total */}
            <div className="border-t pt-6 mb-6">
              <div className="flex justify-between text-lg">
                <span className="font-medium text-gray-900">Total:</span>
                <span className="font-bold text-primary-600">{productData.price} UAH</span>
              </div>
            </div>

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={!acceptedTerms || isProcessing}
              className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Proceed to Payment
                </>
              )}
            </button>

            <p className="mt-4 text-xs text-gray-500 text-center">
              Secure payment powered by LiqPay
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}