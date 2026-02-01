import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import Head from 'next/head';
import { useTranslation } from '../../hooks/useTranslation';
import type { Ortomat, Cell } from '../../types';

export default function CourierDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { t } = useTranslation();

  // Захист роуту
  useEffect(() => {
    if (!authLoading && (!user || user.role.toUpperCase() !== 'COURIER')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Завантаження ортоматів
  const { data: ortomats, isLoading: ortomatsLoading } = useQuery({
    queryKey: ['ortomats'],
    queryFn: () => api.getOrtomats(),
    enabled: !!user && user.role.toUpperCase() === 'COURIER',
  });

  if (authLoading || ortomatsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  if (!user || user.role.toUpperCase() !== 'COURIER') {
    return null;
  }

  return (
    <div>
      <Head>
        <title>{t('courier.cabinet')}</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{t('courier.cabinet')}</h1>
                <p className="text-gray-600 mt-1">
                  {t('courier.welcome', { firstName: user.firstName, lastName: user.lastName })}
                </p>
              </div>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                {t('auth.logout')}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('courier.myOrtomats')}</h2>
            <p className="text-gray-600">
              {t('courier.manageInventory')}
            </p>
          </div>

          {/* Ortomats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ortomats?.map((ortomat: Ortomat & { cells?: Cell[] }) => {
              const filledCells = ortomat.cells?.filter((c: Cell) => c.productId && !c.isAvailable).length || 0;
              const fillPercentage = ortomat.totalCells 
                ? Math.round((filledCells / ortomat.totalCells) * 100)
                : 0;

              return (
                <div
                  key={ortomat.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    {/* Ortomat Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {ortomat.name}
                        </h3>
                        <p className="text-sm text-gray-600">{ortomat.address}</p>
                        {ortomat.city && (
                          <p className="text-xs text-gray-500 mt-1">{ortomat.city}</p>
                        )}
                      </div>
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          ortomat.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {ortomat.status === 'active' ? t('courier.online') : t('courier.offline')}
                      </span>
                    </div>

                    {/* Fill Percentage */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">{t('courier.filling')}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {filledCells} / {ortomat.totalCells}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
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
                    </div>

                    {/* ✅ ВИДАЛЕНО: Кнопка "Поповнення" - залишили тільки "Деталі" */}
                    <button
                      onClick={() => router.push(`/courier/ortomats/${ortomat.id}`)}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      {t('courier.details')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {(!ortomats || ortomats.length === 0) && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <p className="text-gray-500 mb-2">{t('courier.noOrtomatsAssigned')}</p>
              <p className="text-sm text-gray-400">
                {t('courier.contactAdmin')}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}