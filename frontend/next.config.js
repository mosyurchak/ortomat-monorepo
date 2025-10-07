/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: 'http://localhost:4000/api',
  },
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig