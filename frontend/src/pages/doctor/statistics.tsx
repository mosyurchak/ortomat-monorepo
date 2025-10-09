import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { usersApi } from '../../lib/api';
import { ArrowLeft, TrendingUp, DollarSign, ShoppingBag, Calendar } from 'lucide-react';

export default function DoctorStatisticsPage() {
  const router = useRouter();

  // Отримуємо ID користувача з localStorage або контексту
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const { data: stats, isLoading } = useQuery({
  queryKey: [],
  queryFn: () => ,
   enabled: !!userId }
  );

  const statsData = stats?.data;

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please login first</p>
          <Link href="/login" className="text-primary-600 hover:underline mt-2 inline-block">
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Head>
        <title>My Statistics - Ortomat</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <button
                onClick={() => router.push('/doctor')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </button>
              <h1 className="text-xl font-bold text-gray-900">Sales Statistics</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Sales */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Sales</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {statsData?.totalSales || 0}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <ShoppingBag className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Total Earnings */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
                  <p className="text-3xl font-bold text-green-600">
                    {statsData?.totalEarnings || '0.00'} UAH
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Commission Rate */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Commission Rate</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {statsData?.commissionRate || 0}%
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Ortomat Info */}
          {statsData?.ortomat && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Assigned Ortomat</h2>
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{statsData.ortomat.name}</p>
                  <p className="text-sm text-gray-600">{statsData.ortomat.address}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Referral Code: <span className="font-mono font-semibold">{statsData.referralCode}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Sales Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Sales</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {statsData?.recentSales && statsData.recentSales.length > 0 ? (
                    statsData.recentSales.map((sale: any) => (
                      <tr key={sale.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {sale.orderNumber || sale.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sale.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sale.amount} UAH
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          +{sale.commission?.toFixed(2)} UAH
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(sale.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No sales yet. Share your QR code to start earning!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Stats (if available) */}
          {statsData?.monthlyStats && statsData.monthlyStats.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Performance</h2>
              <div className="space-y-4">
                {statsData.monthlyStats.map((month: any) => (
                  <div key={month.month} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-sm text-gray-600">{month.sales} sales</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{month.revenue.toFixed(2)} UAH</p>
                      <p className="text-sm text-green-600">+{month.commission.toFixed(2)} UAH commission</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}