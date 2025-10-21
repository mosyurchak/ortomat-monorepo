import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { useTranslation } from '../hooks/useTranslation';

export default function CheckoutPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { productId, ortomatId, ref } = router.query;
  const [phone, setPhone] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => api.getProduct(productId as string),
    enabled: !!productId,
  });

  const { data: ortomat, isLoading: loadingOrtomat } = useQuery({
    queryKey: ['ortomat', ortomatId],
    queryFn: () => api.getOrtomat(ortomatId as string),
    enabled: !!ortomatId,
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: any) => api.createOrder(data),
    onSuccess: (data) => {
      router.push(`/payment?orderId=${data.id}`);
    },
    onError: (error: any) => {
      alert(`${t('errors.general')}: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptedTerms) {
      alert(t('checkout.acceptTermsError'));
      return;
    }

    if (!phone) {
      alert(t('checkout.phoneRequired'));
      return;
    }

    createOrderMutation.mutate({
      productId: productId as string,
      ortomatId: ortomatId as string,
      referralCode: ref as string,
      customerPhone: phone,
    });
  };

  if (loadingProduct || loadingOrtomat) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  if (!product || !ortomat) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">{t('checkout.notFound')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {t('checkout.title')}
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t('checkout.product')}</h2>
          
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
              <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {product.name}
              </h3>
              {product.description && (
                <div 
                  className="text-gray-600 text-sm mb-2 line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{t('common.category')}: {product.category}</span>
                {product.size && <span>{t('common.size')}: {product.size}</span>}
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {product.price} {t('common.currency')}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t('checkout.ortomat')}</h2>
          <div className="space-y-2">
            <p className="font-medium">{ortomat.name}</p>
            <p className="text-gray-600 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {ortomat.address}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t('checkout.contactInfo')}</h2>
          
          <div className="mb-4">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.phone')}
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+380XXXXXXXXX"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              {t('checkout.phoneHelper')}
            </p>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                required
              />
              <span className="ml-2 text-sm text-gray-700">
                {t('checkout.acceptTerms')}
              </span>
            </label>
          </div>

          <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-500">{t('checkout.toPay')}:</p>
              <p className="text-3xl font-bold text-gray-900">{product.price} {t('common.currency')}</p>
            </div>
            
            <button
              type="submit"
              disabled={createOrderMutation.isPending}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {createOrderMutation.isPending ? t('checkout.processing') : t('checkout.goToPayment')}
            </button>
          </div>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    </div>
  );
}