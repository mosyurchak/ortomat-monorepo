#!/bin/bash

# Скрипт для діагностики проблеми з Railway

echo "🔍 Діагностика Railway Backend..."
echo ""

# 1. Перевірка чи backend взагалі працює
echo "1️⃣ Перевіряємо чи backend доступний..."
BACKEND_URL="https://ortomat-monorepo-production.up.railway.app"

response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL")
if [ "$response" = "200" ] || [ "$response" = "404" ]; then
    echo "✅ Backend доступний (HTTP $response)"
else
    echo "❌ Backend не відповідає (HTTP $response)"
fi
echo ""

# 2. Перевірка routes
echo "2️⃣ Перевіряємо доступні routes..."
echo "Тестуємо GET /api/orders..."
curl -s -X GET "$BACKEND_URL/api/orders" | head -c 200
echo ""
echo ""

# 3. Тестування create-mono-payment endpoint
echo "3️⃣ Тестуємо POST /api/orders/:id/create-mono-payment..."
TEST_ORDER_ID="test-123"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BACKEND_URL/api/orders/$TEST_ORDER_ID/create-mono-payment")
http_code=$(echo "$response" | grep "HTTP_CODE" | cut -d: -f2)
body=$(echo "$response" | sed '$d')

echo "HTTP Status: $http_code"
echo "Response: $body"
echo ""

# 4. Інтерпретація результатів
echo "📊 Результати:"
echo "─────────────────"

if [ "$http_code" = "404" ]; then
    echo "❌ ПРОБЛЕМА: Endpoint не знайдено (404)"
    echo ""
    echo "Можливі причини:"
    echo "1. Railway не задеплоїв останні зміни"
    echo "2. OrdersController не зареєстрований"
    echo "3. Код старої версії все ще працює"
    echo ""
    echo "РІШЕННЯ:"
    echo "→ Зайдіть в Railway Dashboard"
    echo "→ Натисніть 'Redeploy' для backend service"
elif [ "$http_code" = "500" ]; then
    echo "❌ ПРОБЛЕМА: Внутрішня помилка сервера (500)"
    echo ""
    echo "Можливі причини:"
    echo "1. MONO_TOKEN не налаштований"
    echo "2. Prisma міграції не застосовані"
    echo "3. MonoPaymentService викликає помилку"
    echo ""
    echo "РІШЕННЯ:"
    echo "→ Перевірте Railway logs"
    echo "→ Додайте MONO_TOKEN в environment variables"
    echo "→ Запустіть: npx prisma migrate deploy"
elif [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo "✅ Endpoint працює!"
else
    echo "⚠️ Незрозумілий статус: $http_code"
fi

echo ""
echo "🔗 Корисні посилання:"
echo "Railway Dashboard: https://railway.app"
echo "Backend URL: $BACKEND_URL"
