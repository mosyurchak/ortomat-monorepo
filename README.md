# 🏥 Ortomat - Automated Orthopedic Products Vending System

**Ortomat** - це автоматизована система продажу ортопедичних виробів 24/7 через вендінгові автомати з QR-кодами, інтеграцією платежів Monobank та реферальною програмою для лікарів.

## 📋 Зміст

- [Огляд проекту](#-огляд-проекту)
- [Технічний стек](#-технічний-стек)
- [Архітектура системи](#-архітектура-системи)
- [Структура бази даних](#-структура-бази-даних)
- [Встановлення та налаштування](#-встановлення-та-налаштування)
- [API Документація](#-api-документація)
- [Аутентифікація та безпека](#-аутентифікація-та-безпека)
- [Реферальна система](#-реферальна-система)
- [Telegram Bot](#-telegram-bot)
- [Deployment](#-deployment)
- [Розробка](#-розробка)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Огляд проекту

### Основний функціонал

Ortomat - це повноцінна e-commerce платформа для автоматизованої торгівлі ортопедичними товарами:

1. **Вендінгові автомати** - фізичні пристрої з 37 комірками для зберігання товарів
2. **QR-код покупки** - клієнт сканує QR-код на автоматі та отримує доступ до каталогу
3. **Реферальна програма** - лікарі отримують бали за продажі через їх унікальний QR-код
4. **Онлайн оплата** - інтеграція з Monobank (Plata by Mono)
5. **Telegram бот** - нотифікації лікарів про продажі та статистику балів
6. **Адмін панель** - управління товарами, ортоматами, користувачами, статистикою
7. **Панелі для лікарів та кур'єрів** - перегляд статистики та заповнення автоматів

### Workflow покупки

```
1. Клієнт підходить до ортомату
2. Сканує QR-код на корпусі (містить referral code лікаря)
3. Відкривається каталог товарів доступних в цьому ортоматі
4. Обирає товар, натискає "Купити"
5. Переходить на сторінку оплати Monobank
6. Оплачує картою
7. Після підтвердження оплати - комірка автоматично відкривається
8. Клієнт забирає товар
9. Лікар-реферал отримує бали
10. Telegram бот надсилає нотифікацію лікарю
```

### Ролі користувачів

- **ADMIN** - повний доступ до системи, управління всіма ресурсами
- **DOCTOR** - лікар-реферал, отримує бали за продажі через свій QR-код
- **COURIER** - заповнює ортомати товарами, відслідковує інвентар

---

## 🛠 Технічний стек

### Backend

- **Framework:** NestJS 11.x (Node.js 20+)
- **Database:** PostgreSQL 15+
- **ORM:** Prisma 5.x
- **Authentication:** JWT (access + refresh tokens)
- **Validation:** class-validator, class-transformer
- **Security:** Helmet, CORS, Rate Limiting (Throttler)
- **Payments:** Monobank API (Plata by Mono)
- **Email:** Resend
- **Telegram:** node-telegram-bot-api
- **WebSocket:** @nestjs/websockets (для керування комірками)
- **QR Codes:** qrcode library

### Frontend

- **Framework:** Next.js 14.x (React 18)
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 3.x
- **State Management:** React Context API
- **HTTP Client:** Axios + custom wrapper with token refresh
- **Forms:** react-hook-form
- **Notifications:** react-hot-toast
- **Icons:** Lucide React
- **Data Fetching:** @tanstack/react-query

### Infrastructure

- **Backend Hosting:** Railway (PostgreSQL + Node.js)
- **Frontend Hosting:** Vercel
- **Version Control:** Git + GitHub
- **CI/CD:** Automatic deploy on push to main

---

## 🏗 Архітектура системи

### Діаграма високого рівня

```
┌─────────────────────────────────────────────────────────────────┐
│                          USERS                                   │
│  Клієнти  │  Лікарі (Telegram)  │  Адміни  │  Кур'єри          │
└────┬──────────────┬──────────────────┬───────────────┬──────────┘
     │              │                  │               │
     ▼              ▼                  ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js - Vercel)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Homepage │  │  Catalog │  │  Admin   │  │ Doctor/  │        │
│  │ (landing)│  │  (QR)    │  │  Panel   │  │ Courier  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS/REST API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND (NestJS - Railway)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   Auth   │  │ Ortomats │  │ Products │  │  Sales   │        │
│  │ (JWT)    │  │ Service  │  │ Service  │  │ Service  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Payments │  │ Telegram │  │  Email   │  │ WebSocket│        │
│  │(Monobank)│  │   Bot    │  │ (Resend) │  │ Gateway  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└────────────────────────┬────────────────────────────────────────┘
                         │ Prisma ORM
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL - Railway)                     │
│  Users │ Ortomats │ Products │ Sales │ Payments │ etc.          │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                              │
│  Monobank API  │  Telegram API  │  Resend Email  │ Ortomats HW  │
└─────────────────────────────────────────────────────────────────┘
```

### Структура проекту

```
ortomat-monorepo/
├── backend/                      # NestJS Backend API
│   ├── src/
│   │   ├── main.ts              # Entry point, security config
│   │   ├── admin/               # Admin endpoints (backup/restore)
│   │   ├── auth/                # Authentication (JWT, refresh)
│   │   ├── cells/               # Cell management
│   │   ├── email/               # Email service (Resend)
│   │   ├── events/              # WebSocket gateway
│   │   ├── logs/                # Activity & email logs
│   │   ├── ortomats/            # Ortomat CRUD
│   │   ├── orders/              # Order creation & payment
│   │   ├── products/            # Product CRUD
│   │   ├── referrals/           # Referral QR codes
│   │   ├── sales/               # Sales statistics
│   │   ├── settings/            # Global settings
│   │   ├── telegram-bot/        # Telegram bot service
│   │   ├── users/               # User management (doctors, couriers)
│   │   └── prisma/              # Prisma service
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   ├── migrations/          # Database migrations
│   │   └── seed.ts              # Seed data
│   ├── package.json
│   └── .env.example             # Environment variables template
│
├── frontend/                     # Next.js Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── index.tsx        # Landing page
│   │   │   ├── login.tsx        # Login page (Remember Me)
│   │   │   ├── admin/           # Admin dashboard
│   │   │   ├── doctor/          # Doctor dashboard
│   │   │   ├── courier/         # Courier dashboard
│   │   │   └── catalog/         # Public catalog (QR scan)
│   │   ├── components/          # React components
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # Auth state management
│   │   ├── lib/
│   │   │   └── api.ts           # API client with token refresh
│   │   ├── hooks/               # Custom React hooks
│   │   ├── types/               # TypeScript types
│   │   └── styles/              # Global styles
│   ├── public/                  # Static files
│   ├── package.json
│   └── .env.local               # Frontend env variables
│
├── .gitignore
├── package.json                  # Root package.json
├── Dockerfile                    # Production Docker image
├── docker-compose.yml            # Local development
├── railway.json                  # Railway deployment config
└── README.md                     # This file
```

---

## 🗄 Структура бази даних

### Основні моделі

#### **User** (Користувачі)
```prisma
model User {
  id          String     @id @default(uuid())
  email       String?    @unique        // NULL для лікарів
  password    String?                   // NULL для лікарів (тільки Telegram)
  role        UserRole                  // ADMIN | DOCTOR | COURIER
  firstName   String
  lastName    String
  phone       String     @unique        // Головний ідентифікатор

  // JWT Refresh Tokens
  refreshToken       String?   @unique
  refreshTokenExpiry DateTime?

  // Telegram Integration
  telegramChatId     String?   @unique
  telegramUsername   String?
  telegramNotifications Boolean @default(true)
}
```

#### **Ortomat** (Автомати)
```prisma
model Ortomat {
  id         String   @id @default(uuid())
  name       String                    // "Ортомат Хмельницький №1"
  address    String
  city       String?
  totalCells Int      @default(37)    // Кількість комірок
  status     String   @default("active")
}
```

#### **Product** (Товари)
```prisma
model Product {
  id              String   @id @default(uuid())
  name            String
  sku             String   @unique
  price           Float
  description     String?
  size            String   @default("Uni")
  mainImage       String?
  images          String[] @default([])

  // Referral System
  referralPoints  Int      @default(0)  // Бали за продаж

  // Additional fields
  color           String?
  material        String?
  manufacturer    String?
  country         String?
  type            String?
  sizeChartUrl    String?
}
```

#### **DoctorOrtomat** (Прив'язка лікаря до ортомату)
```prisma
model DoctorOrtomat {
  id           String   @id @default(uuid())
  doctorId     String
  ortomatId    String
  referralCode String   @unique      // Унікальний код (в QR)
  qrCode       String?               // Base64 QR code image
  totalPoints  Int      @default(0)  // Загальні бали
  totalSales   Int      @default(0)  // Кількість продажів
}
```

#### **Sale** (Продажі)
```prisma
model Sale {
  id              String    @id @default(uuid())
  productId       String?
  ortomatId       String?
  amount          Float
  pointsEarned    Int?                 // Бали за цей продаж
  referralCode    String?
  status          String    @default("pending")
  orderNumber     String?   @unique
  customerPhone   String?
  completedAt     DateTime?
  doctorOrtomatId String?
}
```

#### **Payment** (Платежі)
```prisma
model Payment {
  id              String   @id @default(uuid())
  orderId         String   @unique
  amount          Float
  status          String
  paymentProvider String   @default("mono")
  invoiceId       String?  @unique    // Monobank invoice ID
  pageUrl         String?             // Payment page URL
  monoStatus      String?
  monoData        Json?
}
```

#### **Cell** (Комірки)
```prisma
model Cell {
  id             String    @id @default(uuid())
  number         Int                    // 1-37
  ortomatId      String
  productId      String?
  isAvailable    Boolean   @default(true)
  lastRefillDate DateTime?
}
```

### Зв'язки між таблицями

```
User (DOCTOR) ──< DoctorOrtomat >── Ortomat
                      │
                      └──< Sale >── Product
                            │
                            └── Payment

User (COURIER) ──< CourierOrtomat >── Ortomat

Ortomat ──< Cell >── Product

Sale ──< PointsTransaction >── User (DOCTOR)
```

---

## 🚀 Встановлення та налаштування

### Передумови

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **PostgreSQL** >= 15.0
- **Git**

### 1. Клонування репозиторію

```bash
git clone https://github.com/mosyurchak/ortomat-monorepo.git
cd ortomat-monorepo
```

### 2. Встановлення залежностей

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 3. Налаштування Backend

#### 3.1. Створити файл `.env` в `backend/`

```bash
cd backend
cp .env.example .env
```

#### 3.2. Відредагувати `.env`

```env
# Database (local PostgreSQL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/ortomat?schema=public"

# JWT Secret (generate new one!)
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"
JWT_EXPIRES_IN="15m"           # Access token lifetime
JWT_REFRESH_EXPIRES_IN="7d"    # Refresh token lifetime

# URLs
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:3001"

# Email (Resend - https://resend.com)
RESEND_API_KEY="re_..."
RESEND_FROM="Ortomat <noreply@yourdomain.com>"

# Monobank Payment (https://api.monobank.ua/)
MONO_TOKEN="your_monobank_token"

# Telegram Bot (@BotFather)
TELEGRAM_BOT_TOKEN="123456789:ABC..."

# Server
PORT=3001
```

**⚠️ ВАЖЛИВО:** Згенеруйте власний `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

#### 3.3. Запустити базу даних (Docker)

```bash
# З кореневої папки проекту
docker-compose up -d postgres
```

Або встановити PostgreSQL локально.

#### 3.4. Створити структуру БД

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed initial data (admin user, demo products)
npm run prisma:seed
```

**Тестові облікові записи (після seed):**
- Admin: `admin@ortomat.ua` / `Admin123!`
- Doctor: `doctor@ortomat.ua` / `Doctor123!`
- Courier: `courier@ortomat.ua` / `Courier123!`

### 4. Налаштування Frontend

#### 4.1. Створити файл `.env.local` в `frontend/`

```bash
cd frontend
touch .env.local
```

#### 4.2. Додати змінні

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 5. Запуск проекту (Development)

#### Terminal 1 - Backend
```bash
cd backend
npm run start:dev
```
Доступно на: http://localhost:3001

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```
Доступно на: http://localhost:3000

### 6. Перевірка роботи

1. Відкрити http://localhost:3000 - landing page
2. Перейти на http://localhost:3000/login
3. Увійти як admin: `admin@ortomat.ua` / `Admin123!`
4. Перевірити admin dashboard

---

## 📡 API Документація

### Base URL

```
Development: http://localhost:3001
Production:  https://ortomat-production.up.railway.app
```

### Authentication

Всі захищені endpoints потребують JWT токену в заголовку:

```http
Authorization: Bearer <access_token>
```

### Основні Endpoints

#### 🔐 Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login (отримати access + refresh tokens) | ❌ |
| POST | `/api/auth/register` | Register new user | ❌ |
| POST | `/api/auth/refresh` | Refresh access token | ❌ |
| POST | `/api/auth/logout` | Logout (invalidate refresh token) | ✅ |
| GET | `/api/auth/profile` | Get current user profile | ✅ |

**Login Request:**
```json
POST /api/auth/login
{
  "email": "admin@ortomat.ua",
  "password": "Admin123!"
}
```

**Login Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@ortomat.ua",
    "role": "ADMIN",
    "firstName": "Admin",
    "lastName": "User"
  }
}
```

#### 🏪 Ortomats (`/api/ortomats`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/ortomats` | Get all ortomats | ✅ |
| GET | `/api/ortomats/:id` | Get ortomat by ID | ✅ |
| GET | `/api/ortomats/:id/catalog` | Get public catalog (for QR) | ❌ |
| GET | `/api/ortomats/:id/catalog?ref=CODE` | Catalog with referral code | ❌ |
| POST | `/api/ortomats` | Create new ortomat | ✅ ADMIN |
| PATCH | `/api/ortomats/:id` | Update ortomat | ✅ ADMIN |
| DELETE | `/api/ortomats/:id` | Delete ortomat | ✅ ADMIN |

#### 📦 Products (`/api/products`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/products` | Get all products | ✅ |
| GET | `/api/products/:id` | Get product by ID | ✅ |
| POST | `/api/products` | Create new product | ✅ ADMIN |
| PATCH | `/api/products/:id` | Update product | ✅ ADMIN |
| DELETE | `/api/products/:id` | Delete product | ✅ ADMIN |

#### 🛒 Orders (`/api/orders`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/orders/create` | Create new order | ❌ |
| POST | `/api/orders/:id/create-mono-payment` | Create Monobank payment | ❌ |
| POST | `/api/orders/:id/check-payment-status` | Check payment status | ❌ |
| POST | `/api/orders/:id/open-cell` | Open cell (after payment) | ❌ |
| POST | `/api/orders/mono-callback` | Monobank webhook | ❌ |

#### 👥 Users (`/api/users`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users` | Get all users | ✅ ADMIN |
| GET | `/api/users/doctors` | Get all doctors | ✅ ADMIN |
| POST | `/api/users/doctors` | Create doctor | ✅ ADMIN |
| PATCH | `/api/users/doctors/:id` | Update doctor | ✅ ADMIN |
| DELETE | `/api/users/doctors/:id` | Delete doctor | ✅ ADMIN |

#### 📊 Sales (`/api/sales`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/sales` | Get all sales | ✅ |
| GET | `/api/sales/stats` | Get sales statistics | ✅ |
| GET | `/api/sales/my-stats` | Get doctor's stats | ✅ DOCTOR |

### Rate Limiting

Критичні endpoints мають обмеження запитів:

| Endpoint | Limit |
|----------|-------|
| `/api/auth/login` | 5 req/min |
| `/api/orders/:id/open-cell` | 3 req/min |
| `/api/orders/create` | 10 req/min |
| `/api/admin/backup` | 2 req/hour |
| `/api/admin/restore` | 1 req/hour |

---

## 🔐 Аутентифікація та безпека

### JWT Authentication

Система використовує **два типи токенів**:

#### Access Token
- **Lifetime:** 15 хвилин
- **Storage:** `localStorage` (Remember Me) або `sessionStorage` (без Remember Me)
- **Usage:** Передається в кожному запиті в заголовку `Authorization: Bearer <token>`

#### Refresh Token
- **Lifetime:** 7 днів
- **Storage:** `localStorage` (тільки якщо Remember Me = true)
- **Usage:** Автоматичне оновлення access token
- **Security:** Хешується в БД (bcrypt), invalidується при logout

### "Remember Me" Функціонал

При логіні користувач може обрати "Залишатись в системі":

**Remember Me = true:**
- `access_token` → `localStorage` (15 хв)
- `refresh_token` → `localStorage` (7 днів)
- Користувач залишається в системі після закриття браузера

**Remember Me = false:**
- `access_token` → `sessionStorage` (15 хв)
- `refresh_token` → НЕ зберігається
- Сесія діє максимум 15 хвилин

### Security Headers

- **Helmet** - захист від XSS, clickjacking
- **CORS** - whitelist allowed origins
- **CSP** - Content Security Policy
- **HSTS** - Force HTTPS
- **Rate Limiting** - захист від brute force

### Password Requirements

- Мінімум 8 символів
- Велика літера (A-Z)
- Маленька літера (a-z)
- Цифра (0-9)
- Спеціальний символ (@$!%*?&)

---

## 🎁 Реферальна система

### Як працює

1. **Створення лікаря-рефералa:**
   - Адмін створює користувача з роллю `DOCTOR`
   - Адмін прив'язує лікаря до ортомату
   - Автоматично генерується унікальний `referralCode`
   - Генерується QR-код з посиланням: `https://ortomat.com.ua/catalog/{ortomatId}?ref=DOC123`

2. **Покупка через реферал:**
   - Клієнт сканує QR-код → відкривається каталог
   - При створенні замовлення передається `referralCode`
   - З Product береться `referralPoints` (наприклад, 50 балів)
   - При успішній оплаті:
     - Створюється `Sale` з `pointsEarned: 50`
     - Оновлюється `DoctorOrtomat.totalPoints += 50`
     - Telegram бот надсилає нотифікацію лікарю

3. **Перегляд статистики:**
   - Лікар заходить в `/doctor` dashboard
   - Або використовує Telegram бот: `/stats`

---

## 🤖 Telegram Bot

### Налаштування

1. Створити бота через [@BotFather](https://t.me/BotFather)
2. Отримати `TELEGRAM_BOT_TOKEN`
3. Додати в `backend/.env`
4. Запустити backend - бот автоматично стартує

### Доступні команди

| Команда | Опис |
|---------|------|
| `/start` | Прив'язати Telegram до акаунту лікаря |
| `/stats` | Переглянути статистику балів та продажів |
| `📊 Моя статистика` | Кнопка (те саме що /stats) |
| `/help` | Показати довідку |
| `/unlink` | Відв'язати Telegram від акаунту |

### Процес прив'язки

1. Лікар: `/start`
2. Бот: "Надішліть номер телефону" (кнопка)
3. Лікар підтверджує
4. Бот знаходить User з таким phone та role=DOCTOR
5. Зберігає telegramChatId
6. Показує постійну кнопку "📊 Моя статистика"

### Нотифікації про продажі

При кожному продажі лікар отримує:

```
🎉 Новий продаж!

📦 Товар: Ортопедичні устілки Comfort+
💰 Отримано балів: +50
📊 Всього балів: 350
💵 Сума продажу: 450 грн

Вітаємо! 🎊
```

---

## 🚀 Deployment

### Production Stack

- **Backend:** Railway (PostgreSQL + Node.js)
- **Frontend:** Vercel
- **Domain:** ortomat.com.ua
- **SSL:** Automatic

### Backend Deployment (Railway)

#### Environment Variables

```env
DATABASE_URL=postgresql://...
JWT_SECRET=<generated-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=https://ortomat.com.ua
BACKEND_URL=https://ortomat-production.up.railway.app
RESEND_API_KEY=re_...
MONO_TOKEN=<monobank-token>
TELEGRAM_BOT_TOKEN=<telegram-token>
PORT=3001
NODE_ENV=production
```

#### Deploy Commands

```bash
# Build
npm run build

# Start
npm run start:prod
```

### Frontend Deployment (Vercel)

#### Environment Variables

```env
NEXT_PUBLIC_API_URL=https://ortomat-production.up.railway.app
```

#### Auto-deploy

Vercel автоматично деплоїть при push в `main`.

---

## 💻 Розробка

### Database Migrations

```bash
cd backend

# Create migration
npx prisma migrate dev --name add_new_field

# Generate Prisma Client
npx prisma generate

# Apply migrations (production)
npx prisma migrate deploy

# View database
npx prisma studio
```

### Git Workflow

```bash
git checkout -b feature/new-feature
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

### Commit Convention

- `feat:` - new feature
- `fix:` - bug fix
- `docs:` - documentation
- `refactor:` - code restructure
- `chore:` - maintenance

---

## 🐛 Troubleshooting

### Backend не стартує

**Проблема:** `Can't reach database server`

**Рішення:**
```bash
# Перевірити PostgreSQL
docker ps

# Перезапустити
docker-compose restart postgres

# Перевірити DATABASE_URL
echo $DATABASE_URL
```

---

### 401 Unauthorized

**Проблема:** Отримуєте 401 з валідним токеном

**Рішення:**
```bash
# Перевірити JWT_SECRET
echo $JWT_SECRET

# Очистити localStorage
# DevTools → Application → Local Storage → Clear

# Залогінитися знову
```

---

### Monobank Payment не працює

**Рішення:**
```bash
# Перевірити webhook
curl https://api.monobank.ua/api/merchant/invoice/webhook \
  -H "X-Token: <MONO_TOKEN>"
```

---

### Telegram Bot не відповідає

**Рішення:**
```bash
# Перевірити токен
curl https://api.telegram.org/bot<TOKEN>/getMe

# Перевірити logs
railway logs
```

Якщо 409 Conflict - два backend використовують той самий токен.

---

## 📞 Support

**GitHub:** https://github.com/mosyurchak/ortomat-monorepo

---

## 📄 License

Proprietary - Всі права захищені

---

**🎉 Готово! Тепер у вас є повна документація для роботи з Ortomat.**
