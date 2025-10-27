import { useRouter } from 'next/router';
import Head from 'next/head';
import { useTranslation } from '../hooks/useTranslation';

export default function RegisterSuccessPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <>
      <Head>
        <title>Реєстрація успішна - Ortomat</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-green-600 text-6xl mb-6">✓</div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Реєстрація успішна! 🎉
          </h1>
          
          <p className="text-gray-600 mb-6">
            На вашу пошту відправлено лист з підтвердженням. 
            Будь ласка, перевірте свій inbox і підтвердіть email.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 mb-2">
              <strong>📧 Наступні кроки:</strong>
            </p>
            <ol className="text-sm text-blue-700 text-left space-y-2">
              <li>1. Відкрийте email на вашій пошті</li>
              <li>2. Натисніть на посилання підтвердження</li>
              <li>3. Увійдіть в особистий кабінет</li>
              <li>4. Отримайте свій QR код для продажів</li>
            </ol>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            Не бачите лист? Перевірте папку "Спам"
          </p>

          <button
            onClick={() => router.push('/login')}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Перейти до входу
          </button>
        </div>
      </div>
    </>
  );
}
