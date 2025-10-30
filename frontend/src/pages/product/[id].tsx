import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

export default function ProductPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id, ortomatId, ref } = router.query;
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isOrdering, setIsOrdering] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.getProduct(id as string),
    enabled: !!id,
  });

  // Функція для конвертації YouTube URL в embed формат
  const getEmbedUrl = (url: string) => {
    if (!url) return url;
    
    // YouTube: https://www.youtube.com/watch?v=VIDEO_ID
    if (url.includes('youtube.com/watch')) {
      const videoId = new URL(url).searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    
    // YouTube short: https://youtu.be/VIDEO_ID
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    
    // Для прямих відео (.mp4, .webm) залишаємо як є
    return url;
  };

  // Перевірка чи це YouTube відео
  const isYouTubeVideo = (url: string) => {
    return url?.includes('youtube.com') || url?.includes('youtu.be');
  };

  const handleBuy = async () => {
    console.log('💳 Buy button clicked!');
    console.log('Current params:', { id, ortomatId, ref });
    
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
      // ✅ ВИПРАВЛЕНО: Переходимо на payment з правильними параметрами
      const params = new URLSearchParams({
        productId: id as string,
        ortomatId: ortomatId as string,
      });

      // Додаємо реферальний код якщо є
      if (ref) {
        params.append('doctorRef', ref as string);
      }

      console.log('🚀 Redirecting to payment with params:', params.toString());

      // Переходимо на сторінку оплати
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
          <p className="mt-4 text-gray-600">{t('product.loadingProduct')}</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">{t('product.notFound')}</p>
          <Link href="/" className="mt-4 text-blue-600 hover:text-blue-700">
            {t('product.backToHome')}
          </Link>
        </div>
      </div>
    );
  }

  const images = [
    ...(product.mainImage ? [product.mainImage] : []),
    ...(product.images || [])
  ].filter(img => img);

  const hasCharacteristics = !!(product.color || product.size || product.material || product.manufacturer);

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
                {t('product.backToCatalog')}
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
                    {product.price} {t('common.currency')}
                  </span>
                </div>

                {/* Опис */}
                {product.description && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      {t('product.description')}
                    </h2>
                    <div 
                      className="text-gray-600 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                  </div>
                )}

                {/* Характеристики */}
                {hasCharacteristics && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      {t('product.characteristics')}
                    </h2>
                    <div className="space-y-2">
                      {product.color && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">{t('product.color')}:</span>
                          <span className="font-medium">{product.color}</span>
                        </div>
                      )}
                      {product.size && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">{t('common.size')}:</span>
                          <span className="font-medium">{product.size}</span>
                        </div>
                      )}
                      {product.material && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">{t('product.material')}:</span>
                          <span className="font-medium">{product.material}</span>
                        </div>
                      )}
                      {product.manufacturer && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">{t('product.manufacturer')}:</span>
                          <span className="font-medium">{product.manufacturer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Відео */}
                {product.videoUrl && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      {t('product.video')}
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

                {/* Умови покупки */}
                <div className="mb-6">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 mr-3 w-4 h-4"
                    />
                    <span className="text-sm text-gray-600">
                      Я приймаю умови покупки{' '}
                      {product.termsAndConditions && (
                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          className="text-blue-600 hover:underline"
                        >
                          ({t('common.viewDetails')})
                        </button>
                      )}
                    </span>
                  </label>
                </div>

                {/* Кнопка покупки */}
                <button
                  onClick={handleBuy}
                  disabled={isOrdering || !acceptedTerms}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isOrdering ? t('product.processing') : t('product.buyNow')}
                </button>

                <p className="mt-4 text-sm text-gray-500 text-center">
                  {t('product.securePayment')}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal з умовами покупки */}
      {showTermsModal && product.termsAndConditions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">{t('product.terms')}</h2>
            <div className="text-gray-700 whitespace-pre-wrap">
              {product.termsAndConditions}
            </div>
            <button
              onClick={() => setShowTermsModal(false)}
              className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              {t('common.close')}
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
