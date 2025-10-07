import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { QrCode, TrendingUp, LogOut, BarChart3 } from 'lucide-react';

export default function DoctorDashboard() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    router.push('/login');
  };

  return (
    <div>
      <Head>
        <title>Doctor Dashboard - Ortomat</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-bold text-gray-900">Doctor Dashboard</h1>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h2>
            <p className="text-gray-600">
              Manage your referrals and track your earnings
            </p>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* QR Code Card */}
            <Link
              href="/doctor/qr-code"
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border-2 border-transparent hover:border-primary-500"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-primary-100 p-3 rounded-full">
                  <QrCode className="h-8 w-8 text-primary-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                My QR Code
              </h3>
              <p className="text-sm text-gray-600">
                View and share your referral QR code with patients
              </p>
            </Link>

            {/* Statistics Card */}
            <Link
              href="/doctor/statistics"
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border-2 border-transparent hover:border-green-500"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Sales Statistics
              </h3>
              <p className="text-sm text-gray-600">
                View detailed statistics and earnings reports
              </p>
            </Link>

            {/* Performance Card */}
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Quick Stats
              </h3>
              <p className="text-sm text-white/90">
                Track your performance at a glance
              </p>
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex justify-between text-sm">
                  <span>This month</span>
                  <span className="font-semibold">View details →</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              How it works
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="font-bold mr-2">1.</span>
                <span>Share your unique QR code with patients who need orthopedic products</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">2.</span>
                <span>Patients scan the code and purchase products from the ortomat</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">3.</span>
                <span>You earn commission on every sale made through your referral</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">4.</span>
                <span>Track all your earnings and statistics in real-time</span>
              </li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}