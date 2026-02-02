/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // ✅ КРИТИЧНО: Transpile React Query для Vercel
  transpilePackages: ['@tanstack/react-query'],
  
  // ✅ ВИМКНУТИ experimental.esmExternals
  experimental: {
    esmExternals: false,
  },
  
  // Додаємо підтримку environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
  
  // Видалити console.* в production build
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error'], // Залишаємо console.error для критичних помилок
    } : false,
  },

  webpack: (config, { isServer }) => {
    // ✅ Додаємо fallback для browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;