import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ArrowLeft, X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ProductPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id, ortomatId, ref } = router.query;
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isOrdering, setIsOrdering] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  // ✅ ДОДАНО: Стани для попапів
  const [showSizeChartModal, setShowSizeChartModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [purchaseTerms, setPurchaseTerms] = useState('');

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.getProduct(id as string),
    enabled: !!id,
  });

  // ✅ ДОДАНО: Завантаження глобальних умов покупки
  useEffect(() => {
    const loadPurchaseTerms = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/settings/purchase-terms`);
        setPurchaseTerms(response.data.purchaseTerms || '');
      } catch (error) {
        console.error('Error loading purchase terms:', error);
        setPurchaseTerms('Умови покупки тимчасово недоступні.');
      }
    };
    
    loadPurchaseTerms();
  }, []);

  const getEmbedUrl = (url: string) => {
    if (!url) return url;
    
    if (url.includes('youtube.com/watch')) {
      const videoId = new URL(url).searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    
    return url;
  };

  const isYouTubeVideo = (url: string) => {
    return url?.includes('youtube.com') || url?.includes('youtu.be');
  };

  const handleBuy = async () => {
    console.log('💳 Buy button clicked!');
    
    if (!ortomatId) {
      alert('Оберіть ортомат');
      return;
    }

    if (!acceptedTerms) {
      alert('Будь ласка, прийміть умови покупки');
      return;
    }

    setIsOrdering(true);

    try {
      const params = new URLSearchParams({
        productId: id as string,
        ortomatId: ortomatId as string,
      });

      if (ref) {
        params.append('doctorRef', ref as string);
      }

      console.log('🚀 Redirecting to payment with params:', params.toString());

      router.push(`/payment?${params.toString()}`);

    } catch (error: any) {
      console.error('❌ Error:', error);
      alert('Помилка. Спробуйте ще раз.');
      setIsOrdering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Завантаження товару...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Товар не знайдено</p>
          <Link href="/" className="mt-4 text-blue-600 hover:text-blue-700">
            На головну
          </Link>
        </div>
      </div>
    );
  }

  const images = [
    ...(product.mainImage ? [product.mainImage] : []),
    ...(product.images || [])
  ].filter(img => img);

  // ✅ ДОДАНО: Перевірка наявності хоч однієї характеристики
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
        <title>{product.name} - Ortomat</title>
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
                Назад до каталогу
              </button>
              <div className="flex items-center">
                <span className="text-xl font-bold text-gray-900">Ortomat</span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="md:flex">
              {/* Карусель зображень */}
              <div className="md:w-1/2">
                <div className="relative">
                  {images.length > 0 ? (
                    <>
                      <img
                        src={images[currentImageIndex]}
                        alt={product.name}
                        className="w-full h-96 object-cover"
                      />
                      
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={() => setCurrentImageIndex((prev) => 
                              prev === 0 ? images.length - 1 : prev - 1
                            )}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setCurrentImageIndex((prev) => 
                              prev === images.length - 1 ? 0 : prev + 1
                            )}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>

                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                            {images.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentImageIndex(index)}
                                className={`w-2 h-2 rounded-full transition-all ${
                                  index === currentImageIndex 
                                    ? 'bg-white w-8' 
                                    : 'bg-white bg-opacity-50'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-96 flex items-center justify-center bg-gray-100">
                      <svg className="h-32 w-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="flex gap-2 p-4 overflow-x-auto">
                    {images.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded border-2 overflow-hidden ${
                          index === currentImageIndex 
                            ? 'border-blue-600' 
                            : 'border-gray-200'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Інформація про товар */}
              <div className="md:w-1/2 p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {product.name}
                </h1>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-blue-600">
                    {product.price} ₴
                  </span>
                </div>

                {/* Опис */}
                {product.description && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      Опис товару
                    </h2>
                    <div 
                      className="text-gray-600 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                  </div>
                )}

                {/* ✅ ДОДАНО: Характеристики з новими полями */}
                {hasCharacteristics && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      Характеристики
                    </h2>
                    <div className="space-y-2">
                      {product.manufacturer && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">Виробник:</span>
                          <span className="font-medium">{product.manufacturer}</span>
                        </div>
                      )}
                      {product.country && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">Країна:</span>
                          <span className="font-medium">{product.country}</span>
                        </div>
                      )}
                      {product.material && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">Матеріал:</span>
                          <span className="font-medium">{product.material}</span>
                        </div>
                      )}
                      {product.color && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">Колір:</span>
                          <span className="font-medium">{product.color}</span>
                        </div>
                      )}
                      {product.type && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">Тип:</span>
                          <span className="font-medium">{product.type}</span>
                        </div>
                      )}
                      {product.size && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">Розмір:</span>
                          <span className="font-medium">{product.size}</span>
                        </div>
                      )}
                      
                      {/* ✅ ДОДАНО: Кнопка "Таблиця розмірів" */}
                      {product.sizeChartUrl && (
                        <div className="pt-2">
                          <button
                            onClick={() => setShowSizeChartModal(true)}
                            className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Таблиця розмірів
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Відео */}
                {product.videoUrl && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      Відео огляд
                    </h2>
                    {isYouTubeVideo(product.videoUrl) ? (
                      <div className="aspect-video rounded-lg overflow-hidden">
                        <iframe
                          src={getEmbedUrl(product.videoUrl)}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="Product video"
                        />
                      </div>
                    ) : (
                      <video 
                        src={product.videoUrl} 
                        controls 
                        className="w-full rounded-lg"
                      >
                        Ваш браузер не підтримує відео
                      </video>
                    )}
                  </div>
                )}

                {/* ✅ ДОДАНО: Умови покупки з лінком на popup */}
                <div className="mb-6">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 mr-3 w-4 h-4"
                    />
                    <span className="text-sm text-gray-600">
                      Я приймаю{' '}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        умови
                      </button>
                      {' '}покупки
                    </span>
                  </label>
                </div>

                {/* Кнопка покупки */}
                <button
                  onClick={handleBuy}
                  disabled={isOrdering || !acceptedTerms}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isOrdering ? 'Обробка...' : 'Купити зараз'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ✅ ДОДАНО: Modal таблиці розмірів */}
      {showSizeChartModal && product.sizeChartUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowSizeChartModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-bold mb-4">Таблиця розмірів</h2>
            <div className="flex justify-center">
              <img 
                src={product.sizeChartUrl} 
                alt="Таблиця розмірів"
                className="max-w-full h-auto rounded-lg"
              />
            </div>
            <button
              onClick={() => setShowSizeChartModal(false)}
              className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Закрити
            </button>
          </div>
        </div>
      )}

      {/* ✅ ДОДАНО: Modal умов покупки */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto relative">
            <button
              onClick={() => setShowTermsModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-bold mb-4">Умови покупки</h2>
            <div className="text-gray-700 whitespace-pre-wrap">
              {/* Показуємо специфічні умови товару або глобальні */}
              {product.termsAndConditions || purchaseTerms || 'Умови покупки не вказано'}
            </div>
            <button
              onClick={() => setShowTermsModal(false)}
              className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Закрити
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  };
}
