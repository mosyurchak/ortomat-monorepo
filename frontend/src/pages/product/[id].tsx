import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ArrowLeft } from 'lucide-react';
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

  const handleBuy = async () => {
    if (!ortomatId) {
      alert(t('product.ortomatMissing'));
      return;
    }

    if (!acceptedTerms) {
      alert(t('product.acceptTermsError'));
      return;
    }

    setIsOrdering(true);

    try {
      const orderData = {
        productId: id as string,
        ortomatId: ortomatId as string,
        referralCode: ref as string | undefined,
      };

      const order = await api.createOrder(orderData);
      router.push(`/payment?orderId=${order.id}`);
    } catch (error: any) {
      console.error('❌ Order creation failed:', error);
      alert('Помилка при створенні замовлення. Спробуйте ще раз.');
      setIsOrdering(false);
    }
  };

  // ✅ Функція для автоматичної конвертації відео
  const getEmbedUrl = (url: string) => {
    if (!url) return url;

    // YouTube
    if (url.includes('youtube.com/watch')) {
      const videoId = new URL(url).searchParams.get('v');
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // Для прямих відео (.mp4, .webm) залишаємо як є
    return url;
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
                    </>
                  ) : (
                    <div className="w-full h-96 flex items-center justify-center bg-gray-100">
                      <svg className="h-32 w-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Інформація про товар */}
              <div className="md:w-1/2 p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-blue-600">
                    {product.price} {t('common.currency')}
                  </span>
                </div>

                {/* Артикул */}
                {product.sku && (
                  <p className="text-gray-500 mb-2">
                    <strong>{t('product.sku')}:</strong> {product.sku}
                  </p>
                )}

                {/* Опис */}
                {product.description && (
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">{t('product.description')}</h2>
                    <div
                      className="text-gray-700 prose prose-sm"
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                  </div>
                )}

                {/* Характеристики */}
                {hasCharacteristics && (
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">{t('product.characteristics')}</h2>
                    <ul className="space-y-2 text-gray-700">
                      {product.color && <li>{t('product.color')}: <strong>{product.color}</strong></li>}
                      {product.size && <li>{t('common.size')}: <strong>{product.size}</strong></li>}
                      {product.material && <li>{t('product.material')}: <strong>{product.material}</strong></li>}
                      {product.manufacturer && <li>{t('product.manufacturer')}: <strong>{product.manufacturer}</strong></li>}
                    </ul>
                  </div>
                )}

                {/* Відео */}
                {product.videoUrl && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-2">{t('product.video')}</h2>
                    {product.videoUrl.includes('youtube') || product.videoUrl.includes('youtu.be') ? (
                      <div className="w-full aspect-video">
                        <iframe
                          src={getEmbedUrl(product.videoUrl)}
                          className="w-full h-full rounded-lg"
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
                      {t('product.acceptTerms')}{' '}
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
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Модальне вікно з умовами покупки */}
      {showTermsModal && product.termsAndConditions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">{t('product.terms')}</h2>
            <div className="text-gray-700 whitespace-pre-wrap">{product.termsAndConditions}</div>
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
  return { props: {} };
}
