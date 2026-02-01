import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';
import { useTranslation } from '../../../hooks/useTranslation';
import type { Ortomat, CreateOrtomatDto, UpdateOrtomatDto } from '../../../types';

export default function AdminOrtomatsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { t } = useTranslation();
  
  const [showModal, setShowModal] = useState(false);
  const [editingOrtomat, setEditingOrtomat] = useState<Ortomat | null>(null);
  const [formData, setFormData] = useState<CreateOrtomatDto>({
    name: '',
    address: '',
    city: '',
    totalCells: 37,
    status: 'active',
  });

  // Захист роуту
  useEffect(() => {
    if (!authLoading && (!user || user.role.toUpperCase() !== 'ADMIN')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Завантаження ортоматів
  const { data: ortomats, isLoading } = useQuery({
    queryKey: ['ortomats'],
    queryFn: () => api.getOrtomats(),
    enabled: !!user && user.role.toUpperCase() === 'ADMIN',
  });

  // Створення ортомату
  const createMutation = useMutation({
    mutationFn: (data: CreateOrtomatDto) => api.createOrtomat(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ortomats'] });
      setShowModal(false);
      resetForm();
      alert(t('admin.ortomatCreated'));
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Невідома помилка';
      alert(`${t('errors.general')}: ${message}`);
    },
  });

  // Оновлення ортомату
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrtomatDto }) =>
      api.updateOrtomat(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ortomats'] });
      setShowModal(false);
      setEditingOrtomat(null);
      resetForm();
      alert(t('admin.ortomatUpdated'));
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Невідома помилка';
      alert(`${t('errors.general')}: ${message}`);
    },
  });

  // Видалення ортомату
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteOrtomat(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ortomats'] });
      alert(t('admin.ortomatDeleted'));
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Невідома помилка';
      alert(`${t('errors.general')}: ${message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      totalCells: 37,
      status: 'active',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingOrtomat) {
      updateMutation.mutate({ id: editingOrtomat.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (ortomat: Ortomat) => {
    setEditingOrtomat(ortomat);
    setFormData({
      name: ortomat.name,
      address: ortomat.address,
      city: ortomat.city || '',
      totalCells: ortomat.totalCells,
      status: ortomat.status,
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('admin.confirmDeleteOrtomat'))) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingOrtomat(null);
    resetForm();
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  if (!user || user.role.toUpperCase() !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-600 hover:text-blue-700 mb-3 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('admin.backToDashboard')}
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t('admin.manageOrtomats')}
            </h1>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowModal(true)}
                className="flex-1 md:flex-none bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center text-sm md:text-base"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">{t('admin.addOrtomat')}</span>
                <span className="sm:hidden">Додати</span>
              </button>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-red-700 text-sm md:text-base"
              >
                Вийти
              </button>
            </div>
          </div>
        </div>

        {/* Ortomats List */}
        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.address')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.city')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.cells')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ortomats?.map((ortomat: Ortomat) => (
                <tr key={ortomat.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {ortomat.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{ortomat.address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{ortomat.city || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{ortomat.totalCells}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      ortomat.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {ortomat.status === 'active' ? t('admin.active') : t('admin.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(ortomat)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      {t('admin.edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(ortomat.id)}
                      className="text-red-600 hover:text-red-900 mr-4"
                    >
                      {t('admin.delete')}
                    </button>
                    <button
                      onClick={() => router.push(`/admin/ortomats/${ortomat.id}/cells`)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Менеджер комірок
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(!ortomats || ortomats.length === 0) && (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('admin.noOrtomats')}</p>
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {ortomats?.map((ortomat: Ortomat) => (
            <div key={ortomat.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {ortomat.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    📍 {ortomat.address}
                  </p>
                  {ortomat.city && (
                    <p className="text-sm text-gray-600">
                      🏙️ {ortomat.city}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  ortomat.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {ortomat.status === 'active' ? t('admin.active') : t('admin.inactive')}
                </span>
              </div>

              <div className="mb-3 pb-3 border-b">
                <span className="text-sm text-gray-600">
                  📦 Комірок: <span className="font-medium text-gray-900">{ortomat.totalCells}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleEdit(ortomat)}
                  className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {t('admin.edit')}
                </button>
                <button
                  onClick={() => handleDelete(ortomat.id)}
                  className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  {t('admin.delete')}
                </button>
                <button
                  onClick={() => router.push(`/admin/ortomats/${ortomat.id}/cells`)}
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 col-span-2"
                >
                  Менеджер комірок
                </button>
              </div>
            </div>
          ))}

          {(!ortomats || ortomats.length === 0) && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">{t('admin.noOrtomats')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">
              {editingOrtomat ? t('admin.editOrtomat') : t('admin.newOrtomat')}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.name')}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.address')}
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.city')}
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Київ, Львів, Одеса..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.cellsCount')}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.totalCells}
                  onChange={(e) => setFormData({ ...formData, totalCells: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.status')}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">{t('admin.active')}</option>
                  <option value="inactive">{t('admin.inactive')}</option>
                </select>
              </div>

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
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? t('common.saving')
                    : editingOrtomat
                    ? t('admin.update')
                    : t('admin.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
