/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Виключити SSR для цих роутів
  experimental: {
    // Або використовуємо output: 'export' для static export
  },
  // Додаємо підтримку environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
}

module.exports = nextConfig