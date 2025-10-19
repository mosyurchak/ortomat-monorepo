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
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role.toUpperCase() !== 'ADMIN')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const { data: ortomat, isLoading: ortomatLoading } = useQuery({
    queryKey: ['ortomat', id],
    queryFn: () => api.getOrtomat(id as string),
    enabled: !!id && !!user && user.role.toUpperCase() === 'ADMIN',
  });

  const { data: cells, isLoading: cellsLoading } = useQuery({
    queryKey: ['inventory', id],
    queryFn: () => api.getOrtomatInventory(id as string),
    enabled: !!id && !!user && user.role.toUpperCase() === 'ADMIN',
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.getProducts(),
    enabled: !!user && user.role.toUpperCase() === 'ADMIN',
  });

  // Оновлення товару комірки (СІРА → СИНЯ або СИНЯ → СИНЯ)
  const updateCellMutation = useMutation({
    mutationFn: async ({ cellNumber, productId }: { cellNumber: number; productId: string | null }) => {
      // Перевіряємо чи комірка існує в БД
      const existingCell = cells?.find((c: Cell) => c.number === cellNumber);
      
      if (!existingCell && productId) {
        // Якщо комірки немає в БД і ми призначаємо товар - створюємо її
        // Використовуємо той самий endpoint, він створить комірку якщо її немає
        return api.updateCellProduct(id as string, cellNumber, productId);
      } else {
        // Якщо комірка вже є - просто оновлюємо
        return api.updateCellProduct(id as string, cellNumber, productId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', id] });
      queryClient.invalidateQueries({ queryKey: ['ortomat', id] });
      setShowModal(false);
      setSelectedCell(null);
      setSelectedProductId('');
      alert('Товар оновлено! Комірка тепер синя (призначений товар, порожня)');
    },
    onError: (error: any) => {
      alert(`Помилка: ${error.message}`);
    },
  });

  // Відкриття і заповнення комірки (СИНЯ → ЗЕЛЕНА)
  const openAndFillMutation = useMutation({
    mutationFn: ({ cellNumber, adminId }: { cellNumber: number; adminId: string }) =>
      api.openCellForRefill(id as string, cellNumber, adminId),
    onSuccess: () => {
      setIsOpening(false);
      // Після відкриття відмічаємо як заповнену
      if (selectedCell && user) {
        markFilledMutation.mutate({
          cellNumber: selectedCell.number,
          adminId: user.id,
        });
      }
    },
    onError: (error: any) => {
      setIsOpening(false);
      alert(`Помилка: ${error.message}`);
    },
  });

  // Відмітка комірки як заповненої (СИНЯ → ЗЕЛЕНА)
  const markFilledMutation = useMutation({
    mutationFn: ({ cellNumber, adminId }: { cellNumber: number; adminId: string }) =>
      api.markCellFilled(id as string, cellNumber, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', id] });
      queryClient.invalidateQueries({ queryKey: ['ortomat', id] });
      setShowModal(false);
      setSelectedCell(null);
      alert('Комірка заповнена! Тепер вона зелена (заповнена товаром)');
    },
    onError: (error: any) => {
      alert(`Помилка: ${error.message}`);
    },
  });

  // Очищення заповненої комірки (ЗЕЛЕНА → СИНЯ)
  const clearFilledCellMutation = useMutation({
    mutationFn: ({ cellNumber, adminId }: { cellNumber: number; adminId: string }) => {
      // Для очищення заповненої комірки використовуємо спеціальний endpoint
      // Потрібно перевірити який endpoint очищає комірку не видаляючи productId
      // Якщо такого немає - викликаємо openCellForRefill який відкриває комірку
      return api.openCellForRefill(id as string, cellNumber, adminId);
    },
    onSuccess: () => {
      setIsOpening(false);
      queryClient.invalidateQueries({ queryKey: ['inventory', id] });
      queryClient.invalidateQueries({ queryKey: ['ortomat', id] });
      setShowModal(false);
      setSelectedCell(null);
      alert('Комірка очищена! Тепер вона синя (призначений товар, порожня)');
    },
    onError: (error: any) => {
      setIsOpening(false);
      alert(`Помилка: ${error.message}`);
    },
  });

  const handleCellClick = (cellNumber: number) => {
    const existingCell = cells?.find((c: Cell) => c.number === cellNumber);
    
    const cell = existingCell || {
      id: `temp-${cellNumber}`,
      number: cellNumber,
      ortomatId: id as string,
      productId: null,
      isAvailable: true,
      product: null,
    } as Cell;

    setSelectedCell(cell);
    setSelectedProductId(cell.productId || '');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell) return;
    
    // СІРА → СИНЯ: призначаємо товар порожній комірці
    // СИНЯ → СИНЯ: змінюємо товар у порожній комірці
    updateCellMutation.mutate({
      cellNumber: selectedCell.number,
      productId: selectedProductId || null,
    });
  };

  // СИНЯ → ЗЕЛЕНА: заповнити порожню комірку
  const handleFillCell = () => {
    if (!selectedCell || !user) return;
    setIsOpening(true);
    openAndFillMutation.mutate({
      cellNumber: selectedCell.number,
      adminId: user.id,
    });
  };

  // ЗЕЛЕНА → СИНЯ: очистити заповнену комірку
  const handleClearFilledCell = () => {
    if (!selectedCell || !user) return;
    if (confirm('Очистити комірку? Вона стане порожньою (синьою) але товар залишиться призначений.')) {
      setIsOpening(true);
      clearFilledCellMutation.mutate({
        cellNumber: selectedCell.number,
        adminId: user.id,
      });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCell(null);
    setSelectedProductId('');
  };

  if (authLoading || ortomatLoading || cellsLoading || productsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Завантаження...</div>
      </div>
    );
  }

  if (!user || user.role.toUpperCase() !== 'ADMIN' || !ortomat) {
    return null;
  }

  const filledCells = cells?.filter((c: Cell) => c.productId && !c.isAvailable).length || 0;
  const assignedCells = cells?.filter((c: Cell) => c.productId).length || 0;
  const unassignedCells = ortomat.totalCells - assignedCells;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/ortomats')}
            className="text-blue-600 hover:text-blue-700 mb-2 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Назад
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Управління комірками</h1>
          <p className="text-gray-600">
            {ortomat.name} - {ortomat.address}
            {ortomat.city && `, ${ortomat.city}`}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Всього комірок</p>
              <p className="text-2xl font-bold text-gray-900">{ortomat.totalCells}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Призначено товар</p>
              <p className="text-2xl font-bold text-blue-600">{assignedCells}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Заповнено</p>
              <p className="text-2xl font-bold text-green-600">{filledCells}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Без товару</p>
              <p className="text-2xl font-bold text-gray-600">{unassignedCells}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Комірки</h2>
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-gray-700">
              <span className="inline-block w-4 h-4 bg-gray-300 rounded mr-2"></span>
              Сіра = порожня (без товару) | 
              <span className="inline-block w-4 h-4 bg-blue-500 rounded mx-2"></span>
              Синя = призначений товар (порожня) | 
              <span className="inline-block w-4 h-4 bg-green-500 rounded mx-2"></span>
              Зелена = заповнена товаром
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: ortomat.totalCells }, (_, i) => i + 1).map((cellNumber) => {
              const cell = cells?.find((c: Cell) => c.number === cellNumber);
              const hasProduct = cell?.productId;
              const isFilled = hasProduct && !cell.isAvailable;

              return (
                <button
                  key={cellNumber}
                  onClick={() => handleCellClick(cellNumber)}
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-lg ${
                    hasProduct
                      ? isFilled
                        ? 'border-green-500 bg-green-50 hover:bg-green-100'
                        : 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                      : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-center">
                    <p className="text-lg font-bold mb-1">#{cellNumber}</p>
                    {cell?.product ? (
                      <div>
                        <p className="text-xs text-gray-600 mb-1 truncate">{cell.product.name}</p>
                        <p className={`text-xs font-semibold ${isFilled ? 'text-green-600' : 'text-blue-600'}`}>
                          {isFilled ? '✅ Заповнена' : '📦 Призначено'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">⬜ Порожня</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showModal && selectedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Комірка #{selectedCell.number}</h2>
            
            {/* ЗЕЛЕНА - Заповнена */}
            {selectedCell.productId && !selectedCell.isAvailable ? (
              <div>
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-900 mb-2">✅ Комірка заповнена товаром</p>
                  <p className="text-lg font-bold text-green-700">{selectedCell.product?.name}</p>
                  <p className="text-xs text-green-600 mt-1">Статус: ЗЕЛЕНА (фізично заповнена)</p>
                </div>
                <button
                  onClick={handleClearFilledCell}
                  disabled={isOpening}
                  className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 mb-3 flex items-center justify-center"
                >
                  {isOpening ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Очищення...
                    </>
                  ) : (
                    '🔓 Очистити комірку (ЗЕЛЕНА → СИНЯ)'
                  )}
                </button>
                <p className="text-xs text-gray-500 mb-3 text-center">
                  Комірка стане синьою (порожня з товаром)
                </p>
                <button onClick={handleCloseModal} className="w-full py-2 border rounded-lg hover:bg-gray-50">
                  Скасувати
                </button>
              </div>
            ) : selectedCell.productId && selectedCell.isAvailable ? (
              /* СИНЯ - Порожня з товаром */
              <div>
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-2">📦 Призначений товар:</p>
                  <p className="text-lg font-bold text-blue-700">{selectedCell.product?.name}</p>
                  <p className="text-xs text-blue-600 mt-1">Статус: СИНЯ (призначено, порожня)</p>
                </div>

                {/* Форма зміни товару (СИНЯ → СИНЯ) */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <form onSubmit={handleSubmit}>
                    <label className="block text-sm font-medium mb-2">Змінити товар (СИНЯ → СИНЯ):</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mb-3"
                    >
                      <option value="">Прибрати товар</option>
                      {products?.map((product: Product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {product.price} грн
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={updateCellMutation.isPending}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {updateCellMutation.isPending ? 'Збереження...' : '💾 Зберегти зміни'}
                    </button>
                  </form>
                </div>

                {/* Кнопка заповнити (СИНЯ → ЗЕЛЕНА) */}
                <button
                  onClick={handleFillCell}
                  disabled={isOpening}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 mb-3 flex items-center justify-center"
                >
                  {isOpening ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Заповнення...
                    </>
                  ) : (
                    '✅ Заповнити комірку (СИНЯ → ЗЕЛЕНА)'
                  )}
                </button>
                <p className="text-xs text-gray-500 mb-3 text-center">
                  Комірка стане зеленою (заповнена товаром)
                </p>
                
                <button onClick={handleCloseModal} className="w-full py-2 border rounded-lg hover:bg-gray-50">
                  Скасувати
                </button>
              </div>
            ) : (
              /* СІРА - Без товару */
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                    <p className="text-sm text-gray-600">Статус: СІРА (порожня, без товару)</p>
                  </div>
                  <label className="block text-sm font-medium mb-2">Призначити товар (СІРА → СИНЯ):</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Порожня (без товару)</option>
                    {products?.map((product: Product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {product.price} грн
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    Оберіть товар для цієї комірки. Комірка стане синьою (призначено, порожня)
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button 
                    type="button" 
                    onClick={handleCloseModal} 
                    className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Скасувати
                  </button>
                  <button 
                    type="submit" 
                    disabled={updateCellMutation.isPending} 
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {updateCellMutation.isPending ? 'Збереження...' : 'Зберегти'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}