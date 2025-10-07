import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { ortomatsApi, productsApi } from '../../lib/api';
import { ArrowLeft, Package, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CourierRefillPage() {
  const router = useRouter();
  const { ortomatId } = router.query;
  const queryClient = useQueryClient();
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>('');

  // Завантажуємо інвентар ортомату
  const { data: inventory, isLoading: inventoryLoading } = useQuery(
    ['inventory', ortomatId],
    async () => {
      const response = await fetch(`http://localhost:3001/ortomats/${ortomatId}/inventory`);
      return response.json();
    },
    { enabled: !!ortomatId }
  );

  // Завантажуємо список товарів
  const { data: products } = useQuery('products', () => productsApi.getAll());

  // Мутація для поповнення
  const refillMutation = useMutation(
    async ({ cellNumber, productId }: { cellNumber: number; productId: string }) => {
      const response = await fetch(
        `http://localhost:3001/ortomats/${ortomatId}/cells/${cellNumber}/refill`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, courierId: userId }),
        }
      );
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['inventory', ortomatId]);
        toast.success('Cell refilled successfully!');
        setSelectedCell(null);
        setSelectedProduct('');
      },
      onError: () => {
        toast.error('Failed to refill cell');
      },
    }
  );

  const handleRefill = () => {
    if (!selectedCell || !selectedProduct) {
      toast.error('Please select a cell and product');
      return;
    }

    refillMutation.mutate({ cellNumber: selectedCell, productId: selectedProduct });
  };

  if (!userId || !ortomatId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (inventoryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  const emptyCells = inventory?.filter((cell: any) => !cell.product || !cell.isAvailable) || [];
  const filledCells = inventory?.filter((cell: any) => cell.product && cell.isAvailable) || [];

  return (
    <div>
      <Head>
        <title>Refill Ortomat - Courier</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <button
                onClick={() => router.push('/courier/ortomats')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Ortomats
              </button>
              <h1 className="text-xl font-bold text-gray-900">Refill Ortomat</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Cells</p>
              <p className="text-2xl font-bold text-gray-900">{inventory?.length || 0}</p>
            </div>
            <div className="bg-red-50 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Empty</p>
              <p className="text-2xl font-bold text-red-600">{emptyCells.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Filled</p>
              <p className="text-2xl font-bold text-green-600">{filledCells.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Cell Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Empty Cell</h2>
              
              {emptyCells.length > 0 ? (
                <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto">
                  {emptyCells.map((cell: any) => (
                    <button
                      key={cell.id}
                      onClick={() => setSelectedCell(cell.number)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedCell === cell.number
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <XCircle className="h-6 w-6 text-red-500 mx-auto mb-1" />
                        <p className="text-sm font-semibold">Cell {cell.number}</p>
                        <p className="text-xs text-gray-500">Empty</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-600">All cells are filled!</p>
                </div>
              )}
            </div>

            {/* Right: Product Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Product</h2>
              
              {selectedCell ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      Selected: <span className="font-bold">Cell {selectedCell}</span>
                    </p>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {products?.data?.map((product: any) => (
                      <button
                        key={product.id}
                        onClick={() => setSelectedProduct(product.id)}
                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                          selectedProduct === product.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{product.name}</p>
                            {product.size && (
                              <p className="text-sm text-gray-600">Size: {product.size}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary-600">{product.price} UAH</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleRefill}
                    disabled={!selectedProduct || refillMutation.isLoading}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {refillMutation.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Refilling...
                      </>
                    ) : (
                      <>
                        <Package className="h-5 w-5 mr-2" />
                        Refill Cell
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Select an empty cell first</p>
                </div>
              )}
            </div>
          </div>

          {/* Filled Cells Preview */}
          {filledCells.length > 0 && (
            <div className="mt-8 bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filled Cells</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {filledCells.map((cell: any) => (
                  <div
                    key={cell.id}
                    className="p-3 border border-gray-200 rounded-lg bg-green-50"
                  >
                    <div className="text-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                      <p className="text-xs font-semibold">Cell {cell.number}</p>
                      <p className="text-xs text-gray-600 truncate">{cell.product?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}