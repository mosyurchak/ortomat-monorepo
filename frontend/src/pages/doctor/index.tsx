import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import Head from 'next/head';
import { useTranslation } from '../../hooks/useTranslation';

export default function DoctorDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { t } = useTranslation();

  // Захист роуту
  useEffect(() => {
    if (!authLoading && (!user || user.role.toUpperCase() !== 'DOCTOR')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Завантаження статистики
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['doctorStats', user?.id],
    queryFn: () => api.getDoctorStats(user!.id),
    enabled: !!user && user.role.toUpperCase() === 'DOCTOR',
  });

  // Завантаження QR-коду
  const { data: qrData } = useQuery({
    queryKey: ['doctorQR', user?.id],
    queryFn: () => api.getDoctorQRCode(user!.id),
    enabled: !!user && user.role.toUpperCase() === 'DOCTOR',
  });

  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">{t('common.loading')}</div>
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
        <title>{t('doctor.cabinet')}</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {t('doctor.cabinet')}
                </h1>
                <p className="text-gray-600 mt-1">
                  {t('doctor.welcome', { firstName: user.firstName, lastName: user.lastName })}
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
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">{t('doctor.sales')}</p>
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
                  <p className="text-sm text-gray-500">{t('doctor.earnings')}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalEarnings?.toFixed(2) || 0} {t('common.currency')}
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
                  <p className="text-sm text-gray-500">{t('doctor.averageCheck')}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalSales > 0
                      ? ((stats.totalEarnings / stats.totalSales) * 10).toFixed(2)
                      : 0}{' '}
                    {t('common.currency')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">{t('doctor.conversion')}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalSales > 0 ? '100' : '0'}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Referral Code */}
          {qrData?.referralCode && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {t('doctor.referralCode')}
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-blue-600 font-mono mb-2">
                    {qrData.referralCode}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t('doctor.shareCode')}
                  </p>
                </div>
                <button
                  onClick={() => router.push('/doctor/qr-code')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  {t('doctor.viewQRCode')}
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <button
              onClick={() => router.push('/doctor/statistics')}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('doctor.detailedStats')}
              </h3>
              <p className="text-gray-600">
                {t('doctor.detailedStatsDesc')}
              </p>
            </button>

            <button
              onClick={() => router.push('/doctor/qr-code')}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('doctor.qrCodeAndLinks')}
              </h3>
              <p className="text-gray-600">
                {t('doctor.qrCodeAndLinksDesc')}
              </p>
            </button>
          </div>

          {/* Recent Sales */}
          {stats?.recentSales && stats.recentSales.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {t('doctor.recentSales')}
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('common.date')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('admin.product')}</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('doctor.commission')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentSales.slice(0, 5).map((sale: any) => (
                      <tr key={sale.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(sale.createdAt).toLocaleDateString('uk-UA')}
                        </td>
                        <td className="py-3 px-4 text-sm">{sale.product?.name}</td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-green-600">
                          +{sale.commission?.toFixed(2) || 0} {t('common.currency')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(!stats || stats.totalSales === 0) && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="text-gray-500 mb-2">{t('doctor.noSalesYet')}</p>
              <p className="text-sm text-gray-400">
                {t('doctor.shareCodeWithPatients')}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}