import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';
import Head from 'next/head';
import { useTranslation } from '../../../hooks/useTranslation';
import type { Cell } from '../../../types';

export default function CourierOrtomatDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  const [showModal, setShowModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  // Захист роуту
  useEffect(() => {
    if (!authLoading && (!user || user.role.toUpperCase() !== 'COURIER')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Завантаження ортомату
  const { data: ortomat, isLoading: ortomatLoading } = useQuery({
    queryKey: ['ortomat', id],
    queryFn: () => api.getOrtomat(id as string),
    enabled: !!id && !!user && user.role.toUpperCase() === 'COURIER',
  });

  // Завантаження інвентарю
  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory', id],
    queryFn: () => api.getOrtomatInventory(id as string),
    enabled: !!id && !!user && user.role.toUpperCase() === 'COURIER',
  });

  // Mutation для відкриття комірки
  const openCellMutation = useMutation({
    mutationFn: ({ cellNumber, courierId }: { cellNumber: number; courierId: string }) =>
      api.openCellForRefill(id as string, cellNumber, courierId),
    onSuccess: (data: Record<string, unknown>) => {
      setIsOpening(false);
      const product = data.product as Record<string, unknown> | undefined;
      const productName = product?.name ? String(product.name) : 'товар';
      alert(`Комірка відкривається...\n\n${String(data.note || '')}\n\nПокладіть товар: ${productName}\nЗакрийте комірку`);
      
      // Після того як кур'єр закрив комірку, відмічаємо її як заповнену
      if (selectedCell && user) {
        markFilledMutation.mutate({
          cellNumber: selectedCell.number,
          courierId: user.id,
        });
      }
    },
    onError: (error: unknown) => {
      setIsOpening(false);
      const message = error instanceof Error ? error.message : 'Невідома помилка';
      alert(`Помилка: ${message}`);
    },
  });

  // Mutation для відмітки комірки як заповненої
  const markFilledMutation = useMutation({
    mutationFn: ({ cellNumber, courierId }: { cellNumber: number; courierId: string }) =>
      api.markCellFilled(id as string, cellNumber, courierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', id] });
      queryClient.invalidateQueries({ queryKey: ['ortomat', id] });
      setShowModal(false);
      setSelectedCell(null);
      alert('Комірка заповнена!');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Невідома помилка';
      alert(`Помилка: ${message}`);
    },
  });

  const handleCellClick = (cell: Cell) => {
    // Тільки порожні комірки з призначеним товаром можна відкрити
    if (!cell.isAvailable) {
      // Комірка вже заповнена
      return;
    }

    if (!cell.productId) {
      alert('Адмін ще не призначив товар для цієї комірки');
      return;
    }

    setSelectedCell(cell);
    setShowModal(true);
  };

  const handleOpenAndFill = () => {
    if (!selectedCell || !user) return;

    setIsOpening(true);
    openCellMutation.mutate({
      cellNumber: selectedCell.number,
      courierId: user.id,
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCell(null);
  };

  if (authLoading || ortomatLoading || inventoryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Завантаження...</div>
        </div>
      </div>
    );
  }

  if (!user || user.role.toUpperCase() !== 'COURIER') {
    return null;
  }

  const filledCells = inventory?.filter((c: Cell) => !c.isAvailable && c.productId).length || 0;
  const emptyCells = inventory?.filter((c: Cell) => c.isAvailable && c.productId).length || 0;
  
  // ✅ ВИПРАВЛЕНО: Використовуємо реальну кількість комірок
  const fillPercentage = ortomat?.totalCells 
    ? Math.round((filledCells / ortomat.totalCells) * 100) 
    : 0;

  return (
    <div>
      <Head>
        <title>{ortomat?.name} - Деталі</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* ✅ ВИПРАВЛЕНО: Використовуємо router.back() */}
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Назад
              </button>
              <h1 className="text-xl font-bold">{ortomat?.name}</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Ortomat Info */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Адреса</p>
                <p className="font-semibold">{ortomat?.address}</p>
                {ortomat?.city && (
                  <p className="text-sm text-gray-500">{ortomat.city}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Статус</p>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                    ortomat?.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {ortomat?.status === 'active' ? 'Online' : 'Offline'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Заповнення</p>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
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
                  <span className="text-sm font-semibold">
                    {filledCells} / {ortomat?.totalCells}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Потребує поповнення</p>
                <p className="text-2xl font-bold text-red-600">{emptyCells}</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h3 className="font-semibold mb-3">Легенда:</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-red-500 rounded mr-2"></div>
                <span className="text-sm">Порожня (клікабельна для поповнення)</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 bg-green-500 rounded mr-2"></div>
                <span className="text-sm">Заповнена</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 bg-gray-300 rounded mr-2"></div>
                <span className="text-sm">Не призначено товар</span>
              </div>
            </div>
          </div>

          {/* Inventory Grid */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Інвентар Комірок</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* ✅ ВИПРАВЛЕНО: Використовуємо реальну кількість комірок без fallback на 37 */}
              {Array.from({ length: ortomat?.totalCells || 0 }, (_, i) => i + 1).map(
                (cellNum) => {
                  const cell = inventory?.find((c: Cell) => c.number === cellNum);
                  
                  // Визначаємо стан комірки
                  const hasProduct = cell && cell.productId;
                  const isFilled = hasProduct && !cell.isAvailable;
                  const isEmpty = hasProduct && cell.isAvailable;
                  const isUnassigned = !hasProduct;

                  return (
                    <button
                      key={cellNum}
                      onClick={() => isEmpty && cell ? handleCellClick(cell) : null}
                      disabled={!isEmpty}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isEmpty
                          ? 'border-red-500 bg-red-50 hover:bg-red-100 cursor-pointer hover:shadow-lg'
                          : isFilled
                          ? 'border-green-500 bg-green-50 cursor-not-allowed'
                          : 'border-gray-300 bg-gray-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="text-center">
                        <p className="text-lg font-bold mb-1">#{cellNum}</p>
                        {isFilled && cell ? (
                          <div>
                            <p className="text-xs text-gray-600 mb-1 truncate">
                              {cell.product?.name || 'Товар'}
                            </p>
                            <p className="text-xs font-semibold text-green-600">
                              Заповнена
                            </p>
                          </div>
                        ) : isEmpty && cell ? (
                          <div>
                            <p className="text-xs text-gray-600 mb-1 truncate">
                              {cell.product?.name || 'Товар'}
                            </p>
                            <p className="text-xs font-semibold text-red-600">
                              Порожня
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">Без товару</p>
                        )}
                      </div>
                    </button>
                  );
                },
              )}
            </div>

            {emptyCells === 0 && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center px-4 py-2 bg-green-50 text-green-800 rounded-lg">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Немає порожніх комірок
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal для відкриття комірки */}
      {showModal && selectedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">
              Комірка #{selectedCell.number}
            </h2>
            
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Товар для цієї комірки:
              </p>
              <p className="text-lg font-bold text-blue-700">
                {selectedCell.product?.name || 'Товар'}
              </p>
              {selectedCell.product?.size && (
                <p className="text-sm text-blue-600 mt-1">
                  Розмір: {selectedCell.product.size}
                </p>
              )}
            </div>

            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Інструкція:</strong>
              </p>
              <ol className="text-sm text-yellow-800 mt-2 space-y-1 list-decimal list-inside">
                <li>Натисніть "Відкрити та заповнити"</li>
                <li>Комірка відчиниться</li>
                <li>Покладіть товар у комірку</li>
                <li>Закрийте комірку</li>
                <li>Комірка автоматично стане зеленою</li>
              </ol>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isOpening}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Скасувати
              </button>
              <button
                onClick={handleOpenAndFill}
                disabled={isOpening}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 flex items-center"
              >
                {isOpening ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Відкриття...
                  </>
                ) : (
                  'Відкрити та заповнити'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  };
}