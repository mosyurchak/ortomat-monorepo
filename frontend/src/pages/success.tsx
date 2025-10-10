import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';

export default function SuccessPage() {
  const router = useRouter();
  const { orderId } = router.query;
  const [cellOpening, setCellOpening] = useState(false);
  const [cellOpened, setCellOpened] = useState(false);

  // ✅ Завантажити дані замовлення через API
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.getOrder(orderId as string),
    enabled: !!orderId,
  });

  // ✅ Мутація для відкриття комірки
  const openCellMutation = useMutation({
    mutationFn: (orderId: string) => api.openCell(orderId),
    onSuccess: () => {
      setCellOpened(true);
      setCellOpening(false);
    },
    onError: (error: any) => {
      alert(`Pomylka: ${error.message}`);
      setCellOpening(false);
    },
  });

  const handleOpenCell = () => {
    if (!orderId || cellOpening || cellOpened) return;
    
    setCellOpening(true);
    
    // Симулюємо затримку для UX
    setTimeout(() => {
      openCellMutation.mutate(orderId as string);
    }, 500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Zavantazhennya...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">
            Zamovlennya ne znaydeno
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700"
          >
            Povernytysya na golovnu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Success Icon */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Dyakuyemo za pokupku!
            </h1>
            <p className="text-gray-600">
              Vashe zamovlennya uspishno oformleno
            </p>
          </div>

          {/* Order Details */}
          <div className="border-t border-b border-gray-200 py-4 mb-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Nomer zamovlennya:</span>
              <span className="font-semibold">{order.orderNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Nomer komirky:</span>
              <span className="font-semibold text-xl text-blue-600">#{order.cellNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Suma:</span>
              <span className="font-semibold">{order.amount} hrn</span>
            </div>
          </div>

          {/* Open Cell Section */}
          {!cellOpened ? (
            <div className="mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Uvaga!</p>
                    <p>Pidijdit do ortomatu <strong>#{order.cellNumber}</strong> ta natysnit knopku nizhche.</p>
                    <p className="mt-1">Komirka vidkryetsya na <strong>30 sekund</strong>.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleOpenCell}
                disabled={cellOpening || openCellMutation.isPending}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {cellOpening || openCellMutation.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Vidkryttya komirky...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    Vidchynyty komirku #{order.cellNumber}
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-green-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-green-800 mb-1">
                      Komirka vidkryta!
                    </p>
                    <p className="text-sm text-green-700">
                      U vas ye 30 sekund, shchob zabraty tovar z komirky #{order.cellNumber}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Back to Home */}
          <div className="text-center">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Povernytysya na golovnu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}