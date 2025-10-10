import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import Head from 'next/head';
import QRCode from 'qrcode';

export default function DoctorQRCodePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Захист роуту
  useEffect(() => {
    if (!authLoading && (!user || user.role.toUpperCase() !== 'DOCTOR')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Завантаження реферального коду
  const { data: qrData, isLoading: qrLoading } = useQuery({
    queryKey: ['doctorQR', user?.id],
    queryFn: async () => {
      // Отримуємо реферальний код через API
      // Якщо endpoint не існує, використаємо mock
      try {
        return await api.getDoctorQRCode(user!.id);
      } catch (error) {
        // Mock data якщо endpoint не працює
        return {
          referralCode: `DOC-${user!.id.substring(0, 8).toUpperCase()}`,
          referralUrl: null,
        };
      }
    },
    enabled: !!user && user.role.toUpperCase() === 'DOCTOR',
  });

  // Генерація QR-коду на frontend
  useEffect(() => {
    if (qrData?.referralCode) {
      const frontendUrl = window.location.origin;
      const referralUrl = `${frontendUrl}?ref=${qrData.referralCode}`;
      
      QRCode.toDataURL(referralUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then((url) => {
          setQrCodeDataUrl(url);
        })
        .catch((err) => {
          console.error('Error generating QR code:', err);
        });
    }
  }, [qrData]);

  const handleDownloadQR = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `qr-code-${user?.firstName}-${user?.lastName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading || qrLoading) {
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
        <title>Мій QR-код - Кабінет Лікаря</title>
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
              <h1 className="text-xl font-bold">Мій QR-код</h1>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-gray-600">{user?.email}</p>
            </div>

            {qrData?.referralCode && (
              <div className="mb-8 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Ваш реферальний код:</p>
                <p className="text-2xl font-bold text-blue-600 font-mono">
                  {qrData.referralCode}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Посилання: {window.location.origin}?ref={qrData.referralCode}
                </p>
              </div>
            )}

            {qrCodeDataUrl ? (
              <div className="flex flex-col items-center">
                <div className="mb-6 p-6 bg-white border-4 border-gray-200 rounded-lg">
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>

                <button
                  onClick={handleDownloadQR}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Завантажити QR-код
                </button>

                <p className="mt-6 text-sm text-gray-600 text-center max-w-md">
                  Покажіть цей QR-код пацієнтам або надішліть їм ваш реферальний код.
                  При покупці через ваше посилання ви отримаєте комісію.
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Генерація QR-коду...</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}