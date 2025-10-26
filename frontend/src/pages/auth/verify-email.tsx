import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '@/lib/api';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;

    const verifyEmail = async () => {
      try {
        const response = await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(response.data.message || 'Email успішно підтверджено!');
        
        // Редірект на логін через 3 секунди
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Помилка підтвердження email');
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Підтвердження email...
            </h1>
            <p className="text-gray-600">
              Будь ласка, зачекайте
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-600 text-6xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Email підтверджено!
            </h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">
              Перенаправлення на сторінку входу...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-600 text-6xl mb-4">✕</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Помилка підтвердження
            </h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              На сторінку входу
            </button>
          </>
        )}
      </div>
    </div>
  );
}