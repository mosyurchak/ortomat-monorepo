// frontend/src/pages/admin/settings.tsx
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminSettings() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [purchaseTerms, setPurchaseTerms] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Backup states
  const [backupMessage, setBackupMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role.toUpperCase() !== 'ADMIN') {
        router.push('/login');
        return;
      }
      loadSettings();
    }
  }, [user, authLoading, router]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/settings`);
      setPurchaseTerms(response.data.purchaseTerms || '');
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage('Помилка завантаження налаштувань');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');

      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/settings`,
        { purchaseTerms },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage('✅ Налаштування успішно збережено!');

      setTimeout(() => {
        setMessage('');
      }, 3000);

    } catch (error: any) {
      console.error('Error saving settings:', error);
      setMessage('❌ Помилка збереження: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  // Експорт даних
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setBackupMessage('');

      const { blob, filename } = await api.exportBackup();

      // Створюємо посилання для завантаження файлу
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setBackupMessage('✅ Бекап успішно створено та завантажено!');
      setTimeout(() => setBackupMessage(''), 5000);
    } catch (error: any) {
      console.error('Error exporting backup:', error);
      setBackupMessage('❌ Помилка створення бекапу: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Імпорт даних
  const handleImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('⚠️ УВАГА! Це дія ПОВНІСТЮ ВИДАЛИТЬ всі поточні дані та замінить їх даними з бекапу. Продовжити?')) {
      return;
    }

    try {
      setIsImporting(true);
      setBackupMessage('');

      const text = await file.text();
      const backupData = JSON.parse(text);

      await api.importBackup(backupData);

      setBackupMessage('✅ Дані успішно відновлено з бекапу! Рекомендується перезавантажити сторінку.');

      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error: any) {
      console.error('Error importing backup:', error);
      setBackupMessage('❌ Помилка відновлення: ' + error.message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Завантаження...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/admin')}
              className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Назад до панелі
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              ⚙️ Налаштування системи
            </h1>
            <p className="text-gray-600 mt-2">
              Редагування глобальних налаштувань
            </p>
          </div>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Вийти
          </button>
        </div>

        {/* Settings Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-lg font-semibold text-gray-900">
                📋 Умови покупки
              </label>
              <span className="text-sm text-gray-500">
                Показуються на всіх карточках товарів
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Ці умови будуть відображатись у popup при натисканні на лінк "умови" в checkbox перед покупкою.
              Ви можете використовувати перенос рядків та нумерацію.
            </p>
            
            <textarea
              value={purchaseTerms}
              onChange={(e) => setPurchaseTerms(e.target.value)}
              rows={15}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Введіть умови покупки...

Приклад:

Загальні умови покупки:

1. Оплата
   - Оплата здійснюється через систему LiqPay
   - Приймаються всі види карток

2. Забір товару
   - Товар зберігається в комірці 24 години
   - Код доступу надсилається після оплати

3. Повернення
   - Повернення протягом 14 днів
   - При наявності чеку та упаковки

Контакти: support@ortomat.com"
            />
            
            <div className="mt-2 text-sm text-gray-500">
              Символів: {purchaseTerms.length}
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('✅') 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={loadSettings}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={saving || loading}
            >
              🔄 Скинути зміни
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving || !purchaseTerms.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Збереження...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Зберегти
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            👁️ Попередній перегляд
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Так виглядатимуть умови покупки в popup для користувачів:
          </p>
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <div className="text-gray-700 whitespace-pre-wrap">
              {purchaseTerms || 'Умови покупки не вказано'}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            ℹ️ Додаткова інформація
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Умови покупки показуються на всіх карточках товарів</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Користувач повинен прийняти умови перед покупкою (checkbox)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Можна використовувати нумерацію, відступи та переноси рядків</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Зміни відразу застосовуються на всіх карточках товарів</span>
            </li>
          </ul>
        </div>

        {/* Backup Section */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            💾 Резервне копіювання даних
          </h2>
          <p className="text-gray-600 mb-6">
            Створюйте бекапи для безпеки даних та відновлюйте систему з резервної копії
          </p>

          {/* Backup Message */}
          {backupMessage && (
            <div className={`mb-6 p-4 rounded-lg ${
              backupMessage.includes('✅')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {backupMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Backup */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-green-50 to-white">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 p-3 rounded-lg mr-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Експорт даних</h3>
                  <p className="text-sm text-gray-600">Створити бекап</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Завантажити всі дані системи в JSON файл. Включає користувачів, ортомати, продукти, замовлення та інше.
              </p>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Створення бекапу...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Завантажити бекап
                  </>
                )}
              </button>
            </div>

            {/* Import Backup */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-orange-50 to-white">
              <div className="flex items-center mb-4">
                <div className="bg-orange-100 p-3 rounded-lg mr-4">
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Імпорт даних</h3>
                  <p className="text-sm text-gray-600">Відновити з бекапу</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Відновити дані з файлу бекапу. <strong className="text-red-600">УВАГА:</strong> Це видалить всі поточні дані!
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isImporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Відновлення...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Завантажити файл бекапу
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Backup Warning */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-semibold text-yellow-900 mb-1">⚠️ Важливо:</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Експорт НЕ включає паролі користувачів з міркувань безпеки</li>
                  <li>• При імпорті всі користувачі матимуть пароль "RESTORE_REQUIRED" - треба змінити!</li>
                  <li>• Імпорт повністю видаляє поточні дані перед відновленням</li>
                  <li>• Рекомендується робити бекапи регулярно (щотижня)</li>
                  <li>• Зберігайте файли бекапів у безпечному місці</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
