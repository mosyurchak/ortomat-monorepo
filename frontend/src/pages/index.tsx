import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useQuery } from 'react-query';
import { ortomatsApi } from '../lib/api';
import { MapPin, ShoppingBag } from 'lucide-react';

export default function Home() {
  const { data: ortomats, isLoading } = useQuery('ortomats', ortomatsApi.getAll);

  return (
    <>
      <Head>
        <title>Ortomat - Orthopedic Vending Machine Network</title>
        <meta name="description" content="Orthopedic products near you" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <ShoppingBag className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Ortomat</span>
              </div>
              <div className="flex space-x-4">
                <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
                  Admin
                </Link>
                <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
                  Login
                </Link>
                <Link href="/register" className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700">
                  Register
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Orthopedic Vending Machine Network
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find the nearest Ortomat and get necessary orthopedic products with doctor recommendation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))
            ) : (
              ortomats?.data.map((ortomat: any) => (
                <div key={ortomat.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {ortomat.name}
                  </h3>
                  <div className="flex items-start text-gray-600 mb-4">
                    <MapPin className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{ortomat.address}</span>
                  </div>
                  <div className="text-sm text-gray-500 mb-4">
                    Available: {ortomat.cells.filter((c: any) => c.productId).length} / {ortomat.cells.length}
                  </div>
                  <Link
                    href={`/catalog/${ortomat.id}`}
                    className="block w-full bg-primary-600 text-white text-center py-2 px-4 rounded-md hover:bg-primary-700 transition-colors"
                  >
                    View Catalog
                  </Link>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </>
  );
}