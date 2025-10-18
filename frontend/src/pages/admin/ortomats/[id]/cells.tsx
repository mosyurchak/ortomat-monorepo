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

  const updateCellMutation = useMutation({
    mutationFn: ({ cellNumber, productId }: { cellNumber: number; productId: string | null }) =>
      api.updateCellProduct(id as string, cellNumber, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', id] });
      queryClient.invalidateQueries({ queryKey: ['ortomat', id] });
      setShowModal(false);
      setSelectedCell(null);
      setSelectedProductId('');
      alert('Товар призначено!');
    },
    onError: (error: any) => {
      alert(`Помилка: ${error.message}`);
    },
  });

  const openCellMutation = useMutation({
    mutationFn: ({ cellNumber, adminId }: { cellNumber: number; adminId: string }) =>
      api.openCellForRefill(id as string, cellNumber, adminId),
    onSuccess: () => {
      setIsOpening(false);
      alert('Комірка відкрита!');
      queryClient.invalidateQueries({ queryKey: ['inventory', id] });
      setShowModal(false);
      setSelectedCell(null);
    },
    onError: (error: any) => {
      setIsOpening(false);
      alert(`Помилка: ${error.message}`);
    },
  });

  // ✅ НОВИЙ: Очищення заповненої комірки (емуляція видачі товару)
  const emptyFilledCellMutation = useMutation({
    mutationFn: ({ cellNumber }: { cellNumber: number }) =>
      api.markCellFilled(id as string, cellNumber, user!.id), // Викликаємо markCellFilled щоб перемкнути isAvailable
    onSuccess: () => {
      setIsOpening(false);
      queryClient.invalidateQueries({ queryKey: ['inventory', id] });
      setShowModal(false);
      setSelectedCell(null);
      alert('Комірка очищена!');
    },
    onError: (error: any) => {
      setIsOpening(false);
      alert(`Помилка: ${error.message}`);
    },
  });

  const markFilledMutation = useMutation({
    mutationFn: ({ cellNumber, adminId }: { cellNumber: number; adminId: string }) =>
      api.markCellFilled(id as string, cellNumber, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', id] });
      alert('Комірка заповнена!');
    },
    onError: (error: any) => {
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
    updateCellMutation.mutate({
      cellNumber: selectedCell.number,
      productId: selectedProductId || null,
    });
  };

  const handleFillCell = () => {
    if (!selectedCell || !user) return;
    setIsOpening(true);
    openCellMutation.mutate({
      cellNumber: selectedCell.number,
      adminId: user.id,
    });
    setTimeout(() => {
      markFilledMutation.mutate({
        cellNumber: selectedCell.number,
        adminId: user.id,
      });
    }, 1000);
  };

  const handleOpenFilledCell = () => {
    if (!selectedCell || !user) return;
    if (confirm('Відкрити комірку? Після цього вона стане порожньою.')) {
      setIsOpening(true);
      openCellMutation.mutate({
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
                          {isFilled ? 'Заповнена' : 'Призначено'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">Порожня</p>
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
            
            {selectedCell.productId && !selectedCell.isAvailable ? (
              <div>
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-900 mb-2">Комірка заповнена</p>
                  <p className="text-lg font-bold text-green-700">{selectedCell.product?.name}</p>
                </div>
                <button
                  onClick={handleOpenFilledCell}
                  disabled={isOpening}
                  className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 mb-3"
                >
                  {isOpening ? 'Відкриття...' : 'Відкрити комірку'}
                </button>
                <button onClick={handleCloseModal} className="w-full py-2 border rounded-lg">Скасувати</button>
              </div>
            ) : selectedCell.productId && selectedCell.isAvailable ? (
              <div>
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-2">Товар для комірки:</p>
                  <p className="text-lg font-bold text-blue-700">{selectedCell.product?.name}</p>
                </div>
                <button
                  onClick={handleFillCell}
                  disabled={isOpening}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 mb-3"
                >
                  {isOpening ? 'Заповнення...' : 'Заповнити комірку'}
                </button>
                <button onClick={handleCloseModal} className="w-full py-2 border rounded-lg">Скасувати</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Оберіть товар</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Порожня</option>
                    {products?.map((product: Product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {product.price} грн
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex space-x-3">
                  <button type="button" onClick={handleCloseModal} className="flex-1 py-2 border rounded-lg">
                    Скасувати
                  </button>
                  <button type="submit" disabled={updateCellMutation.isPending} className="flex-1 bg-blue-600 text-white py-2 rounded-lg">
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