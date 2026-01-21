import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import QRCode from 'qrcode';

export default function OrtomatDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { logout } = useAuth();

  const [ortomat, setOrtomat] = useState<any>(null);
  const [inviteQR, setInviteQR] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrtomat();
      loadInvites();
    }
  }, [id]);

  const loadOrtomat = async () => {
    try {
      const data = await api.getOrtomat(id as string);
      setOrtomat(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load ortomat:', error);
      setLoading(false);
    }
  };

  const loadInvites = async () => {
    try {
      const data = await api.getOrtomatInvites(id as string);
      setInvites(data);
    } catch (error) {
      console.error('Failed to load invites:', error);
    }
  };

  const generateInvite = async () => {
    setGenerating(true);
    try {
      const data = await api.createInvite(id as string);
      
      // Генерація QR коду
      const qrCodeDataUrl = await QRCode.toDataURL(data.inviteUrl, {
        width: 300,
        margin: 2,
      });

      setInviteQR(qrCodeDataUrl);
      setInviteUrl(data.inviteUrl);
      loadInvites(); // Оновити список
    } catch (error) {
      console.error('Failed to generate invite:', error);
      alert('Помилка генерації запрошення');
    } finally {
      setGenerating(false);
    }
  };

  const deactivateInvite = async (token: string) => {
    if (!confirm('Деактивувати це запрошення?')) return;

    try {
      await api.deactivateInvite(token);
      loadInvites();
      alert('Запрошення деактивовано');
    } catch (error) {
      console.error('Failed to deactivate invite:', error);
      alert('Помилка деактивації');
    }
  };

  const downloadQR = () => {
    if (!inviteQR) return;
    
    const link = document.createElement('a');
    link.download = `ortomat-${ortomat?.name}-invite-qr.png`;
    link.href = inviteQR;
    link.click();
  };

  const copyInviteUrl = () => {
    navigator.clipboard.writeText(inviteUrl);
    alert('Посилання скопійовано!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/admin/ortomats')}
              className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
            >
              ← Назад до списку
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {ortomat?.name}
            </h1>
            <p className="text-gray-600 mt-2">{ortomat?.address}</p>
          </div>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Вийти
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Code Generator */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🎫 Запрошення лікарів
            </h2>
            
            {!inviteQR ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-6">
                  Згенеруйте QR код для запрошення лікаря до цього ортомата
                </p>
                <button
                  onClick={generateInvite}
                  disabled={generating}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {generating ? 'Генерація...' : '✨ Згенерувати QR код'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* QR Code */}
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <img 
                    src={inviteQR} 
                    alt="Invite QR Code" 
                    className="mx-auto rounded-lg shadow"
                  />
                  <p className="text-sm text-gray-500 mt-4">
                    Лікар відсканує цей QR код для реєстрації
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={downloadQR}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    💾 Завантажити QR
                  </button>
                  <button
                    onClick={copyInviteUrl}
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                  >
                    📋 Копіювати лінк
                  </button>
                </div>

                {/* URL */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-600 mb-2">Посилання для запрошення:</p>
                  <p className="text-sm text-gray-800 break-all font-mono">
                    {inviteUrl}
                  </p>
                </div>

                {/* New QR button */}
                <button
                  onClick={generateInvite}
                  disabled={generating}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {generating ? 'Генерація...' : '🔄 Згенерувати новий QR код'}
                </button>
              </div>
            )}
          </div>

          {/* Invites List */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📋 Історія запрошень
            </h2>

            {invites.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Запрошень ще немає
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className={`p-4 rounded-lg border ${
                      invite.usedAt
                        ? 'bg-green-50 border-green-200'
                        : invite.isActive
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded ${
                            invite.usedAt
                              ? 'bg-green-100 text-green-800'
                              : invite.isActive
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {invite.usedAt
                            ? '✅ Використано'
                            : invite.isActive
                            ? '🔓 Активне'
                            : '🔒 Деактивовано'}
                        </span>
                      </div>
                      {invite.isActive && !invite.usedAt && (
                        <button
                          onClick={() => deactivateInvite(invite.token)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Деактивувати
                        </button>
                      )}
                    </div>

                    <p className="text-sm text-gray-600">
                      Створено: {new Date(invite.createdAt).toLocaleDateString('uk-UA')}
                    </p>
                    
                    {invite.usedAt && (
                      <p className="text-sm text-gray-600">
                        Використано: {new Date(invite.usedAt).toLocaleDateString('uk-UA')}
                      </p>
                    )}
                    
                    <p className="text-sm text-gray-600">
                      Діє до: {new Date(invite.expiresAt).toLocaleDateString('uk-UA')}
                    </p>

                    <p className="text-xs text-gray-400 mt-2 font-mono break-all">
                      {invite.token.substring(0, 20)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
