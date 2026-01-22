#!/bin/sh
set -e

echo "🔍 Checking if dist/main.js exists..."
if [ ! -f "dist/main.js" ]; then
  echo "❌ ERROR: dist/main.js not found!"
  exit 1
fi

echo "✅ dist/main.js found"
echo "🗄️ Running Prisma migrations..."
npx prisma migrate deploy

echo "🚀 Starting application..."
exec node dist/main.js
