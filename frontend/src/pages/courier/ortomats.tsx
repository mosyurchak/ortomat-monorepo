import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { api } from '../../lib/api';
import { ArrowLeft, MapPin, Package, AlertCircle } from 'lucide-react';

export default function CourierOrtomatsPage() {
  const router = useRouter();
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const { data: ortomats, isLoading } = useQuery(
    ['courier-ortomats', userId],
    async () => {
      // Використовуємо api.getOrtomats() замість прямого fetch
      return api.getOrtomats();
    },
    { enabled: !!userId }
  );

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
          <p className="mt-4 text-gray-600">Loading ortomats...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Head>
        <title>My Ortomats - Courier</title>
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
                Back to Dashboard
              </button>
              <h1 className="text-xl font-bold text-gray-900">My Ortomats</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {ortomats && ortomats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ortomats.map((item: any) => (
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
                      <h3 className="font-semibold text-gray-900">{item.name || item.ortomat?.name}</h3>
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        item.fillRate >= 80 ? 'bg-green-100 text-green-800' :
                        item.fillRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.fillRate || 0}%
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6">
                    <div className="flex items-start mb-4">
                      <MapPin className="h-5 w-5 text-gray-400 mt-1 mr-2 flex-shrink-0" />
                      <p className="text-sm text-gray-600">{item.address || item.ortomat?.address}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <p className="text-2xl font-bold text-gray-900">{item.totalCells || item.ortomat?.totalCells || 37}</p>
                        <p className="text-xs text-gray-600">Total Cells</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded">
                        <p className="text-2xl font-bold text-red-600">{item.emptyCellsCount || 0}</p>
                        <p className="text-xs text-gray-600">Empty</p>
                      </div>
                    </div>

                    {(item.emptyCellsCount || 0) > 0 && (
                      <div className="flex items-center text-sm text-orange-600 mb-4">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>Needs refill</span>
                      </div>
                    )}

                    <Link
                      href={`/courier/ortomats/${item.id || item.ortomat?.id}`}
                      className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center"
                    >
                      <Package className="h-5 w-5 mr-2" />
                      Refill Ortomat
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Ortomats Assigned</h3>
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