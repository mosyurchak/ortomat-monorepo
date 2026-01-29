import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { useTranslation } from '../../hooks/useTranslation';

interface QRCodeData {
  qrCodeUrl: string;
  referralUrl: string;
  ortomatId: string;
  ortomatName: string;
}

interface Sale {
  id: string;
  amount: number;
  pointsEarned: number;
  createdAt: string;
  product: {
    name: string;
  };
  ortomat: {
    name: string;
  };
}

interface DoctorStatsResponse {
  totalSales: number;
  totalPoints: number;
  recentSales: Sale[];
  salesByMonth: any[];
}

export default function DoctorDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuth();
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalSales: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Чекаємо поки AuthContext завантажиться
    if (authLoading) {
      return;
    }

    // Якщо немає користувача після завантаження - редирект
    if (!user) {
      router.push('/login');
      return;
    }

    // Перевірка ролі
    if (user.role !== 'DOCTOR') {
      router.push('/');
      return;
    }

    // Завантажуємо дані тільки якщо все ОК
    fetchData();
  }, [user, authLoading, router]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Завантажуємо QR-код з інформацією про ортомат
      const qrResponse = await api.getDoctorQRCode(user.id);
      setQrCode(qrResponse);

      // Завантажуємо статистику лікаря
      const statsResponse: DoctorStatsResponse = await api.getDoctorStats(user.id);
      
      // Встановлюємо продажі з recentSales
      setSales(statsResponse.recentSales || []);

      // Встановлюємо статистику з backend
      setStats({
        totalPoints: statsResponse.totalPoints || 0,
        totalSales: statsResponse.totalSales || 0,
      });
    } catch (error) {
      console.error('Error fetching doctor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCode) return;

    const link = document.createElement('a');
    link.href = qrCode.qrCodeUrl;
    link.download = `ortomat-${qrCode.ortomatId}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyReferralLink = () => {
    if (!qrCode) return;

    navigator.clipboard.writeText(qrCode.referralUrl);
    alert(t('doctor.linkCopied'));
  };

  const handleLogout = () => {
    if (confirm('Ви впевнені, що хочете вийти?')) {
      logout();
    }
  };

  // Показуємо loader поки AuthContext завантажується
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  // Якщо немає user - не рендеримо (useEffect вже редиректить)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                Ortomat
              </Link>
              <span className="ml-4 text-gray-600">
                {t('doctor.cabinet')}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">
                {user.firstName} {user.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
              >
                {t('nav.logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {t('doctor.title')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('common.welcome')}, {user.firstName} {user.lastName}!
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">
                Усього балів
              </h3>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {stats.totalPoints}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">
                {t('doctor.totalSales')}
              </h3>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {stats.totalSales}
              </p>
            </div>
          </div>

          {/* QR Code Section */}
          {qrCode && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {t('doctor.qrCode')}
              </h2>

              {/* Інформація про ортомат */}
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">
                  {t('doctor.assignedOrtomat')}:
                </p>
                <Link
                  href={`/catalog/${qrCode.ortomatId}`}
                  className="text-lg font-semibold text-blue-600 hover:underline"
                >
                  {qrCode.ortomatName}
                </Link>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                {/* QR Code Image */}
                <div className="flex-shrink-0">
                  <img
                    src={qrCode.qrCodeUrl}
                    alt="Doctor QR Code"
                    className="w-64 h-64 border-2 border-gray-200 rounded"
                  />
                </div>

                {/* Instructions */}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {t('doctor.howToUse')}:
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-600 mb-4">
                    <li>{t('doctor.instruction1')}</li>
                    <li>{t('doctor.instruction2')}</li>
                    <li>{t('doctor.instruction3')}</li>
                  </ol>

                  {/* Referral URL */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      {t('doctor.referralLink')}:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={qrCode.referralUrl}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={copyReferralLink}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        {t('doctor.copy')}
                      </button>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={downloadQRCode}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {t('doctor.download')}
                    </button>
                    <Link
                      href={`/catalog/${qrCode.ortomatId}`}
                      className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 inline-block text-center"
                    >
                      {t('doctor.viewOrtomat')}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sales History */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {t('doctor.salesHistory')}
            </h2>
            {sales.length === 0 ? (
              <p className="text-gray-500">{t('doctor.noSales')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('doctor.date')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('doctor.ortomat')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('doctor.amount')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Бали
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sales.map((sale) => (
                      <tr key={sale.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(sale.createdAt).toLocaleDateString('uk-UA')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sale.ortomat.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₴{Number(sale.amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {sale.pointsEarned || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Back Link */}
          <div className="mt-6">
            <Link href="/" className="text-blue-600 hover:underline">
              ← {t('common.backToHome')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}