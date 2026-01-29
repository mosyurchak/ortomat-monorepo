import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

export default function AdminDashboard() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!authLoading) {
      console.log('🔒 Admin route guard - user:', user);
      
      if (!user) {
        console.log('❌ No user, redirecting to login');
        router.push('/login');
        return;
      }
      
      const userRole = user.role.toUpperCase();
      console.log('🔒 User role:', userRole);
      
      if (userRole !== 'ADMIN') {
        console.log('❌ Not admin, redirecting to login');
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);

  const { data: stats, isLoading: statsLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      console.log('📊 Fetching admin stats...');
      const result = await api.getAdminStats();
      console.log('✅ Admin stats loaded:', result);
      return result;
    },
    enabled: !!user && user.role.toUpperCase() === 'ADMIN',
    retry: 1,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">{t('auth.checkingAuth')}</div>
        </div>
      </div>
    );
  }

  if (!user || user.role.toUpperCase() !== 'ADMIN') {
    return null;
  }

  if (statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">{t('admin.loadingDashboard')}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">{t('admin.failedToLoad')}</div>
          <p className="text-gray-600 mb-4">{(error as Error).message}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t('admin.dashboard')}
            </h1>
            <p className="text-gray-600 mt-2">
              {t('admin.welcome', { firstName: user.firstName, lastName: user.lastName })}
            </p>
          </div>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            {t('auth.logout')}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{t('admin.totalUsers')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalUsers || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Total Ortomats */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{t('admin.totalOrtomats')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalOrtomats || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Total Sales */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{t('admin.totalSales')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalSales || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{t('admin.totalRevenue')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalRevenue || 0} {t('common.currency')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => router.push('/admin/ortomats')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center mb-3">
              <span className="text-3xl mr-3">🏪</span>
              <h3 className="text-lg font-semibold text-gray-900">
                {t('admin.manageOrtomats')}
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              {t('admin.manageOrtomatsDesc')}
            </p>
          </button>

          <button
            onClick={() => router.push('/admin/products')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center mb-3">
              <span className="text-3xl mr-3">📦</span>
              <h3 className="text-lg font-semibold text-gray-900">
                {t('admin.manageProducts')}
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              {t('admin.manageProductsDesc')}
            </p>
          </button>

          <button
            onClick={() => router.push('/admin/users')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center mb-3">
              <span className="text-3xl mr-3">👥</span>
              <h3 className="text-lg font-semibold text-gray-900">
                {t('admin.manageUsers')}
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              {t('admin.manageUsersDesc')}
            </p>
          </button>

          <button
            onClick={() => router.push('/admin/logs')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center mb-3">
              <span className="text-3xl mr-3">📊</span>
              <h3 className="text-lg font-semibold text-gray-900">
                Логи активності
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              Моніторинг подій системи
            </p>
          </button>

          {/* ✅ ДОДАНО: Кнопка Settings */}
          <button
            onClick={() => router.push('/admin/settings')}
            className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow p-6 hover:shadow-xl transition-all text-left border-2 border-blue-300"
          >
            <div className="flex items-center mb-3">
              <span className="text-3xl mr-3">⚙️</span>
              <h3 className="text-lg font-semibold text-white">
                Налаштування
              </h3>
            </div>
            <p className="text-blue-50 text-sm">
              Умови покупки та інші параметри системи
            </p>
          </button>
        </div>

        {/* Top Doctors */}
        {stats?.topDoctors && stats.topDoctors.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t('admin.topDoctors')}
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('admin.name')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('admin.email')}</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('admin.sales')}</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Бали</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topDoctors.map((doctor: any) => (
                    <tr key={doctor.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {doctor.firstName} {doctor.lastName}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{doctor.email}</td>
                      <td className="py-3 px-4 text-right">{doctor.totalSales || 0}</td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {doctor.totalPoints || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top Products */}
        {stats?.topProducts && stats.topProducts.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t('admin.topProducts')}
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('admin.product')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('admin.category')}</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('admin.sales')}</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('admin.revenue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topProducts.map((product: any) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{product.name}</td>
                      <td className="py-3 px-4 text-gray-600">{product.category}</td>
                      <td className="py-3 px-4 text-right">{product.salesCount || 0}</td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {product.revenue || 0} {t('common.currency')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
