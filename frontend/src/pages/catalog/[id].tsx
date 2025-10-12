import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useTranslation } from '../../hooks/useTranslation'; // ← ДОДАНО

export default function CatalogPage() {
  const { t } = useTranslation(); // ← ДОДАНО
  const router = useRouter();
  const { id, ref } = router.query;

  const { data: catalog, isLoading, error } = useQuery({
    queryKey: ['catalog', id, ref],
    queryFn: () => api.getOrtomatCatalog(id as string, ref as string),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">{t('common.loading')}</div> {/* ← ЗМІНЕНО */}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">
          {t('errors.generic')} {/* ← ЗМІНЕНО */}
        </div>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">{t('errors.notFound')}</div> {/* ← ЗМІНЕНО */}
      </div>
    );
  }

  const { ortomat, products } = catalog;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← {t('common.back')} {/* ← ЗМІНЕНО */}
          </Link>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {ortomat.name}
            </h1>
            <p className="text-gray-600 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {ortomat.address}
            </p>
            {ref && (
              <p className="mt-2 text-sm text-green-600">
                ✓ Реферальний код активовано
              </p>
            )}
          </div>
        </div>

        {/* Products Grid */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">
            {t('catalog.title')} ({products?.length || 0}) {/* ← ЗМІНЕНО */}
          </h2>
        </div>

        {!products || products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-500 text-lg">
              {t('catalog.noProducts')} {/* ← ЗМІНЕНО */}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product: any) => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden"
              >
                {/* Product Image Placeholder */}
                <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <svg className="w-24 h-24 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {product.name}
                  </h3>
                  
                  {product.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-sm text-gray-500">{t('admin.category')}:</span> {/* ← ЗМІНЕНО */}
                      <p className="font-medium">{product.category}</p>
                    </div>
                    {product.size && (
                      <div className="text-right">
                        <span className="text-sm text-gray-500">Розмір:</span>
                        <p className="font-medium">{product.size}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">
                      {product.price} {t('catalog.uah')} {/* ← ЗМІНЕНО */}
                    </div>
                    
                    <Link
                      href={{
                        pathname: '/checkout',
                        query: {
                          productId: product.id,
                          ortomatId: ortomat.id,
                          ref: ref || '',
                        },
                      }}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      {t('product.buyNow')} {/* ← ЗМІНЕНО */}
                    </Link>
                  </div>

                  {product.availableQuantity !== undefined && (
                    <div className="mt-2 text-sm text-gray-500">
                      {t('catalog.inStock')}: {product.availableQuantity} {t('product.pieces')} {/* ← ЗМІНЕНО */}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}