import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

type Tab = 'doctors' | 'couriers';

export default function AdminUsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<Tab>('doctors');
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [editingCourier, setEditingCourier] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    middleName: '',
    phone: '',
    ortomatIds: [] as string[],
  });

  // Захист роуту
  useEffect(() => {
    if (!authLoading && (!user || user.role.toUpperCase() !== 'ADMIN')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Завантаження лікарів
  const { data: doctors, isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => api.getDoctors(),
    enabled: !!user && user.role.toUpperCase() === 'ADMIN',
  });

  // Завантаження кур'єрів
  const { data: couriers, isLoading: couriersLoading } = useQuery({
    queryKey: ['couriers'],
    queryFn: () => api.getAllCouriers(),
    enabled: !!user && user.role.toUpperCase() === 'ADMIN',
  });

  // Завантаження доступних ортоматів
  const { data: availableOrtomats } = useQuery({
    queryKey: ['available-ortomats'],
    queryFn: () => api.getAvailableOrtomats(),
    enabled: showCourierModal,
  });

  // Завантаження всіх ортоматів (для редагування)
  const { data: allOrtomats } = useQuery({
    queryKey: ['ortomats'],
    queryFn: () => api.getOrtomats(),
    enabled: showCourierModal && !!editingCourier,
  });

  // Створення кур'єра
  const createCourierMutation = useMutation({
    mutationFn: (data: any) => api.createCourier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      queryClient.invalidateQueries({ queryKey: ['available-ortomats'] });
      setShowCourierModal(false);
      resetForm();
      alert('Кур\'єр успішно створений');
    },
    onError: (error: any) => {
      alert(`Помилка: ${error.message}`);
    },
  });

  // Оновлення кур'єра
  const updateCourierMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      api.updateCourier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      queryClient.invalidateQueries({ queryKey: ['available-ortomats'] });
      setShowCourierModal(false);
      setEditingCourier(null);
      resetForm();
      alert('Кур\'єр успішно оновлений');
    },
    onError: (error: any) => {
      alert(`Помилка: ${error.message}`);
    },
  });

  // Видалення кур'єра
  const deleteCourierMutation = useMutation({
    mutationFn: (id: string) => api.deleteCourier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      queryClient.invalidateQueries({ queryKey: ['available-ortomats'] });
      alert('Кур\'єр видалений');
    },
    onError: (error: any) => {
      alert(`Помилка: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      middleName: '',
      phone: '',
      ortomatIds: [],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      middleName: formData.middleName || undefined,
      ortomatIds: formData.ortomatIds.length > 0 ? formData.ortomatIds : undefined,
    };

    // Якщо редагуємо - не відправляємо пароль якщо він порожній
    if (editingCourier) {
      const updateData: any = { ...submitData };
      if (!formData.password) {
        delete updateData.password;
      }
      updateCourierMutation.mutate({ id: editingCourier.id, data: updateData });
    } else {
      createCourierMutation.mutate(submitData);
    }
  };

  const handleEditCourier = (courier: any) => {
    setEditingCourier(courier);
    setFormData({
      email: courier.email,
      password: '',
      firstName: courier.firstName,
      lastName: courier.lastName,
      middleName: courier.middleName || '',
      phone: courier.phone,
      ortomatIds: courier.ortomats?.map((o: any) => o.id) || [],
    });
    setShowCourierModal(true);
  };

  const handleDeleteCourier = (id: string) => {
    if (confirm('Видалити цього кур\'єра?')) {
      deleteCourierMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setShowCourierModal(false);
    setEditingCourier(null);
    resetForm();
  };

  const toggleOrtomat = (ortomatId: string) => {
    setFormData(prev => ({
      ...prev,
      ortomatIds: prev.ortomatIds.includes(ortomatId)
        ? prev.ortomatIds.filter(id => id !== ortomatId)
        : [...prev.ortomatIds, ortomatId]
    }));
  };

  if (authLoading || (activeTab === 'doctors' && doctorsLoading) || (activeTab === 'couriers' && couriersLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Завантаження...</div>
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/admin')}
              className="text-blue-600 hover:text-blue-700 mb-2 flex items-center"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Назад до панелі
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Управління користувачами
            </h1>
          </div>
          
          {activeTab === 'couriers' && (
            <button
              onClick={() => setShowCourierModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Створити кур'єра
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('doctors')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'doctors'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👨‍⚕️ Лікарі ({doctors?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('couriers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'couriers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🚚 Кур'єри ({couriers?.length || 0})
            </button>
          </nav>
        </div>

        {/* Doctors Table */}
        {activeTab === 'doctors' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ім'я</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Телефон</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ортомат</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {doctors?.map((doctor: any) => (
                  <tr key={doctor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {doctor.firstName} {doctor.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{doctor.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{doctor.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {doctor.doctorOrtomats?.[0]?.ortomat?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        doctor.isVerified 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {doctor.isVerified ? '✓ Так' : '⏳ Ні'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(!doctors || doctors.length === 0) && (
              <div className="text-center py-12">
                <p className="text-gray-500">Лікарів немає</p>
              </div>
            )}
          </div>
        )}

        {/* Couriers Table */}
        {activeTab === 'couriers' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ім'я</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Телефон</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ортомати</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Дії</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {couriers?.map((courier: any) => (
                  <tr key={courier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {courier.firstName} {courier.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{courier.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{courier.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {courier.ortomats?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {courier.ortomats.map((ortomat: any) => (
                              <span key={ortomat.id} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {ortomat.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">Не призначено</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditCourier(courier)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Редагувати
                      </button>
                      <button
                        onClick={() => handleDeleteCourier(courier.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Видалити
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(!couriers || couriers.length === 0) && (
              <div className="text-center py-12">
                <p className="text-gray-500">Кур'єрів немає</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Courier Modal */}
      {showCourierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold mb-4">
              {editingCourier ? 'Редагувати кур\'єра' : 'Новий кур\'єр'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Прізвище *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ім'я *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  По батькові
                </label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Телефон *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+380501234567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Пароль {editingCourier && '(залиште порожнім щоб не змінювати)'}
                </label>
                <input
                  type="password"
                  required={!editingCourier}
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Мінімум 6 символів</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Призначити ортомати
                </label>
                <div className="border border-gray-300 rounded-md p-4 max-h-48 overflow-y-auto">
                  {(editingCourier ? allOrtomats : availableOrtomats)?.map((ortomat: any) => {
                    const isAssigned = formData.ortomatIds.includes(ortomat.id);
                    const isOccupied = editingCourier && 
                      !isAssigned && 
                      !availableOrtomats?.some((o: any) => o.id === ortomat.id);

                    return (
                      <label 
                        key={ortomat.id} 
                        className={`flex items-center mb-2 cursor-pointer ${
                          isOccupied ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          disabled={isOccupied}
                          onChange={() => toggleOrtomat(ortomat.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {ortomat.name} - {ortomat.address}
                          {isOccupied && <span className="text-red-500 ml-2">(зайнятий)</span>}
                        </span>
                      </label>
                    );
                  })}

                  {(!availableOrtomats || availableOrtomats.length === 0) && !editingCourier && (
                    <p className="text-sm text-gray-500">Немає вільних ортоматів</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={createCourierMutation.isPending || updateCourierMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {createCourierMutation.isPending || updateCourierMutation.isPending
                    ? 'Збереження...'
                    : editingCourier
                    ? 'Оновити'
                    : 'Створити'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
