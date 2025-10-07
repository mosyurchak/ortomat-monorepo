import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from 'react-query';
import { usersApi, qrCodeApi } from '../../lib/api';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DoctorQRCode() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const { data: profile } = useQuery(
    'doctorProfile',
    usersApi.getProfile,
    { enabled: !!user }
  );

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'DOCTOR')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const doctorOrtomats = profile.data.doctorOrtomats || [];
  const referralCode = doctorOrtomats[0]?.referralCode;
  const ortomatId = doctorOrtomats[0]?.ortomat?.id;

  const handleCopyLink = () => {
    const link = `${window.location.origin}/catalog/${ortomatId}?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  return (
    <div>
      <Head>
        <title>My QR Code - Ortomat</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link
                href="/doctor"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
              <h1 className="text-xl font-bold text-gray-900">My QR Code</h1>
              <div className="w-24"></div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Referral QR Code</h2>
              <p className="text-gray-600">
                Share this QR code with your patients to earn commissions
              </p>
            </div>

            {referralCode && ortomatId ? (
              <div>
                <div className="flex justify-center mb-8">
                  <div className="bg-white p-8 rounded-lg border-4 border-primary-600">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                        `${window.location.origin}/catalog/${ortomatId}?ref=${referralCode}`
                      )}`}
                      alt="QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Your Referral Code</h3>
                  <div className="flex items-center">
                    <code className="flex-1 bg-white px-4 py-2 rounded border font-mono text-sm">
                      {referralCode}
                    </code>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Referral Link</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/catalog/${ortomatId}?ref=${referralCode}`}
                      className="flex-1 bg-white px-4 py-2 rounded border text-sm"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 transition-colors flex items-center"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Copy
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
                  <ol className="text-sm text-blue-800 space-y-2">
                    <li>1. Show this QR code to your patients</li>
                    <li>2. Patient scans the code and makes a purchase</li>
                    <li>3. You earn 10% commission automatically</li>
                    <li>4. Track your earnings in the dashboard</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">
                  No ortomat assigned yet. Please contact administrator.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}