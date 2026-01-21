# 🏦 Налаштування Monobank Payment

## Крок 1: Створіть файл .env

Створіть файл `backend/.env` з наступним вмістом:

```bash
# Database (використовуйте ваші існуючі дані)
DATABASE_URL="postgresql://username:password@localhost:5432/ortomat?schema=public"

# JWT (використовуйте ваш існуючий секрет)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Frontend URL
FRONTEND_URL="http://localhost:3000"

# SendGrid Email (використовуйте ваш існуючий ключ)
SENDGRID_API_KEY="SG.your-sendgrid-api-key"
SMTP_FROM="noreply@ortomat.com.ua"

# Monobank Payment - ДОДАЙТЕ ВАШ ТОКЕН ТУТ
MONO_TOKEN="ВАШ_ТЕСТОВИЙ_ТОКЕН_З_api.monobank.ua"

# Server
PORT=3001
```

## Крок 2: Вставте ваш Monobank токен

Замініть `ВАШ_ТЕСТОВИЙ_ТОКЕН_З_api.monobank.ua` на токен який ви отримали з https://api.monobank.ua/

## Крок 3: Webhook URL для локального тестування

Для тестування webhook локально, вам потрібен публічний URL. Використайте один з варіантів:

### Варіант 1: ngrok (рекомендовано)
```bash
# Встановіть ngrok
npm install -g ngrok

# Запустіть ngrok
ngrok http 3001

# Використовуйте URL типу:
# https://xxxx-xx-xxx-xxx-xx.ngrok-free.app/api/mono-payment/webhook
```

### Варіант 2: localtunnel
```bash
# Встановіть localtunnel
npm install -g localtunnel

# Запустіть localtunnel
lt --port 3001 --subdomain ortomat-test

# Використовуйте URL:
# https://ortomat-test.loca.lt/api/mono-payment/webhook
```

## Крок 4: Тестові дані для Monobank

В тестовому середовищі Monobank можна використовувати будь-які дані картки:

- **Номер картки**: Будь-який валідний за алгоритмом Луна (наприклад: 5168742060221193)
- **Дата**: Будь-яка майбутня дата (наприклад: 12/25)
- **CVV**: Будь-які 3 цифри (наприклад: 123)

## Крок 5: Webhook для production

Коли будете деплоїти на production (Railway), webhook URL буде:
```
https://ortomat-monorepo-production.up.railway.app/api/mono-payment/webhook
```

## Структура створеного модуля

```
backend/src/mono-payment/
├── dto/
│   ├── create-invoice.dto.ts    # Валідація для створення invoice
│   └── webhook.dto.ts           # Структура webhook від Monobank
├── mono-payment.service.ts      # Бізнес-логіка (API calls, signature verification)
├── mono-payment.controller.ts   # HTTP endpoints
└── mono-payment.module.ts       # NestJS модуль
```

## API Endpoints створені

### 1. Створення invoice
```http
POST /api/mono-payment/create-invoice
Content-Type: application/json

{
  "amount": 4200,
  "merchantPaymInfo": {
    "reference": "order-123",
    "destination": "Оплата товару"
  },
  "redirectUrl": "http://localhost:3000/payment/success",
  "webHookUrl": "https://your-public-url/api/mono-payment/webhook"
}

Response:
{
  "success": true,
  "data": {
    "invoiceId": "p2_9ZgpZVsl3",
    "pageUrl": "https://pay.mbnk.biz/p2_9ZgpZVsl3"
  }
}
```

### 2. Перевірка статусу
```http
GET /api/mono-payment/status/:invoiceId

Response:
{
  "success": true,
  "data": {
    "invoiceId": "p2_9ZgpZVsl3",
    "status": "success",
    "amount": 4200,
    "createdDate": "2024-01-15T12:00:00Z",
    ...
  }
}
```

### 3. Webhook (викликається Monobank)
```http
POST /api/mono-payment/webhook
X-Sign: <signature>

{
  "invoiceId": "p2_9ZgpZVsl3",
  "status": "success",
  "amount": 4200,
  ...
}
```

## Наступні кроки

1. ✅ Створено модуль mono-payment
2. ✅ Додано змінні оточення
3. ⏳ Оновити Prisma схему
4. ⏳ Інтегрувати з orders модулем
5. ⏳ Оновити frontend

Продовжуємо! 🚀
