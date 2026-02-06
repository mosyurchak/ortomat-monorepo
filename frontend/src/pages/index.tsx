import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>Ortomat - Ортопедичні товари 24/7</title>
        <meta name="description" content="Система автоматизованого продажу ортопедичних виробів" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Іконка/Логотип */}
          <div className="mb-8 flex justify-center">
            <div className="bg-white p-6 rounded-full shadow-lg">
              <svg
                className="w-20 h-20 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
          </div>

          {/* Головний заголовок */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            Ortomat
          </h1>

          {/* Підзаголовок */}
          <p className="text-2xl md:text-3xl text-gray-700 mb-6">
            Ортопедичні товари 24/7
          </p>

          {/* Опис */}
          <p className="text-xl md:text-2xl text-gray-600 mb-12 font-light">
            Система автоматизованого продажу ортопедичних виробів
          </p>

          {/* Блок з інструкцією */}
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border-2 border-blue-200">
            {/* Іконка QR */}
            <div className="mb-6 flex justify-center">
              <svg
                className="w-16 h-16 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>

            {/* Текст інструкції */}
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4">
              Як здійснити покупку?
            </h2>

            <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
              Для того щоб здійснити покупку, проскануйте будь ласка <span className="font-semibold text-blue-600">QR-код</span> на корпусі вибраного ортомату і виберіть потрібний товар!
            </p>
          </div>

          {/* Додаткова інформація (опціонально) */}
          <div className="mt-8 text-gray-500 text-sm">
            <p>Працюємо цілодобово • Безконтактна оплата • Миттєве отримання товару</p>
          </div>
        </div>
      </div>
    </>
  );
}
