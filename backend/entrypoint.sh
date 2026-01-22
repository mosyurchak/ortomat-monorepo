#!/bin/sh
set -e

echo "🔍 Checking environment..."
echo "NODE_ENV: ${NODE_ENV}"
echo "DATABASE_URL: ${DATABASE_URL:0:30}..." # Show only first 30 chars

echo ""
echo "🔍 Checking dist/ structure..."
ls -la dist/
echo ""

# Check for main.js in common locations
if [ -f "dist/main.js" ]; then
  MAIN_JS_PATH="dist/main.js"
  echo "✅ Found: dist/main.js"
elif [ -f "dist/src/main.js" ]; then
  MAIN_JS_PATH="dist/src/main.js"
  echo "✅ Found: dist/src/main.js"
else
  echo "❌ ERROR: main.js not found in dist/ or dist/src/"
  echo "Searching for main.js..."
  find dist/ -name "main.js" -type f || echo "No main.js found anywhere in dist/"
  exit 1
fi

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
echo "Using: $MAIN_JS_PATH"
exec node $MAIN_JS_PATH
