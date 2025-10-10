import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';
import Head from 'next/head';

export default function CourierOrtomatDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isLoading: authLoading } = useAuth();

  // Захист роуту
  useEffect(() => {
    if (!authLoading && (!user || user.role.toUpperCase() !== 'COURIER')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Завантаження ортомату
  const { data: ortomat, isLoading: ortomatLoading } = useQuery({
    queryKey: ['ortomat', id],
    queryFn: () => api.getOrtomat(id as string),
    enabled: !!id && !!user && user.role.toUpperCase() === 'COURIER',
  });

  // Завантаження інвентарю
  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory', id],
    queryFn: () => api.getOrtomatInventory(id as string),
    enabled: !!id && !!user && user.role.toUpperCase() === 'COURIER',
  });

  if (authLoading || ortomatLoading || inventoryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Завантаження...</div>
        </div>
      </div>
    );
  }

  if (!user || user.role.toUpperCase() !== 'COURIER') {
    return null;
  }

  const filledCells = inventory?.filter((c: any) => c.productId).length || 0;
  const fillPercentage = Math.round((filledCells / (ortomat?.totalCells || 37)) * 100);

  return (
    <div>
      <Head>
        <title>{ortomat?.name} - Деталі</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <button
                onClick={() => router.push('/courier')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Назад
              </button>
              <h1 className="text-xl font-bold">{ortomat?.name}</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Ortomat Info */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Адреса</p>
                <p className="font-semibold">{ortomat?.address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Статус</p>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                    ortomat?.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {ortomat?.status === 'active' ? 'Online' : 'Offline'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Заповнення</p>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                    <div
                      className={`h-2 rounded-full ${
                        fillPercentage > 70
                          ? 'bg-green-500'
                          : fillPercentage > 40
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${fillPercentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold">
                    {filledCells} / {ortomat?.totalCells}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Grid */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Інвентар Комірок</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: ortomat?.totalCells || 37 }, (_, i) => i + 1).map(
                (cellNum) => {
                  const cell = inventory?.find((c: any) => c.number === cellNum);
                  const isFilled = cell && cell.productId;

                  return (
                    <div
                      key={cellNum}
                      className={`p-4 rounded-lg border-2 ${
                        isFilled
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      <div className="text-center">
                        <p className="text-lg font-bold mb-1">#{cellNum}</p>
                        {isFilled ? (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">
                              {cell.product?.name}
                            </p>
                            <p className="text-xs font-semibold text-green-600">
                              Заповнена
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">Порожня</p>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}