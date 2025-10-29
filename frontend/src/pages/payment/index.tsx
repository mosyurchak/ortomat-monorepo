// frontend/src/pages/payment/index.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createPayment, openLiqPayWidget } from '../../lib/liqpay';
import api from '../../lib/api';

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

  useEffect(() => {
    if (productId && ortomatId) {
      loadData();
    }
  }, [productId, ortomatId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Завантажуємо товар
      const productResponse = await api.get(`/products/${productId}`);
      setProduct(productResponse.data);
      
      // Завантажуємо ортомат
      const ortomatResponse = await api.get(`/ortomats/${ortomatId}`);
      setOrtomat(ortomatResponse.data);
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Помилка завантаження даних');
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!product || !ortomat) {
      setError('Дані про товар або ортомат не завантажені');
      return;
    }

    try {
      setLoading(true);
      
      // Генеруємо унікальний ID замовлення
      const orderId = `ORD_${Date.now()}`;
      
      // Створюємо платіж з РЕАЛЬНИМИ даними
      const paymentData = await createPayment({
        orderId: orderId,
        amount: product.price,  // ✅ Реальна ціна
        description: `Товар: ${product.name}, Ортомат: ${ortomat.name}`,  // ✅ Реальний опис
        doctorId: doctorRef as string,
        productId: product.id,   // ✅ ID товару
        ortomatId: ortomat.id,   // ✅ ID ортомату
      });
      
      // Відкриваємо форму оплати LiqPay
      openLiqPayWidget(paymentData);
      
    } catch (err) {
      console.error('Payment error:', err);
      setError('Помилка створення платежу. Спробуйте ще раз.');
      setLoading(false);
    }
  };

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 text-xl">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Повернутися назад
          </button>
        </div>
      </div>
    );
  }

  if (!product || !ortomat) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Товар або ортомат не знайдено</p>
      </div>
    );
  }

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
              className="w-full bg-blue-500 text-white py-4 rounded-lg text-lg font-semibold hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Обробка...' : 'Оплатити'}
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
