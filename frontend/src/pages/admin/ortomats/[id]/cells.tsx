import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { api } from '../../../../lib/api';
import { useTranslation } from '../../../../hooks/useTranslation';
import type { Cell, Product } from '../../../../types';

export default function AdminCellsManagementPage() {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  
  const [showModal, setShowModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Захист роуту
  useEffect(() => {
    if (!authLoading && (!user || user.role.toUpperCase() !== 'ADMIN')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Завантаження ортомату
  const { data: ortomat, isLoading: ortomatLoading } = useQuery({
    queryKey: ['ortomat', id],
    queryFn: () => api.getOrtomat(id as string),
    enabled: !!id && !!user && user.role.toUpperCase() === 'ADMIN',
  });

  // Завантаження інвентарю комірок
  const { data: cells, isLoading: cellsLoading } = useQuery({
    queryKey: ['inventory', id],
    queryFn: () => api.getOrtomatInventory(id as string),
    enabled: !!id && !!user && user.role.toUpperCase() === 'ADMIN',
  });

  // Завантаження товарів
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.getProducts(),
    enabled: !!user && user.role.toUpperCase() === 'ADMIN',
  });

  // Оновлення товару комірки
  const updateCellMutation = useMutation({
    mutationFn: ({ cellNumber, productId }: { cellNumber: number; productId: string | null }) =>
      api.updateCellProduct(id as string, cellNumber, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', id] });
      queryClient.invalidateQueries({ queryKey: ['ortomat', id] });
      setShowModal(false);
      setSelectedCell(null);
      setSelectedProductId('');
      alert(t('admin.cellAssigned'));
    },
    onError: (error: any) => {
      alert(`${t('errors.general')}: ${error.message}`);
    },
  });

  const handleCellClick = (cell: Cell) => {
    setSelectedCell(cell);
    setSelectedProductId(cell.productId || '');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCell) return;

    updateCellMutation.mutate({
      cellNumber: selectedCell.number,
      productId: selectedProductId || null,
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCell(null);
    setSelectedProductId('');
  };

  if (authLoading || ortomatLoading || cellsLoading || productsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  if (!user || user.role.toUpperCase() !== 'ADMIN') {
    return null;
  }

  if (!ortomat || !cells) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">{t('errors.notFound')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/ortomats')}
            className="text-blue-600 hover:text-blue-700 mb-2 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('admin.backToDashboard')}
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('admin.manageCells')}
          </h1>
          <p className="text-gray-600">
            {ortomat.name} - {ortomat.address}
            {ortomat.city && `, ${ortomat.city}`}
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('admin.totalCells')}</p>
              <p className="text-2xl font-bold text-gray-900">{ortomat.totalCells}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('admin.filledCells')}</p>
              <p className="text-2xl font-bold text-green-600">
                {cells.filter((c: Cell) => c.productId && !c.isAvailable).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('admin.emptyCells')}</p>
              <p className="text-2xl font-bold text-gray-600">
                {cells.filter((c: Cell) => !c.productId).length}
              </p>
            </div>
          </div>
        </div>

        {/* Cells Grid */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">{t('admin.cells')}</h2>
          
          {(!cells || cells.length === 0) ? (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('admin.noCells')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {cells.map((cell: Cell) => (
                <button
                  key={cell.id}
                  onClick={() => handleCellClick(cell)}
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-lg ${
                    cell.productId
                      ? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                      : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-center">
                    <p className="text-lg font-bold mb-1">#{cell.number}</p>
                    {cell.product ? (
                      <div>
                        <p className="text-xs text-gray-600 mb-1 truncate">
                          {cell.product.name}
                        </p>
                        <p className="text-xs font-semibold text-blue-600">
                          {t('admin.product')}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        {t('admin.empty')}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">
              {t('admin.assignProduct')} - {t('courier.cellNumber', { number: selectedCell.number })}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.selectProduct')}
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('admin.empty')}</option>
                  {products?.map((product: Product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {product.price} {t('catalog.uah')}
                      {product.size && ` (${product.size})`}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Оберіть товар, який кур'єр може покласти в цю комірку
                </p>
              </div>

              {selectedCell.product && (
                <div className="mb-6 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Поточний товар:
                  </p>
                  <p className="text-sm text-blue-700">
                    {selectedCell.product.name}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={updateCellMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {updateCellMutation.isPending
                    ? t('common.saving')
                    : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// SSR для динамічних роутів
export async function getServerSideProps() {
  return {
    props: {},
  };
}