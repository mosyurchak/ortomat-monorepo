import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import type { ActivityLog, Ortomat } from '../../types';

type LogSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
type LogCategory = 'cells' | 'orders' | 'couriers' | 'system' | 'security';

type LogStats = {
  bySeverity: Array<{ severity: string; _count: number }>;
  byType: Array<{ type: string; _count: number }>;
  byCategory: Array<{ category: string; _count: number }>;
  totalLogs: number;
};

export default function AdminLogsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  
  const [category, setCategory] = useState<string>('');
  const [severity, setSeverity] = useState<string>('');
  const [ortomatId, setOrtomatId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(0);
  const limit = 50;

  useEffect(() => {
    if (!authLoading && (!user || user.role.toUpperCase() !== 'ADMIN')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['logs', category, severity, ortomatId, startDate, endDate, page],
    queryFn: () => api.getLogs({
      category: category || undefined,
      severity: severity || undefined,
      ortomatId: ortomatId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit,
      offset: page * limit,
    }),
    enabled: !!user && user.role.toUpperCase() === 'ADMIN',
  });

  const { data: statsData } = useQuery({
    queryKey: ['logs-stats', ortomatId, startDate, endDate],
    queryFn: () => api.getLogsStats({
      ortomatId: ortomatId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    enabled: !!user && user.role.toUpperCase() === 'ADMIN',
  });

  const { data: ortomats } = useQuery({
    queryKey: ['ortomats'],
    queryFn: () => api.getOrtomats(),
    enabled: !!user && user.role.toUpperCase() === 'ADMIN',
  });

  const getSeverityColor = (severity: LogSeverity) => {
    switch (severity) {
      case 'INFO': return 'bg-blue-100 text-blue-800';
      case 'WARNING': return 'bg-yellow-100 text-yellow-800';
      case 'ERROR': return 'bg-red-100 text-red-800';
      case 'CRITICAL': return 'bg-red-600 text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: LogSeverity) => {
    switch (severity) {
      case 'INFO': return 'ℹ️';
      case 'WARNING': return '⚠️';
      case 'ERROR': return '❌';
      case 'CRITICAL': return '🚨';
      default: return '📝';
    }
  };

  const getCategoryIcon = (category: LogCategory) => {
    switch (category) {
      case 'cells': return '🔓';
      case 'orders': return '🛒';
      case 'couriers': return '🚚';
      case 'system': return '⚙️';
      case 'security': return '🔒';
      default: return '📋';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('uk-UA');
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
    }).format(amount);
  };

  const handleClearFilters = () => {
    setCategory('');
    setSeverity('');
    setOrtomatId('');
    setStartDate('');
    setEndDate('');
    setPage(0);
  };

  if (authLoading || logsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Завантаження...</div>
      </div>
    );
  }

  if (!user || user.role.toUpperCase() !== 'ADMIN') {
    return null;
  }

  const logs = logsData?.logs || [];
  const total = logsData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-600 hover:text-blue-700 mb-2 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Назад
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Логи активності</h1>
              <p className="text-gray-600">Моніторинг всіх подій у системі</p>
            </div>
            <div className="flex items-center space-x-3">
              {/* ✅ ДОДАНО: Посилання на платежі */}
              <Link
                href="/admin/payments"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                💳 Платежі
              </Link>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Вийти
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {statsData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Всього логів</p>
              <p className="text-2xl font-bold text-gray-900">{statsData.totalLogs}</p>
            </div>
            {statsData.bySeverity.map((item: { severity: string; _count: number }) => (
              <div key={item.severity} className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">{getSeverityIcon(item.severity)} {item.severity}</p>
                <p className="text-2xl font-bold text-gray-900">{item._count}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Фільтри</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Категорія</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Всі</option>
                <option value="cells">🔓 Комірки</option>
                <option value="orders">🛒 Замовлення</option>
                <option value="couriers">🚚 Кур'єри</option>
                <option value="system">⚙️ Система</option>
                <option value="security">🔒 Безпека</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Важливість</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Всі</option>
                <option value="INFO">ℹ️ INFO</option>
                <option value="WARNING">⚠️ WARNING</option>
                <option value="ERROR">❌ ERROR</option>
                <option value="CRITICAL">🚨 CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ортомат</label>
              <select
                value={ortomatId}
                onChange={(e) => setOrtomatId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Всі</option>
                {ortomats?.map((ortomat: Ortomat) => (
                  <option key={ortomat.id} value={ortomat.id}>
                    {ortomat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Від дати</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">До дати</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Очистити фільтри
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Час</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Категорія</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Важливість</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Повідомлення</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Користувач</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ортомат</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log: ActivityLog) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.createdAt)}
                    </td>
                    
                    {/* КАТЕГОРІЯ */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="inline-flex items-center text-gray-700">
                        {getCategoryIcon(log.category)} {log.category}
                      </span>
                    </td>
                    
                    {/* ВАЖЛИВІСТЬ */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}>
                        {getSeverityIcon(log.severity)} {log.severity}
                      </span>
                    </td>
                    
                    {/* ПОВІДОМЛЕННЯ */}
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-md">
                        <p className="font-medium">{log.message}</p>
                        {log.metadata && (
                          <details className="mt-1">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                              Деталі
                            </summary>
                            <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
                              {/* ✅ ДОДАНО: Форматований вивід metadata */}
                              {log.metadata.saleId && (
                                <p className="mb-1">
                                  <span className="font-semibold">Продаж:</span> {log.metadata.saleId}
                                </p>
                              )}
                              {log.metadata.paymentId && (
                                <p className="mb-1">
                                  <span className="font-semibold">Платіж:</span> {log.metadata.paymentId}
                                </p>
                              )}
                              {log.metadata.orderId && (
                                <p className="mb-1">
                                  <span className="font-semibold">Замовлення:</span> {log.metadata.orderId}
                                </p>
                              )}
                              {log.metadata.amount && (
                                <p className="mb-1">
                                  <span className="font-semibold">Сума:</span> {formatAmount(log.metadata.amount)}
                                </p>
                              )}
                              {log.metadata.productId && (
                                <p className="mb-1">
                                  <span className="font-semibold">Товар:</span> {log.metadata.productId}
                                </p>
                              )}
                              {/* Показати весь JSON якщо є інші поля */}
                              <details className="mt-2">
                                <summary className="text-xs text-blue-600 cursor-pointer">
                                  Повний JSON
                                </summary>
                                <pre className="mt-1 overflow-auto text-xs">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </details>
                            </div>
                          </details>
                        )}
                      </div>
                    </td>
                    
                    {/* КОРИСТУВАЧ */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.user ? (
                        <div>
                          <p className="font-medium text-gray-900">
                            {log.user.firstName} {log.user.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{log.user.role}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Система</span>
                      )}
                    </td>
                    
                    {/* ОРТОМАТ */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ortomat ? (
                        <div>
                          <p className="font-medium text-gray-900">{log.ortomat.name}</p>
                          {log.cellNumber !== null && (
                            <p className="text-xs text-green-600">📦 Комірка #{log.cellNumber}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Назад
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Вперед
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Показано <span className="font-medium">{page * limit + 1}</span> до{' '}
                    <span className="font-medium">{Math.min((page + 1) * limit, total)}</span> з{' '}
                    <span className="font-medium">{total}</span> записів
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i;
                      } else if (page < 3) {
                        pageNum = i;
                      } else if (page > totalPages - 4) {
                        pageNum = totalPages - 5 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum + 1}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {logs.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Логів не знайдено</h3>
            <p className="mt-1 text-sm text-gray-500">Спробуйте змінити фільтри або перегляньте <Link href="/admin/payments" className="text-blue-600 hover:underline">платежі</Link></p>
          </div>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
