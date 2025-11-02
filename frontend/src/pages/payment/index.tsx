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
  const [cellNumber, setCellNumber] = useState<number | null>(null); // ✅ ДОДАНО
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      
      // ✅ ДОДАНО: Знаходимо номер комірки
      console.log('🔍 Finding cell number for product...');
      try {
        const inventoryResponse = await axios.get(`${API_URL}/api/ortomats/${ortomatId}/inventory`);
        console.log('✅ Inventory loaded:', inventoryResponse.data);
        
        // Знаходимо комірку з цим товаром
        const cell = inventoryResponse.data.cells?.find((c: any) => 
          c.productId === productId && c.currentStock > 0
        );
        
        if (cell) {
          setCellNumber(cell.cellNumber);
          console.log(`✅ Cell number found: ${cell.cellNumber}`);
        } else {
          console.warn('⚠️ Cell with this product not found or out of stock');
          setError('Товар закінчився в автоматі');
        }
      } catch (err) {
        console.error('❌ Error loading inventory:', err);
        // Не критична помилка - продовжуємо без cellNumber
      }
      
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

    // ✅ ДОДАНО: Попередження якщо немає cellNumber
    if (cellNumber === null) {
      console.warn('⚠️ Cell number is missing, payment will proceed without it');
    }

    try {
      setLoading(true);
      console.log('🔄 Creating payment...');
      
      // Генеруємо унікальний ID замовлення
      const orderId = `ORD_${Date.now()}`;
      console.log('🆔 Order ID:', orderId);
      
      // Підготовка даних для платежу
      const paymentParams = {
        orderId: orderId,
        amount: product.price,
        description: `Товар: ${product.name}, Ортомат: ${ortomat.name}`,
        doctorId: doctorRef as string,
        productId: product.id,
        ortomatId: ortomat.id,
        cellNumber: cellNumber ?? undefined, // ✅ ДОДАНО
      };
      
      console.log('📋 Payment params:', paymentParams);
      console.log(`✅ Cell number: ${cellNumber !== null ? cellNumber : 'NOT AVAILABLE'}`);
      
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

  // Loading/Error states...
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Завантаження...</p>
        </div>
      </div>
    );
  }

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
          <div className="bg-blue-500 text-white py-6 px-8">
            <h1 className="text-2xl font-bold">Оплата товару</h1>
          </div>

          <div className="p-8">
            {product.imageUrl && (
              <div className="mb-6">
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
            )}

            <div className="mb-6 pb-6 border-b">
              <h2 className="text-sm text-gray-500 mb-2">Товар</h2>
              <p className="text-xl font-semibold">{product.name}</p>
              {product.description && (
                <p className="text-gray-600 mt-1">{product.description}</p>
              )}
            </div>

            <div className="mb-6 pb-6 border-b">
              <h2 className="text-sm text-gray-500 mb-2">Ортомат</h2>
              <p className="text-xl font-semibold">{ortomat.name}</p>
              <p className="text-gray-600 mt-1">
                {ortomat.address}
                {ortomat.city && `, ${ortomat.city}`}
              </p>
              {cellNumber !== null && (
                <p className="text-sm text-green-600 mt-2">
                  📦 Комірка №{cellNumber}
                </p>
              )}
            </div>

            <div className="mb-8">
              <h2 className="text-sm text-gray-500 mb-2">Сума до сплати</h2>
              <p className="text-3xl font-bold text-blue-600">
                {product.price} ₴
              </p>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-blue-500 text-white py-4 rounded-lg text-lg font-semibold hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? 'Обробка...' : 'Оплатити'}
            </button>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>🔒 Захищено платіжною системою LiqPay</p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.back()}
            className="text-blue-500 hover:text-blue-600 underline"
          >
            ← Повернутися до вибору товару
          </button>
        </div>
      </div>
    </div>
  );
}
