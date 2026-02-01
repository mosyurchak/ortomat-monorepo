import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import Head from 'next/head';

export default function DoctorStatisticsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Захист роуту
  useEffect(() => {
    if (!authLoading && (!user || user.role.toUpperCase() !== 'DOCTOR')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Завантаження статистики
  const { data: stats, isLoading } = useQuery({
    queryKey: ['doctorStats', user?.id],
    queryFn: () => api.getDoctorStats(user!.id),
    enabled: !!user && user.role.toUpperCase() === 'DOCTOR',
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Завантаження...</div>
        </div>
      </div>
    );
  }

  if (!user || user.role.toUpperCase() !== 'DOCTOR') {
    return null;
  }

  return (
    <div>
      <Head>
        <title>Статистика - Кабінет Лікаря</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <button
                onClick={() => router.push('/doctor')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Назад до Dashboard
              </button>
              <h1 className="text-xl font-bold">Детальна Статистика</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-12">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Всього продажів</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalSales || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Загальний заробіток</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalEarnings?.toFixed(2) || 0} UAH
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Середній чек</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalSales > 0
                      ? ((stats.totalEarnings / stats.totalSales) * 10).toFixed(2)
                      : 0}{' '}
                    UAH
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Sales */}
          {stats?.recentSales && stats.recentSales.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Останні продажі
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Дата</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Товар</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ортомат</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Сума</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Комісія</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentSales.map((sale: Record<string, unknown>) => (
                      <tr key={String(sale.id)} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(String(sale.createdAt)).toLocaleDateString('uk-UA')}
                        </td>
                        <td className="py-3 px-4 text-sm">{String((sale.product as Record<string, unknown>)?.name || '')}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {String((sale.ortomat as Record<string, unknown>)?.name || '')}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          {Number(sale.amount)} UAH
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-green-600">
                          +{typeof sale.commission === 'number' ? sale.commission.toFixed(2) : 0} UAH
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sales by Month */}
          {stats?.salesByMonth && stats.salesByMonth.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Продажі по місяцях
              </h2>
              <div className="space-y-4">
                {stats.salesByMonth.map((monthData: Record<string, unknown>, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {new Date(String(monthData.month)).toLocaleDateString('uk-UA', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {monthData.count} продажів
                      </p>
                      <p className="font-semibold text-green-600">
                        {monthData.earnings?.toFixed(2) || 0} UAH
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!stats || stats.totalSales === 0) && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">Поки що немає продажів</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}