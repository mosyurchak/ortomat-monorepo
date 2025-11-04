// frontend/src/pages/payment/index.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Head from 'next/head';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  size?: string;
  mainImage?: string;
  imageUrl?: string;
  // Характеристики
  manufacturer?: string;
  country?: string;
  material?: string;
  color?: string;
  type?: string;
}

interface Ortomat {
  id: string;
  name: string;
  address: string;
  city?: string;
}

export default function PaymentPage() {
  const router = useRouter();
  const { productId, ortomatId, doctorRef } = router.query;
  const [customerPhone, setCustomerPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/products/${productId}`);
      return response.data;
    },
    enabled: !!productId,
  });

  const { data: ortomat, isLoading: ortomatLoading } = useQuery({
    queryKey: ['ortomat', ortomatId],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/ortomats/${ortomatId}`);
      return response.data;
    },
    enabled: !!ortomatId,
  });

  useEffect(() => {
    if (!productId || !ortomatId) {
      console.error('❌ Missing productId or ortomatId');
      router.push('/');
    }
  }, [productId, ortomatId, router]);

  const handlePayment = async () => {
    if (!customerPhone || customerPhone.length < 10) {
      alert('Будь ласка, введіть коректний номер телефону');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('🚀 Creating payment with params:', {
        productId,
        ortomatId,
        customerPhone,
        doctorRef,
      });

      const response = await axios.post(`${API_URL}/api/payments/create`, {
        productId,
        ortomatId,
        customerPhone,
        referralCode: doctorRef || undefined,
      });

      console.log('✅ Payment response:', response.data);

      if (response.data.paymentUrl) {
        console.log('🔗 Redirecting to LiqPay:', response.data.paymentUrl);
        window.location.href = response.data.paymentUrl;
      } else {
        throw new Error('No payment URL received');
      }
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      alert('Помилка створення платежу: ' + (error.response?.data?.message || error.message));
      setIsProcessing(false);
    }
  };

  if (productLoading || ortomatLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Завантаження...</p>
        </div>
      </div>
    );
  }

  if (!product || !ortomat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Товар або ортомат не знайдено</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Повернутися на головну
          </button>
        </div>
      </div>
    );
  }

  // ✅ ДОДАНО: Перевірка наявності характеристик
  const hasCharacteristics = !!(
    product.manufacturer ||
    product.country ||
    product.material ||
    product.color ||
    product.type ||
    product.size
  );

  return (
    <div>
      <Head>
        <title>Оплата - {product.name}</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              💳 Оплата товару
            </h1>
            <p className="text-gray-600">
              Заповніть дані для завершення покупки
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Product Info */}
            <div className="p-6 border-b">
              <div className="flex items-start gap-6">
                {/* Product Image */}
                <div className="flex-shrink-0">
                  {product.mainImage || product.imageUrl ? (
                    <img
                      src={product.mainImage || product.imageUrl}
                      alt={product.name}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {product.name}
                  </h2>
                  <p className="text-3xl font-bold text-blue-600 mb-4">
                    {product.price} ₴
                  </p>

                  {/* ✅ ОНОВЛЕНО: Показуємо характеристики замість опису */}
                  {hasCharacteristics && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Характеристики:
                      </h3>
                      <div className="space-y-2 text-sm">
                        {product.manufacturer && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Виробник:</span>
                            <span className="font-medium text-gray-900">{product.manufacturer}</span>
                          </div>
                        )}
                        {product.country && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Країна:</span>
                            <span className="font-medium text-gray-900">{product.country}</span>
                          </div>
                        )}
                        {product.material && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Матеріал:</span>
                            <span className="font-medium text-gray-900">{product.material}</span>
                          </div>
                        )}
                        {product.color && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Колір:</span>
                            <span className="font-medium text-gray-900">{product.color}</span>
                          </div>
                        )}
                        {product.type && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Тип:</span>
                            <span className="font-medium text-gray-900">{product.type}</span>
                          </div>
                        )}
                        {product.size && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Розмір:</span>
                            <span className="font-medium text-gray-900">{product.size}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ortomat Info */}
            <div className="p-6 bg-blue-50 border-b">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                📍 Пункт видачі
              </h3>
              <div className="space-y-2">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">{ortomat.name}</p>
                    <p className="text-sm text-gray-600">{ortomat.address}</p>
                    {ortomat.city && (
                      <p className="text-sm text-gray-600">{ortomat.city}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📱 Ваші контактні дані
              </h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Номер телефону *
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+380XXXXXXXXX"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  На цей номер надійде SMS з кодом доступу до комірки
                </p>
              </div>

              {/* Payment Info */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Важлива інформація:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Оплата здійснюється через LiqPay</li>
                      <li>Після оплати ви отримаєте SMS з кодом доступу</li>
                      <li>Товар необхідно забрати протягом 24 годин</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Payment Button */}
              <button
                onClick={handlePayment}
                disabled={isProcessing || !customerPhone}
                className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Обробка...
                  </>
                ) : (
                  <>
                    🔒 Оплатити {product.price} ₴
                  </>
                )}
              </button>

              <p className="mt-4 text-sm text-center text-gray-500">
                Натискаючи "Оплатити", ви будете перенаправлені на сторінку LiqPay
              </p>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Повернутися назад
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
