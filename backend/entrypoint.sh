#!/bin/sh
set -e

echo "🔍 Checking environment..."
echo "NODE_ENV: ${NODE_ENV}"
echo "DATABASE_URL: ${DATABASE_URL:0:30}..." # Show only first 30 chars

echo ""
echo "🔍 Checking if dist/main.js exists..."
if [ ! -f "dist/main.js" ]; then
  echo "❌ ERROR: dist/main.js not found!"
  ls -la dist/ || echo "dist/ folder not found!"
  exit 1
fi
echo "✅ dist/main.js found"

echo ""
echo "🗄️ Running Prisma migrations..."
echo "Current directory: $(pwd)"
echo "Prisma schema path: ./prisma/schema.prisma"

if [ -f "./prisma/schema.prisma" ]; then
  echo "✅ Schema file found"
else
  echo "❌ Schema file NOT found!"
  ls -la ./prisma/ || echo "prisma/ folder not found!"
  exit 1
fi

echo ""
echo "📦 Running migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully"
else
  echo "❌ Migrations failed with exit code $?"
  exit 1
fi

echo ""
echo "🚀 Starting application..."
exec node dist/main.js
