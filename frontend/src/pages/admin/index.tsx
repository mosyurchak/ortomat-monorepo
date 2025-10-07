import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { 
  Users, Package, Truck, TrendingUp, 
  DollarSign, ShoppingBag, LogOut, Settings 
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();

  const { data: stats, isLoading } = useQuery('admin-stats', async () => {
    const response = await fetch('http://localhost:3001/users/admin/stats');
    return response.json();
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <Head>
        <title>Admin Dashboard - Ortomat</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              <div className="flex items-center gap-4">
                <Link
                  href="/admin/ortomats"
                  className="text-gray-600 hover:text-gray-900 flex items-center"
                >
                  <Settings className="h-5 w-5 mr-1" />
                  Manage
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Users */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.users.total || 0}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Total Sales */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Sales</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.sales.total || 0}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <ShoppingBag className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600">
                    {stats?.sales.totalRevenue.toFixed(0) || 0} UAH
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* This Month */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">This Month</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {stats?.sales.thisMonth.count || 0}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Top Doctors */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Top Doctors</h2>
              </div>
              <div className="p-6">
                {stats?.topDoctors && stats.topDoctors.length > 0 ? (
                  <div className="space-y-4">
                    {stats.topDoctors.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between border-b pb-3">
                        <div>
                          <p className="font-medium text-gray-900">{item.doctor.name}</p>
                          <p className="text-sm text-gray-600">{item.ortomat}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{item.totalEarnings} UAH</p>
                          <p className="text-sm text-gray-500">{item.totalSales} sales</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No data yet</p>
                )}
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
              </div>
              <div className="p-6">
                {stats?.topProducts && stats.topProducts.length > 0 ? (
                  <div className="space-y-4">
                    {stats.topProducts.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between border-b pb-3">
                        <div>
                          <p className="font-medium text-gray-900">{item.product.name}</p>
                          <p className="text-sm text-gray-600">{item.product.price} UAH</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">{item.salesCount} sold</p>
                          <p className="text-sm text-gray-500">{item.totalRevenue.toFixed(0)} UAH</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No sales yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/admin/ortomats"
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Truck className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Ortomats</h3>
              <p className="text-sm text-gray-600">Add, edit or remove ortomats</p>
            </Link>

            <Link
              href="/admin/products"
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <Package className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Products</h3>
              <p className="text-sm text-gray-600">Add, edit or remove products</p>
            </Link>

            <Link
              href="/admin/users"
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Users</h3>
              <p className="text-sm text-gray-600">Doctors and couriers management</p>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}