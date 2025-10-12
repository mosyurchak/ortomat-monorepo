import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { api } from '../../lib/api';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '../../hooks/useTranslation';

export default function ProductPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id, ortomat, ref } = router.query;
  const [isOrdering, setIsOrdering] = useState(false);

  const { data: product, isLoading } = useQuery(
    ['product', id],
    () => api.getProduct(id as string),
    {
      enabled: !!id,
    }
  );

  const handleBuy = () => {
    if (!ortomat) {
      toast.error(t('product.ortomatMissing'));
      return;
    }

    setIsOrdering(true);
    
    const params = new URLSearchParams({
      product: id as string,
      ortomat: ortomat as string,
    });
    
    if (ref) {
      params.append('ref', ref as string);
    }

    router.push(`/checkout?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
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
          <Link href="/" className="mt-4 text-primary-600 hover:text-primary-700">
            {t('product.backToHome')}
          </Link>
        </div>
      </div>
    );
  }

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
                <ShoppingBag className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Ortomat</span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/2">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-96 object-cover"
                  />
                ) : (
                  <div className="w-full h-96 flex items-center justify-center bg-gray-100">
                    <ShoppingBag className="h-32 w-32 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="md:w-1/2 p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {product.name}
                </h1>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-primary-600">
                    {product.price} {t('common.currency')}
                  </span>
                </div>

                {product.size && (
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-700">{t('common.size')}: </span>
                    <span className="text-sm text-gray-900">{product.size}</span>
                  </div>
                )}

                {product.description && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('product.description')}</h2>
                    <p className="text-gray-600">{product.description}</p>
                  </div>
                )}

                <button
                  onClick={handleBuy}
                  disabled={isOrdering}
                  className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
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
    </div>
  );
}

// Disable static generation for this dynamic page
export async function getServerSideProps() {
  return {
    props: {},
  };
}