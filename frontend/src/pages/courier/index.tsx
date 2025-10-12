import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import Head from 'next/head';
import { useTranslation } from '../../hooks/useTranslation';

export default function CourierDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { t } = useTranslation();
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [selectedOrtomat, setSelectedOrtomat] = useState<any>(null);
  const [refillData, setRefillData] = useState({
    cellNumber: 1,
    productId: '',
  });

  // Захист роуту
  useEffect(() => {
    if (!authLoading && (!user || user.role.toUpperCase() !== 'COURIER')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Завантаження ортоматів
  const { data: ortomats, isLoading: ortomatsLoading } = useQuery({
    queryKey: ['ortomats'],
    queryFn: () => api.getOrtomats(),
    enabled: !!user && user.role.toUpperCase() === 'COURIER',
  });

  // Завантаження товарів
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.getProducts(),
    enabled: !!user && user.role.toUpperCase() === 'COURIER',
  });

  // Завантаження інвентарю вибраного ортомату
  const { data: inventory } = useQuery({
    queryKey: ['inventory', selectedOrtomat?.id],
    queryFn: () => api.getOrtomatInventory(selectedOrtomat!.id),
    enabled: !!selectedOrtomat,
  });

  // Мутація для поповнення комірки
  const refillMutation = useMutation({
    mutationFn: (data: any) =>
      api.refillCell(data.ortomatId, data.cellNumber, {
        productId: data.productId,
        courierId: user!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', selectedOrtomat?.id] });
      queryClient.invalidateQueries({ queryKey: ['ortomats'] });
      alert(t('courier.cellRefilled'));
      setShowRefillModal(false);
      setRefillData({ cellNumber: 1, productId: '' });
    },
    onError: (error: any) => {
      alert(`${t('errors.general')}: ${error.message}`);
    },
  });

  const handleOpenRefillModal = (ortomat: any) => {
    setSelectedOrtomat(ortomat);
    setShowRefillModal(true);
  };

  const handleCloseRefillModal = () => {
    setShowRefillModal(false);
    setSelectedOrtomat(null);
    setRefillData({ cellNumber: 1, productId: '' });
  };

  const handleRefill = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrtomat || !refillData.productId) {
      alert(t('courier.selectProduct'));
      return;
    }

    refillMutation.mutate({
      ortomatId: selectedOrtomat.id,
      cellNumber: refillData.cellNumber,
      productId: refillData.productId,
      courierId: user!.id,
    });
  };

  // Визначення порожніх комірок
  const emptyCells = inventory
    ? Array.from({ length: selectedOrtomat?.totalCells || 37 }, (_, i) => i + 1).filter(
        (cellNum) => !inventory.some((cell: any) => cell.number === cellNum && cell.productId),
      )
    : [];

  if (authLoading || ortomatsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  if (!user || user.role.toUpperCase() !== 'COURIER') {
    return null;
  }

  return (
    <div>
      <Head>
        <title>{t('courier.cabinet')}</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{t('courier.cabinet')}</h1>
                <p className="text-gray-600 mt-1">
                  {t('courier.welcome', { firstName: user.firstName, lastName: user.lastName })}
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
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('courier.myOrtomats')}</h2>
            <p className="text-gray-600">
              {t('courier.manageInventory')}
            </p>
          </div>

          {/* Ortomats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ortomats?.map((ortomat: any) => {
              const filledCells = ortomat.cells?.filter((c: any) => c.productId).length || 0;
              const fillPercentage = Math.round(
                (filledCells / ortomat.totalCells) * 100,
              );

              return (
                <div
                  key={ortomat.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    {/* Ortomat Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {ortomat.name}
                        </h3>
                        <p className="text-sm text-gray-600">{ortomat.address}</p>
                      </div>
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          ortomat.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {ortomat.status === 'active' ? t('courier.online') : t('courier.offline')}
                      </span>
                    </div>

                    {/* Fill Percentage */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">{t('courier.filling')}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {filledCells} / {ortomat.totalCells}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            fillPercentage > 70
                              ? 'bg-green-500'
                              : fillPercentage > 40
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${fillPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleOpenRefillModal(ortomat)}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center"
                      >
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        {t('courier.refill')}
                      </button>
                      <button
                        onClick={() => router.push(`/courier/ortomats/${ortomat.id}`)}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                      >
                        {t('courier.details')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {(!ortomats || ortomats.length === 0) && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <p className="text-gray-500 mb-2">{t('courier.noOrtomatsAssigned')}</p>
              <p className="text-sm text-gray-400">
                {t('courier.contactAdmin')}
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Refill Modal */}
      {showRefillModal && selectedOrtomat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">
              {t('courier.refillOrtomat', { name: selectedOrtomat.name })}
            </h2>

            <form onSubmit={handleRefill}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('courier.cell')}
                </label>
                <select
                  value={refillData.cellNumber}
                  onChange={(e) =>
                    setRefillData({ ...refillData, cellNumber: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {emptyCells.length > 0 ? (
                    emptyCells.map((cellNum) => (
                      <option key={cellNum} value={cellNum}>
                        {t('courier.cellNumber', { number: cellNum })} ({t('courier.empty')})
                      </option>
                    ))
                  ) : (
                    <option value="">{t('courier.noEmptyCells')}</option>
                  )}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.product')}
                </label>
                <select
                  value={refillData.productId}
                  onChange={(e) =>
                    setRefillData({ ...refillData, productId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">{t('courier.selectProduct')}</option>
                  {products?.map((product: any) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {product.price} {t('common.currency')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseRefillModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={refillMutation.isPending || emptyCells.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {refillMutation.isPending ? t('common.saving') : t('courier.addProduct')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}