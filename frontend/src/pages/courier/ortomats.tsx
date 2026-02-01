import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ArrowLeft, MapPin, Package, AlertCircle } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import type { Ortomat, Cell } from '../../types';

type OrtomatWithStats = Ortomat & {
  cells?: Cell[];
  filledCells: number;
  emptyCells: number;
  fillRate: number;
};

export default function CourierOrtomatsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const { data: ortomats, isLoading } = useQuery({
    queryKey: ['courier-ortomats', userId],
    queryFn: async () => {
      return api.getOrtomats();
    },
    enabled: !!userId,
  });

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please login first</p>
          <Link href="/login" className="text-blue-600 hover:underline mt-2 inline-block">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Обчислюємо статистику для кожного ортомата
  const ortomatsWithStats = ortomats?.map((ortomat: Ortomat & { cells?: Cell[] }) => {
    const cells = ortomat.cells || [];
    const totalCells = ortomat.totalCells || 37;

    // isAvailable = true означає порожня комірка
    // isAvailable = false означає заповнена комірка
    const filledCells = cells.filter((c: Cell) => c.productId && !c.isAvailable).length;
    const emptyCells = cells.filter((c: Cell) => c.productId && c.isAvailable).length;
    const fillRate = Math.round((filledCells / totalCells) * 100);

    return {
      ...ortomat,
      filledCells,
      emptyCells,
      fillRate,
    };
  });

  return (
    <div>
      <Head>
        <title>{t('courier.myOrtomats')} - Courier</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <button
                onClick={() => router.push('/courier')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                {t('common.back')}
              </button>
              <h1 className="text-xl font-bold text-gray-900">{t('courier.myOrtomats')}</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {ortomatsWithStats && ortomatsWithStats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ortomatsWithStats.map((item: OrtomatWithStats) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {/* Header with fill rate */}
                  <div className={`p-4 ${
                    item.fillRate >= 80 ? 'bg-green-50' :
                    item.fillRate >= 50 ? 'bg-yellow-50' :
                    'bg-red-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        item.fillRate >= 80 ? 'bg-green-100 text-green-800' :
                        item.fillRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.fillRate}%
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6">
                    <div className="flex items-start mb-4">
                      <MapPin className="h-5 w-5 text-gray-400 mt-1 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-600">{item.address}</p>
                        {item.city && (
                          <p className="text-xs text-gray-500 mt-1">{item.city}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <p className="text-2xl font-bold text-gray-900">{item.totalCells}</p>
                        <p className="text-xs text-gray-600">Всього</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded">
                        <p className="text-2xl font-bold text-green-600">{item.filledCells}</p>
                        <p className="text-xs text-gray-600">Заповнені</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded">
                        <p className="text-2xl font-bold text-red-600">{item.emptyCells}</p>
                        <p className="text-xs text-gray-600">Порожні</p>
                      </div>
                    </div>

                    {item.emptyCells > 0 && (
                      <div className="flex items-center text-sm text-orange-600 mb-4 bg-orange-50 p-2 rounded">
                        <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>Потребує поповнення: {item.emptyCells} комірок</span>
                      </div>
                    )}

                    <Link
                      href={`/courier/ortomats/${item.id}`}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <Package className="h-5 w-5 mr-2" />
                      {t('admin.view')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('courier.noOrtomatsAssigned')}</h3>
              <p className="text-gray-600">
                You don't have any ortomats assigned yet. Please contact your administrator.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Disable static generation for this page
export async function getServerSideProps() {
  return {
    props: {},
  };
}