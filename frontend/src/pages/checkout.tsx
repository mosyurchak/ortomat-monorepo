import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';

export default function CheckoutPage() {
  const router = useRouter();
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
      alert(`Помилка: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptedTerms) {
      alert('Будь ласка, прийміть умови покупки');
      return;
    }

    if (!phone) {
      alert('Будь ласка, введіть номер телефону');
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
        <div className="text-xl">Zavantazhennya...</div>
      </div>
    );
  }

  if (!product || !ortomat) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Tovar abo ortomat ne znayideno</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Oformlennya zamovlennya
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Tovar</h2>
          
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
                <p className="text-gray-600 text-sm mb-2">{product.description}</p>
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Kategoriya: {product.category}</span>
                {product.size && <span>Rozmir: {product.size}</span>}
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {product.price} hrn
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Ortomat</h2>
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
          <h2 className="text-xl font-semibold mb-4">Kontaktni dani</h2>
          
          <div className="mb-4">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Nomer telefonu
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
              Dlya pidtverdzennya zamovlennya
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
                Ya pryymayu umovy pokupky ta zgoden z tem, scho tovar mozhlivo povernuty til'ky u vypadku tovarnogo braku
              </span>
            </label>
          </div>

          <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-500">Do splaty:</p>
              <p className="text-3xl font-bold text-gray-900">{product.price} hrn</p>
            </div>
            
            <button
              type="submit"
              disabled={createOrderMutation.isPending}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {createOrderMutation.isPending ? 'Obrobka...' : 'Perejty do oplaty'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700"
          >
            Povernytysya nazad
          </button>
        </div>
      </div>
    </div>
  );
}