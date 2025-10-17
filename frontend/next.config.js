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
    
    // ✅ КРИТИЧНО: Force CommonJS для React Query
    config.resolve.alias = {
      ...config.resolve.alias,
      'react/jsx-runtime': 'react/jsx-runtime.js',
    };
    
    return config;
  },
};

module.exports = nextConfig;