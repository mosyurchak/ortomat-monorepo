import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

type Tab = 'doctors' | 'couriers';

// Helper функції для форматування телефону
const formatPhoneNumber = (value: string): string => {
  // Видаляємо всі нецифрові символи
  const digits = value.replace(/[^\d]/g, '');

  // Якщо починається з 380, видаляємо 38
  let phoneDigits = digits;
  if (digits.startsWith('380')) {
    phoneDigits = digits.slice(2); // Видаляємо 38, залишаємо 0...
  } else if (digits.startsWith('38')) {
    phoneDigits = digits.slice(2);
  }

  // Обмежуємо до 10 цифр ПЕРЕД додаванням 0
  phoneDigits = phoneDigits.slice(0, 10);

  // Автоматично додаємо 0 на початку ТІЛЬКИ якщо цифр менше 10 і не починається з 0
  if (phoneDigits.length > 0 && phoneDigits.length < 10 && !phoneDigits.startsWith('0')) {
    phoneDigits = '0' + phoneDigits;
  }

  // Гарантуємо що не більше 10 цифр після всіх операцій
  phoneDigits = phoneDigits.slice(0, 10);

  // Форматуємо: +38 (0XX) XXX-XX-XX
  if (phoneDigits.length === 0) return '';

  let formatted = '+38 (';

  if (phoneDigits.length >= 1) {
    formatted += phoneDigits[0]; // 0
  }
  if (phoneDigits.length >= 2) {
    formatted += phoneDigits.slice(1, 3); // XX
  }
  if (phoneDigits.length >= 3) {
    formatted += ') ';
    formatted += phoneDigits.slice(3, 6); // XXX
  }
  if (phoneDigits.length >= 6) {
    formatted += '-';
    formatted += phoneDigits.slice(6, 8); // XX
  }
  if (phoneDigits.length >= 8) {
    formatted += '-';
    formatted += phoneDigits.slice(8, 10); // XX
  }

  return formatted;
};

// Обробник для Backspace - автоматично перескакує через ), -, пробіли
const handlePhoneKeyDown = (
  e: React.KeyboardEvent<HTMLInputElement>,
  value: string,
  setValue: (value: string) => void
) => {
  if (e.key === 'Backspace') {
    const input = e.currentTarget;
    const cursorPos = input.selectionStart || 0;

    // Якщо курсор на спеціальному символі (дужка, дефіс, пробіл), переміщуємо на 1 символ назад
    const charBeforeCursor = value[cursorPos - 1];
    if (charBeforeCursor === ')' || charBeforeCursor === '-' || charBeforeCursor === ' ' || charBeforeCursor === '(') {
      e.preventDefault();

      // Видаляємо цифру перед спеціальним символом
      const digits = value.replace(/[^\d]/g, '');
      const newDigits = digits.slice(0, -1);
      const formatted = formatPhoneNumber(newDigits);
      setValue(formatted);

      // Встановлюємо курсор в правильну позицію після форматування
      setTimeout(() => {
        const newCursorPos = formatted.length;
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  }
};

// Обробник для фокусу - автоматично додає +38 (0 якщо поле порожнє
const handlePhoneFocus = (
  e: React.FocusEvent<HTMLInputElement>,
  value: string,
  setValue: (value: string) => void
) => {
  if (!value || value.trim() === '') {
    const formatted = '+38 (0';
    setValue(formatted);

    // Встановлюємо курсор після 0
    setTimeout(() => {
      e.target.setSelectionRange(7, 7); // позиція після "+38 (0"
    }, 0);
  }
};

const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
  // Видаляємо всі нецифрові символи
  let digits = phone.replace(/[^\d]/g, '');

  // Якщо починається з 380 або 38, видаляємо префікс (так само як у formatPhoneNumber)
  if (digits.startsWith('380')) {
    digits = digits.slice(2); // Видаляємо 38, залишаємо 0...
  } else if (digits.startsWith('38')) {
    digits = digits.slice(2);
  }

  if (digits.length === 0) {
    return { isValid: false, error: 'Введіть номер телефону' };
  }

  // Перевіряємо що є 10 цифр (0XXXXXXXXX)
  if (digits.length < 10) {
    return {
      isValid: false,
      error: `Введено ${digits.length} з 10 цифр. Формат: +38 (0XX) XXX-XX-XX`
    };
  }

  if (digits.length > 10) {
    return { isValid: false, error: 'Занадто багато цифр' };
  }

  // Перевіряємо що починається з 0
  if (!digits.startsWith('0')) {
    return { isValid: false, error: 'Введіть будь ласка коректний номер телефону' };
  }

  return { isValid: true };
};

// Конвертує форматований телефон в +380XXXXXXXXX для відправки на backend
const phoneToBackendFormat = (formattedPhone: string): string => {
  const digits = formattedPhone.replace(/[^\d]/g, '');
  if (digits.length === 10 && digits.startsWith('0')) {
    return '+38' + digits;
  }
  return formattedPhone; // Повертаємо як є якщо щось не так
};

export default function AdminUsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('doctors');

  // Courier state
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [editingCourier, setEditingCourier] = useState<any>(null);
  const [courierFormData, setCourierFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    middleName: '',
    phone: '',
    ortomatIds: [] as string[],
  });

  // Doctor state
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [doctorFormData, setDoctorFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    middleName: '',
    phone: '',
    ortomatId: '',
  });

  // Phone validation errors
  const [phoneErrors, setPhoneErrors] = useState({
    doctor: '',
    courier: '',
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
    queryFn: () => api.getCouriers(),
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
    enabled: (showCourierModal && !!editingCourier) || showDoctorModal,
  });

  // ==================== DOCTOR MUTATIONS ====================

  // Створення лікаря
  const createDoctorMutation = useMutation({
    mutationFn: (data: any) => api.createDoctor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      setShowDoctorModal(false);
      resetDoctorForm();
      alert('Лікар успішно створений');
    },
    onError: (error: any) => {
      alert(`Помилка: ${error.message}`);
    },
  });

  // Оновлення лікаря
  const updateDoctorMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.updateDoctor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      setShowDoctorModal(false);
      setEditingDoctor(null);
      resetDoctorForm();
      alert('Лікар успішно оновлений');
    },
    onError: (error: any) => {
      alert(`Помилка: ${error.message}`);
    },
  });

  // Видалення лікаря
  const deleteDoctorMutation = useMutation({
    mutationFn: (id: string) => api.deleteDoctor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      alert('Лікар видалений');
    },
    onError: (error: any) => {
      alert(`Помилка: ${error.message}`);
    },
  });

  // ==================== COURIER MUTATIONS ====================

  // Створення кур'єра
  const createCourierMutation = useMutation({
    mutationFn: (data: any) => api.createCourier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      queryClient.invalidateQueries({ queryKey: ['available-ortomats'] });
      setShowCourierModal(false);
      resetCourierForm();
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
      resetCourierForm();
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

  // ==================== DOCTOR HANDLERS ====================

  const resetDoctorForm = () => {
    setDoctorFormData({
      email: '',
      firstName: '',
      lastName: '',
      middleName: '',
      phone: '',
      ortomatId: '',
    });
  };

  const handleDoctorSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Валідація телефону перед відправкою
    const phoneValidation = validatePhoneNumber(doctorFormData.phone);
    if (!phoneValidation.isValid) {
      setPhoneErrors(prev => ({ ...prev, doctor: phoneValidation.error || '' }));
      return;
    }

    const submitData = {
      ...doctorFormData,
      phone: phoneToBackendFormat(doctorFormData.phone), // Конвертуємо в +380XXXXXXXXX
      middleName: doctorFormData.middleName || undefined,
      ortomatId: doctorFormData.ortomatId || undefined,
    };

    if (editingDoctor) {
      updateDoctorMutation.mutate({ id: editingDoctor.id, data: submitData });
    } else {
      createDoctorMutation.mutate(submitData);
    }
  };

  const handleEditDoctor = (doctor: any) => {
    setEditingDoctor(doctor);
    setDoctorFormData({
      email: doctor.email,
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      middleName: doctor.middleName || '',
      phone: formatPhoneNumber(doctor.phone || ''), // Форматуємо телефон з БД
      ortomatId: doctor.doctorOrtomats?.[0]?.ortomatId || '',
    });
    setPhoneErrors(prev => ({ ...prev, doctor: '' })); // Очищаємо помилки
    setShowDoctorModal(true);
  };

  const handleDeleteDoctor = (id: string) => {
    if (confirm('Видалити цього лікаря?')) {
      deleteDoctorMutation.mutate(id);
    }
  };

  const handleCloseDoctorModal = () => {
    setShowDoctorModal(false);
    setEditingDoctor(null);
    resetDoctorForm();
    setPhoneErrors(prev => ({ ...prev, doctor: '' })); // Очищаємо помилки
  };

  // ==================== COURIER HANDLERS ====================

  const resetCourierForm = () => {
    setCourierFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      middleName: '',
      phone: '',
      ortomatIds: [],
    });
  };

  const handleCourierSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Валідація телефону перед відправкою
    const phoneValidation = validatePhoneNumber(courierFormData.phone);
    if (!phoneValidation.isValid) {
      setPhoneErrors(prev => ({ ...prev, courier: phoneValidation.error || '' }));
      return;
    }

    const submitData = {
      ...courierFormData,
      phone: phoneToBackendFormat(courierFormData.phone), // Конвертуємо в +380XXXXXXXXX
      middleName: courierFormData.middleName || undefined,
      ortomatIds: courierFormData.ortomatIds.length > 0 ? courierFormData.ortomatIds : undefined,
    };

    if (editingCourier) {
      const updateData: any = { ...submitData };
      if (!courierFormData.password) {
        delete updateData.password;
      }
      updateCourierMutation.mutate({ id: editingCourier.id, data: updateData });
    } else {
      createCourierMutation.mutate(submitData);
    }
  };

  const handleEditCourier = (courier: any) => {
    setEditingCourier(courier);
    setCourierFormData({
      email: courier.email,
      password: '',
      firstName: courier.firstName,
      lastName: courier.lastName,
      middleName: courier.middleName || '',
      phone: formatPhoneNumber(courier.phone || ''), // Форматуємо телефон з БД
      ortomatIds: courier.ortomats?.map((o: any) => o.id) || [],
    });
    setPhoneErrors(prev => ({ ...prev, courier: '' })); // Очищаємо помилки
    setShowCourierModal(true);
  };

  const handleDeleteCourier = (id: string) => {
    if (confirm('Видалити цього кур\'єра?')) {
      deleteCourierMutation.mutate(id);
    }
  };

  const handleCloseCourierModal = () => {
    setShowCourierModal(false);
    setEditingCourier(null);
    resetCourierForm();
    setPhoneErrors(prev => ({ ...prev, courier: '' })); // Очищаємо помилки
  };

  const toggleCourierOrtomat = (ortomatId: string) => {
    setCourierFormData(prev => ({
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
        <div className="mb-6 md:mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-600 hover:text-blue-700 mb-3 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Назад до панелі
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Управління користувачами
            </h1>

            <div className="flex items-center gap-2">
              {activeTab === 'doctors' && (
                <button
                  onClick={() => setShowDoctorModal(true)}
                  className="flex-1 md:flex-none bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center text-sm md:text-base"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Додати лікаря</span>
                  <span className="sm:hidden">Додати</span>
                </button>
              )}

              {activeTab === 'couriers' && (
                <button
                  onClick={() => setShowCourierModal(true)}
                  className="flex-1 md:flex-none bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center text-sm md:text-base"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Додати кур'єра</span>
                  <span className="sm:hidden">Додати</span>
                </button>
              )}

              <button
                onClick={logout}
                className="bg-red-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-red-700 text-sm md:text-base whitespace-nowrap"
              >
                Вийти
              </button>
            </div>
          </div>
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
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ім'я</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Телефон</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ортомат</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Реферальне посилання</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Дії</th>
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
                        {doctor.doctorOrtomats?.[0]?.referralCode ? (
                          <div className="flex items-center">
                            <input
                              type="text"
                              readOnly
                              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/catalog/${doctor.doctorOrtomats[0].ortomatId}?ref=${doctor.doctorOrtomats[0].referralCode}`}
                              className="text-xs text-gray-600 bg-gray-50 border border-gray-300 rounded px-2 py-1 w-64"
                              onClick={(e) => e.currentTarget.select()}
                            />
                            <button
                              onClick={() => {
                                const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/catalog/${doctor.doctorOrtomats[0].ortomatId}?ref=${doctor.doctorOrtomats[0].referralCode}`;
                                navigator.clipboard.writeText(url);
                                alert('Посилання скопійовано!');
                              }}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                              title="Копіювати"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Не призначено ортомат</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditDoctor(doctor)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Редагувати
                        </button>
                        <button
                          onClick={() => handleDeleteDoctor(doctor.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Видалити
                        </button>
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

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {doctors?.map((doctor: any) => (
                <div key={doctor.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {doctor.firstName} {doctor.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{doctor.email}</p>
                      <p className="text-sm text-gray-600">{doctor.phone}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Ортомат:</span>
                      <span className="ml-2 text-gray-900">
                        {doctor.doctorOrtomats?.[0]?.ortomat?.name || '-'}
                      </span>
                    </div>

                    {doctor.doctorOrtomats?.[0]?.referralCode && (
                      <div>
                        <span className="font-medium text-gray-700 block mb-1">Реферальне посилання:</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/catalog/${doctor.doctorOrtomats[0].ortomatId}?ref=${doctor.doctorOrtomats[0].referralCode}`}
                            className="flex-1 text-xs text-gray-600 bg-gray-50 border border-gray-300 rounded px-2 py-1"
                            onClick={(e) => e.currentTarget.select()}
                          />
                          <button
                            onClick={() => {
                              const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/catalog/${doctor.doctorOrtomats[0].ortomatId}?ref=${doctor.doctorOrtomats[0].referralCode}`;
                              navigator.clipboard.writeText(url);
                              alert('Посилання скопійовано!');
                            }}
                            className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 rounded"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    <button
                      onClick={() => handleEditDoctor(doctor)}
                      className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Редагувати
                    </button>
                    <button
                      onClick={() => handleDeleteDoctor(doctor.id)}
                      className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Видалити
                    </button>
                  </div>
                </div>
              ))}

              {(!doctors || doctors.length === 0) && (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-500">Лікарів немає</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Couriers Table */}
        {activeTab === 'couriers' && (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
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

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {couriers?.map((courier: any) => (
                <div key={courier.id} className="bg-white rounded-lg shadow p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900">
                      {courier.firstName} {courier.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{courier.email}</p>
                    <p className="text-sm text-gray-600">{courier.phone}</p>
                  </div>

                  <div className="mb-3">
                    <span className="font-medium text-gray-700 text-sm block mb-2">Ортомати:</span>
                    {courier.ortomats?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {courier.ortomats.map((ortomat: any) => (
                          <span key={ortomat.id} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {ortomat.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Не призначено</span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <button
                      onClick={() => handleEditCourier(courier)}
                      className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Редагувати
                    </button>
                    <button
                      onClick={() => handleDeleteCourier(courier.id)}
                      className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Видалити
                    </button>
                  </div>
                </div>
              ))}

              {(!couriers || couriers.length === 0) && (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-500">Кур'єрів немає</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Courier Modal */}
      {showCourierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingCourier ? 'Редагувати кур\'єра' : 'Новий кур\'єр'}
            </h2>
            
            <form onSubmit={handleCourierSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Прізвище *
                  </label>
                  <input
                    type="text"
                    required
                    value={courierFormData.lastName}
                    onChange={(e) => setCourierFormData({ ...courierFormData, lastName: e.target.value })}
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
                    value={courierFormData.firstName}
                    onChange={(e) => setCourierFormData({ ...courierFormData, firstName: e.target.value })}
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
                  value={courierFormData.middleName}
                  onChange={(e) => setCourierFormData({ ...courierFormData, middleName: e.target.value })}
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
                  value={courierFormData.email}
                  onChange={(e) => setCourierFormData({ ...courierFormData, email: e.target.value })}
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
                  value={courierFormData.phone}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setCourierFormData({ ...courierFormData, phone: formatted });
                    // Очищаємо помилку при введенні
                    if (phoneErrors.courier) {
                      setPhoneErrors(prev => ({ ...prev, courier: '' }));
                    }
                  }}
                  onFocus={(e) => handlePhoneFocus(e, courierFormData.phone, (value) =>
                    setCourierFormData({ ...courierFormData, phone: value })
                  )}
                  onKeyDown={(e) => handlePhoneKeyDown(e, courierFormData.phone, (value) =>
                    setCourierFormData({ ...courierFormData, phone: value })
                  )}
                  placeholder="+38 (0XX) XXX-XX-XX"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    phoneErrors.courier ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {phoneErrors.courier && (
                  <p className="mt-1 text-sm text-red-600">{phoneErrors.courier}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Пароль {editingCourier && '(залиште порожнім щоб не змінювати)'}
                </label>
                <input
                  type="password"
                  required={!editingCourier}
                  minLength={6}
                  value={courierFormData.password}
                  onChange={(e) => setCourierFormData({ ...courierFormData, password: e.target.value })}
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
                    const isAssigned = courierFormData.ortomatIds.includes(ortomat.id);
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
                          onChange={() => toggleCourierOrtomat(ortomat.id)}
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
                  onClick={handleCloseCourierModal}
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

      {/* Doctor Modal */}
      {showDoctorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingDoctor ? 'Редагувати лікаря' : 'Новий лікар'}
            </h2>

            <form onSubmit={handleDoctorSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Прізвище *
                  </label>
                  <input
                    type="text"
                    required
                    value={doctorFormData.lastName}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, lastName: e.target.value })}
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
                    value={doctorFormData.firstName}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, firstName: e.target.value })}
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
                  value={doctorFormData.middleName}
                  onChange={(e) => setDoctorFormData({ ...doctorFormData, middleName: e.target.value })}
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
                  value={doctorFormData.email}
                  onChange={(e) => setDoctorFormData({ ...doctorFormData, email: e.target.value })}
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
                  value={doctorFormData.phone}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setDoctorFormData({ ...doctorFormData, phone: formatted });
                    // Очищаємо помилку при введенні
                    if (phoneErrors.doctor) {
                      setPhoneErrors(prev => ({ ...prev, doctor: '' }));
                    }
                  }}
                  onFocus={(e) => handlePhoneFocus(e, doctorFormData.phone, (value) =>
                    setDoctorFormData({ ...doctorFormData, phone: value })
                  )}
                  onKeyDown={(e) => handlePhoneKeyDown(e, doctorFormData.phone, (value) =>
                    setDoctorFormData({ ...doctorFormData, phone: value })
                  )}
                  placeholder="+38 (0XX) XXX-XX-XX"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    phoneErrors.doctor ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {phoneErrors.doctor && (
                  <p className="mt-1 text-sm text-red-600">{phoneErrors.doctor}</p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Призначити ортомат
                </label>
                <select
                  value={doctorFormData.ortomatId}
                  onChange={(e) => setDoctorFormData({ ...doctorFormData, ortomatId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Не призначено</option>
                  {allOrtomats?.map((ortomat: any) => (
                    <option key={ortomat.id} value={ortomat.id}>
                      {ortomat.name} - {ortomat.address}
                    </option>
                  ))}
                </select>
              </div>

              {/* ✅ ДОДАНО: Реферальне посилання та QR-код */}
              {editingDoctor && editingDoctor.doctorOrtomats?.[0]?.referralCode && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Реферальне посилання
                  </h3>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Посилання для клієнтів:
                    </label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/catalog/${editingDoctor.doctorOrtomats[0].ortomatId}?ref=${editingDoctor.doctorOrtomats[0].referralCode}`}
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm"
                        onClick={(e) => e.currentTarget.select()}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/catalog/${editingDoctor.doctorOrtomats[0].ortomatId}?ref=${editingDoctor.doctorOrtomats[0].referralCode}`;
                          navigator.clipboard.writeText(url);
                          alert('Посилання скопійовано!');
                        }}
                        className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Копіювати
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      QR-код:
                    </label>
                    <div className="flex justify-center bg-white p-4 rounded-lg border border-gray-200">
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/qr-code/doctor/${editingDoctor.id}/image`}
                        alt="QR Code"
                        className="w-48 h-48"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Лікар може показати цей QR-код клієнтам для сканування
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseDoctorModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={createDoctorMutation.isPending || updateDoctorMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {createDoctorMutation.isPending || updateDoctorMutation.isPending
                    ? 'Збереження...'
                    : editingDoctor
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
