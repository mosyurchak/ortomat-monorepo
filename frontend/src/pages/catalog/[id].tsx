import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { ortomatsApi } from '../../lib/api';
import { ShoppingBag, MapPin, ArrowLeft, User } from 'lucide-react';

export default function CatalogPage() {
  const router = useRouter();
  const { id, ref } = router.query;

  const { data: catalog, isLoading } = useQuery(
    ['catalog', id, ref],
    () => ortomatsApi.getCatalog(id as string, ref as string),
    {
      enabled: !!id,
    }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading catalog...</p>
        </div>
      </div>
    );
  }

  const { ortomat, products, doctor, referralCode } = catalog?.data || {};

  return (
    <>
      <Head>
        <title>{ortomat?.name} - Catalog</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to ortomats
              </Link>
              <div className="flex items-center">
                <ShoppingBag className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Ortomat</span>
              </div>
            </div>
          </div>
        </header>

        {/* Ortomat Info */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{ortomat?.name}</h1>
            <div className="flex items-center text-gray-600">
              <MapPin className="h-5 w-5 mr-2" />
              <span>{ortomat?.address}</span>
            </div>
            {doctor && (
              <div className="mt-4 flex items-center text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-md">
                <User className="h-4 w-4 mr-2" />
                <span>
                  Recommended by Dr. {doctor.firstName} {doctor.lastName}
                  {doctor.middleName && ` ${doctor.middleName}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Products Grid */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Available Products ({products?.length || 0})
          </h2>

          {products && products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product: any) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}?ortomat=${id}${ref ? `&ref=${ref}` : ''}`}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                        <ShoppingBag className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-primary-600">
                        {product.price} UAH
                      </span>
                      <span className="text-sm text-gray-500">
                        In stock: {product.quantity}
                      </span>
                    </div>
                    {product.size && (
                      <div className="mt-2 text-sm text-gray-600">
                        Size: {product.size}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No products available in this ortomat</p>
              <Link
                href="/"
                className="mt-4 inline-block text-primary-600 hover:text-primary-700"
              >
                Browse other ortomats
              </Link>
            </div>
          )}
        </main>
      </div>
    </>
  );
}