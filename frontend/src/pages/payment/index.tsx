// frontend/src/pages/payment/index.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createPayment, openLiqPayWidget } from '../../lib/liqpay';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl?: string;
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
  
  const [product, setProduct] = useState<Product | null>(null);
  const [ortomat, setOrtomat] = useState<Ortomat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 🔍 ДЕБАГ: Логування параметрів при завантаженні
  useEffect(() => {
    console.log('=== PAYMENT PAGE LOADED ===');
    console.log('Query params:', { productId, ortomatId, doctorRef });
    console.log('API_URL:', API_URL);
  }, []);

  useEffect(() => {
    if (productId && ortomatId) {
      console.log('🔄 Starting to load data...');
      loadData();
    } else {
      console.log('⚠️ Missing params:', { productId, ortomatId });
      if (!productId) setError('Не вказано ID товару');
      else if (!ortomatId) setError('Не вказано ID ортомату');
      setLoading(false);
    }
  }, [productId, ortomatId]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('📦 Loading product:', productId);
      
      // Завантажуємо товар
      const productResponse = await axios.get(`${API_URL}/api/products/${productId}`);
      console.log('✅ Product loaded:', productResponse.data);
      setProduct(productResponse.data);
      
      console.log('🏢 Loading ortomat:', ortomatId);
      
      // Завантажуємо ортомат
      const ortomatResponse = await axios.get(`${API_URL}/api/ortomats/${ortomatId}`);
      console.log('✅ Ortomat loaded:', ortomatResponse.data);
      setOrtomat(ortomatResponse.data);
      
      console.log('✅ All data loaded successfully!');
      setLoading(false);
    } catch (err: any) {
      console.error('❌ Error loading data:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      
      if (err.response?.status === 404) {
        setError('Товар або ортомат не знайдено');
      } else if (err.response?.status === 500) {
        setError('Помилка сервера. Спробуйте пізніше.');
      } else {
        setError('Помилка завантаження даних. Перевірте підключення до інтернету.');
      }
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    console.log('💳 Payment button clicked!');
    
    if (!product || !ortomat) {
      console.error('❌ Missing data:', { product, ortomat });
      setError('Дані про товар або ортомат не завантажені');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Creating payment...');
      
      // Генеруємо унікальний ID замовлення
      const orderId = `ORD_${Date.now()}`;
      console.log('📝 Order ID:', orderId);
      
      // Підготовка даних для платежу
      const paymentParams = {
        orderId: orderId,
        amount: product.price,
        description: `Товар: ${product.name}, Ортомат: ${ortomat.name}`,
        doctorId: doctorRef as string,
        productId: product.id,
        ortomatId: ortomat.id,
      };
      
      console.log('📋 Payment params:', paymentParams);
      
      // Створюємо платіж
      console.log('🌐 Calling createPayment API...');
      const paymentData = await createPayment(paymentParams);
      console.log('✅ Payment data received:', paymentData);
      
      // Відкриваємо форму оплати LiqPay
      console.log('🚀 Opening LiqPay widget...');
      openLiqPayWidget(paymentData);
      console.log('✅ LiqPay widget opened!');
      
    } catch (err: any) {
      console.error('❌ Payment error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      
      if (err.response?.status === 400) {
        setError('Невірні дані платежу. Перевірте правильність інформації.');
      } else if (err.response?.status === 500) {
        setError('Помилка створення платежу на сервері.');
      } else if (err.message?.includes('Network')) {
        setError('Помилка підключення. Перевірте інтернет.');
      } else {
        setError('Помилка створення платежу. Спробуйте ще раз.');
      }
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Завантаження...</p>
          <p className="mt-2 text-sm text-gray-400">
            {!product && !ortomat && 'Завантаження даних...'}
            {product && !ortomat && 'Завантаження інформації про ортомат...'}
            {product && ortomat && 'Обробка платежу...'}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Помилка</h2>
          <p className="text-red-500 text-lg mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Повернутися назад
          </button>
        </div>
      </div>
    );
  }

  // Missing data state
  if (!product || !ortomat) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 text-xl mb-4">Товар або ортомат не знайдено</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            На головну
          </button>
        </div>
      </div>
    );
  }

  // Main payment page
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-500 text-white py-6 px-8">
            <h1 className="text-2xl font-bold">Оплата товару</h1>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Зображення товару */}
            {product.imageUrl && (
              <div className="mb-6">
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-64 object-cover rounded-lg"
                  onError={(e) => {
                    console.log('❌ Image failed to load:', product.imageUrl);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Товар */}
            <div className="mb-6 pb-6 border-b">
              <h2 className="text-sm text-gray-500 mb-2">Товар</h2>
              <p className="text-xl font-semibold">{product.name}</p>
              {product.description && (
                <p className="text-gray-600 mt-1">{product.description}</p>
              )}
            </div>

            {/* Ортомат */}
            <div className="mb-6 pb-6 border-b">
              <h2 className="text-sm text-gray-500 mb-2">Ортомат</h2>
              <p className="text-xl font-semibold">{ortomat.name}</p>
              <p className="text-gray-600 mt-1">
                {ortomat.address}
                {ortomat.city && `, ${ortomat.city}`}
              </p>
            </div>

            {/* Сума */}
            <div className="mb-8">
              <h2 className="text-sm text-gray-500 mb-2">Сума до сплати</h2>
              <p className="text-3xl font-bold text-blue-600">
                {product.price} ₴
              </p>
            </div>

            {/* Кнопка оплати */}
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-blue-500 text-white py-4 rounded-lg text-lg font-semibold hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Обробка...
                </>
              ) : (
                'Оплатити'
              )}
            </button>

            {/* Інформація про безпеку */}
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>🔒 Захищено платіжною системою LiqPay</p>
            </div>
          </div>
        </div>

        {/* Кнопка повернення */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              console.log('⬅️ Going back...');
              router.back();
            }}
            className="text-blue-500 hover:text-blue-600 underline"
          >
            ← Повернутися до вибору товару
          </button>
        </div>

        {/* Debug info (видаліть в продакшн) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 bg-gray-100 rounded-lg p-4 text-xs">
            <p className="font-bold mb-2">🔍 Debug Info:</p>
            <p>Product ID: {productId}</p>
            <p>Ortomat ID: {ortomatId}</p>
            <p>Doctor Ref: {doctorRef || 'N/A'}</p>
            <p>API URL: {API_URL}</p>
          </div>
        )}
      </div>
    </div>
  );
}
