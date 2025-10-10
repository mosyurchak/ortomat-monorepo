import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { useEffect } from 'react';

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Захист роуту - тільки для адміна
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

  // ✅ Завантаження статистики
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

  // Показуємо loader поки перевіряємо auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Checking authentication...</div>
        </div>
      </div>
    );
  }

  // Якщо немає користувача - не показуємо нічого (редирект в useEffect)
  if (!user || user.role.toUpperCase() !== 'ADMIN') {
    return null;
  }

  // Показуємо loader поки завантажуються дані
  if (statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  // Показуємо помилку якщо є
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">Failed to load dashboard</div>
          <p className="text-gray-600 mb-4">{(error as Error).message}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
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
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Вітаємо, {user.firstName} {user.lastName}!
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              router.push('/login');
            }}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
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
                <p className="text-sm text-gray-500">Total Users</p>
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
                <p className="text-sm text-gray-500">Total Ortomats</p>
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
                <p className="text-sm text-gray-500">Total Sales</p>
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
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalRevenue || 0} UAH
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => router.push('/admin/ortomats')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Управління Ортоматами
            </h3>
            <p className="text-gray-600">
              Додавання, редагування та видалення ортоматів
            </p>
          </button>

          <button
            onClick={() => router.push('/admin/products')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Управління Товарами
            </h3>
            <p className="text-gray-600">
              Додавання, редагування та видалення товарів
            </p>
          </button>

          <button
            onClick={() => router.push('/admin/users')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Управління Користувачами
            </h3>
            <p className="text-gray-600">
              Перегляд лікарів та кур'єрів
            </p>
          </button>
        </div>

        {/* Top Doctors */}
        {stats?.topDoctors && stats.topDoctors.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Топ-5 Лікарів
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ім'я</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Продажі</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Заробіток</th>
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
                        {doctor.totalEarnings || 0} UAH
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
              Топ-5 Товарів
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Товар</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Категорія</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Продажі</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Виручка</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topProducts.map((product: any) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{product.name}</td>
                      <td className="py-3 px-4 text-gray-600">{product.category}</td>
                      <td className="py-3 px-4 text-right">{product.salesCount || 0}</td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {product.revenue || 0} UAH
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