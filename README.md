# 🏥 Ortomat - Автоматизована система продажу ортопедичних виробів

## 📋 Зміст

- [Про проект](#про-проект)
- [Технології](#технології)
- [Архітектура](#архітектура)
- [Структура проекту](#структура-проекту)
- [Встановлення та запуск](#встановлення-та-запуск)
- [Конфігурація](#конфігурація)
- [Основні модулі](#основні-модулі)
- [API Endpoints](#api-endpoints)
- [База даних](#база-даних)
- [Deployment](#deployment)
- [Користувачі та ролі](#користувачі-та-ролі)
- [Email система](#email-система)
- [QR Code система](#qr-code-система)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Про проект

**Ortomat** - це повнофункціональна система для управління автоматами з продажу ортопедичних виробів. Система дозволяє:

- 👨‍⚕️ Лікарям видавати QR-коди пацієнтам для придбання товарів
- 🚚 Кур'єрам управляти наповненням автоматів
- 👨‍💼 Адміністраторам контролювати всю систему
- 💳 Приймати оплату через LiqPay
- 📧 Відправляти email сповіщення
- 📊 Переглядати статистику продажів та комісій

---

## 🛠 Технології

### Backend
- **NestJS** - Node.js framework
- **Prisma ORM** - робота з PostgreSQL
- **PostgreSQL** - база даних
- **JWT** - аутентифікація
- **SendGrid** - email сервіс
- **bcryptjs** - хешування паролів
- **QRCode** - генерація QR кодів
- **LiqPay API** - прийом платежів

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - типізація
- **TailwindCSS** - стилізація
- **React Query** - управління станом та кешування
- **Recharts** - графіки та діаграми

### DevOps
- **Railway** - хостинг backend + PostgreSQL
- **Vercel** - хостинг frontend
- **GitHub** - CI/CD

---

## 🏗 Архітектура

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vercel)                     │
│  Next.js + TypeScript + TailwindCSS                          │
│  https://ortomat.com.ua                                      │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/REST API
┌────────────────────┴────────────────────────────────────────┐
│                     BACKEND (Railway)                        │
│  NestJS + Prisma + PostgreSQL                                │
│  https://ortomat-monorepo-production.up.railway.app          │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    PostgreSQL              SendGrid
    (Railway)              (Email Service)
```

---

## 📁 Структура проекту

```
ortomat-monorepo/
├── backend/                        # NestJS Backend
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── migrations/            # Database migrations
│   ├── src/
│   │   ├── auth/                  # Authentication module
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── dto/
│   │   ├── users/                 # Users module
│   │   │   ├── users.service.ts
│   │   │   └── users.controller.ts
│   │   ├── courier/               # Courier management
│   │   │   ├── courier.service.ts
│   │   │   ├── courier.controller.ts
│   │   │   └── courier.module.ts
│   │   ├── ortomats/              # Ortomats management
│   │   │   ├── ortomats.service.ts
│   │   │   └── ortomats.controller.ts
│   │   ├── cells/                 # Cells management
│   │   │   ├── cells.service.ts
│   │   │   └── cells.controller.ts
│   │   ├── products/              # Products management
│   │   │   ├── products.service.ts
│   │   │   └── products.controller.ts
│   │   ├── sales/                 # Sales tracking
│   │   │   ├── sales.service.ts
│   │   │   └── sales.controller.ts
│   │   ├── email/                 # Email service
│   │   │   ├── email.service.ts
│   │   │   └── templates/         # Handlebars templates
│   │   ├── qr-code/               # QR code generation
│   │   │   ├── qr-code.service.ts
│   │   │   └── qr-code.controller.ts
│   │   ├── invite/                # Ortomat invites
│   │   │   ├── invite.service.ts
│   │   │   └── invite.controller.ts
│   │   ├── prisma/                # Prisma service
│   │   │   └── prisma.service.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env                       # Environment variables
│   └── package.json
│
├── frontend/                      # Next.js Frontend
│   ├── public/
│   │   └── images/
│   ├── src/
│   │   ├── components/            # Reusable components
│   │   │   ├── Layout.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── contexts/              # React contexts
│   │   │   └── AuthContext.tsx
│   │   ├── lib/                   # Utilities
│   │   │   ├── api.ts            # API client
│   │   │   └── liqpay.ts         # LiqPay helpers
│   │   ├── pages/                 # Next.js pages
│   │   │   ├── index.tsx         # Landing page
│   │   │   ├── login.tsx         # Login
│   │   │   ├── register.tsx      # Registration (doctors only)
│   │   │   ├── forgot-password.tsx
│   │   │   ├── reset-password.tsx
│   │   │   ├── verify-email.tsx
│   │   │   ├── admin/            # Admin dashboard
│   │   │   │   ├── index.tsx
│   │   │   │   ├── users/
│   │   │   │   │   └── index.tsx # Users management
│   │   │   │   ├── ortomats/
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   └── [id].tsx  # Ortomat details
│   │   │   │   ├── products/
│   │   │   │   └── sales/
│   │   │   ├── doctor/           # Doctor dashboard
│   │   │   │   └── index.tsx
│   │   │   └── courier/          # Courier dashboard
│   │   │       └── index.tsx
│   │   └── styles/
│   │       └── globals.css
│   ├── .env.local                # Environment variables
│   └── package.json
│
└── README.md                      # This file
```

---

## 🚀 Встановлення та запуск

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Git

### 1. Клонування репозиторію

```bash
git clone https://github.com/your-username/ortomat-monorepo.git
cd ortomat-monorepo
```

### 2. Backend Setup

```bash
cd backend
npm install

# Створити .env файл
cp .env.example .env

# Редагувати .env (див. секцію Конфігурація)
code .env

# Запустити міграції
npx prisma migrate dev

# Seed database (опційно)
npx prisma db seed

# Запустити сервер
npm run start:dev
```

Backend буде доступний на `http://localhost:3001`

### 3. Frontend Setup

```bash
cd frontend
npm install

# Створити .env.local файл
cp .env.local.example .env.local

# Редагувати .env.local
code .env.local

# Запустити dev server
npm run dev
```

Frontend буде доступний на `http://localhost:3000`

---

## ⚙️ Конфігурація

### Backend Environment Variables (.env)

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ortomat?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Frontend URL
FRONTEND_URL="http://localhost:3000"

# SendGrid Email
SENDGRID_API_KEY="SG.your-sendgrid-api-key"
SMTP_FROM="noreply@ortomat.com.ua"

# LiqPay (Payment)
LIQPAY_PUBLIC_KEY="your_liqpay_public_key"
LIQPAY_PRIVATE_KEY="your_liqpay_private_key"

# Server
PORT=3001
```

### Frontend Environment Variables (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

---

## 📦 Основні модулі

### 1. Authentication Module

**Файли:** `backend/src/auth/*`

**Функціонал:**
- Реєстрація лікарів (тільки лікарі можуть реєструватись публічно)
- Логін з JWT токенами
- Email верифікація
- Відновлення паролю
- Роль-базована авторизація (RBAC)

**Endpoints:**
- `POST /api/auth/register` - Реєстрація лікаря
- `POST /api/auth/login` - Логін
- `GET /api/auth/profile` - Отримати профіль
- `GET /api/auth/verify-email?token=xxx` - Верифікація email
- `POST /api/auth/forgot-password` - Запит на відновлення паролю
- `POST /api/auth/reset-password` - Скидання паролю

### 2. Courier Module

**Файли:** `backend/src/courier/*`

**Функціонал:**
- Створення кур'єрів (тільки Admin)
- Призначення ортоматів кур'єрам
- Один ортомат = один кур'єр
- Один кур'єр = багато ортоматів
- Редагування та видалення кур'єрів

**Endpoints:**
- `POST /api/courier` - Створити кур'єра (Admin)
- `GET /api/courier` - Всі кур'єри (Admin)
- `GET /api/courier/:id` - Один кур'єр (Admin)
- `PATCH /api/courier/:id` - Оновити кур'єра (Admin)
- `DELETE /api/courier/:id` - Видалити кур'єра (Admin)
- `GET /api/courier/available/ortomats` - Вільні ортомати (Admin)

### 3. Ortomats Module

**Файли:** `backend/src/ortomats/*`

**Функціонал:**
- CRUD операції з ортоматами
- Управління комірками (37 комірок на ортомат)
- Призначення продуктів в комірки
- Статус ортоматів (online/offline)

**Endpoints:**
- `GET /api/ortomats` - Всі ортомати
- `GET /api/ortomats/:id` - Один ортомат
- `POST /api/ortomats` - Створити ортомат (Admin)
- `PATCH /api/ortomats/:id` - Оновити ортомат (Admin)
- `DELETE /api/ortomats/:id` - Видалити ортомат (Admin)

### 4. QR Code Module

**Файли:** `backend/src/qr-code/*`

**Функціонал:**
- Генерація унікальних QR кодів для кожного лікаря
- QR коди містять реферальний код лікаря
- Автоматичне відстеження комісій

**Endpoints:**
- `GET /api/qr-code/doctor/:doctorId` - QR код лікаря
- `GET /api/qr-code/download/:doctorId` - Завантажити QR

### 5. Sales Module

**Файли:** `backend/src/sales/*`

**Функціонал:**
- Відстеження всіх продажів
- Розрахунок комісій лікарів
- Статистика по ортоматах
- Інтеграція з LiqPay

**Endpoints:**
- `GET /api/sales` - Всі продажі (Admin)
- `GET /api/sales/doctor/:doctorId` - Продажі лікаря
- `GET /api/sales/admin/stats` - Загальна статистика (Admin)

### 6. Email Module

**Файли:** `backend/src/email/*`

**Функціонал:**
- Відправка email через SendGrid
- Handlebars templates
- Email верифікація
- Відновлення паролю
- Welcome email

**Templates:**
- `verify-email.hbs` - Email верифікація
- `welcome.hbs` - Вітальний email
- `reset-password.hbs` - Скидання паролю

### 7. Invite Module

**Файли:** `backend/src/invite/*`

**Функціонал:**
- Генерація invite посилань для ортоматів
- Лікарі можуть приєднатись до ортомату через invite
- Токени діють 30 днів

**Endpoints:**
- `POST /api/invite/create/:ortomatId` - Створити invite (Admin)
- `GET /api/invite/validate?token=xxx` - Перевірити invite
- `GET /api/invite/ortomat/:ortomatId` - Всі invites ортомату
- `POST /api/invite/deactivate/:token` - Деактивувати invite

---

## 🌐 API Endpoints

### Public Endpoints (без авторизації)

```
POST   /api/auth/register           - Реєстрація лікаря
POST   /api/auth/login              - Логін
GET    /api/auth/verify-email       - Верифікація email
POST   /api/auth/forgot-password    - Запит на відновлення паролю
POST   /api/auth/reset-password     - Скидання паролю
```

### Protected Endpoints (потребують JWT токен)

#### Admin Only
```
POST   /api/courier                 - Створити кур'єра
GET    /api/courier                 - Всі кур'єри
PATCH  /api/courier/:id             - Оновити кур'єра
DELETE /api/courier/:id             - Видалити кур'єра
POST   /api/ortomats                - Створити ортомат
PATCH  /api/ortomats/:id            - Оновити ортомат
DELETE /api/ortomats/:id            - Видалити ортомат
GET    /api/sales                   - Всі продажі
GET    /api/users                   - Всі користувачі
POST   /api/invite/create/:id       - Створити invite
```

#### Doctor Endpoints
```
GET    /api/auth/profile            - Профіль лікаря
GET    /api/qr-code/doctor/:id      - QR код лікаря
GET    /api/sales/doctor/:id        - Продажі лікаря
```

#### Courier Endpoints
```
GET    /api/ortomats                - Призначені ортомати
PATCH  /api/cells/:id               - Оновити комірку
```

---

## 🗄 База даних

### Prisma Schema

**Основні моделі:**

1. **User** - Користувачі (Admin, Doctor, Courier)
2. **Ortomat** - Автомати
3. **Cell** - Комірки в автоматі (37 на кожен ортомат)
4. **Product** - Продукти
5. **DoctorOrtomat** - Зв'язок лікаря з ортоматом + реферальний код
6. **CourierOrtomat** - Зв'язок кур'єра з ортоматом
7. **Sale** - Продажі
8. **ActivityLog** - Логи системи
9. **EmailLog** - Email логи
10. **OrtomatInvite** - Invite посилання

### Міграції

```bash
# Створити нову міграцію
npx prisma migrate dev --name migration_name

# Застосувати міграції в продакшн
npx prisma migrate deploy

# Синхронізувати schema з БД (pull)
npx prisma db pull

# Відкрити Prisma Studio (GUI для БД)
npx prisma studio
```

---

## 🚀 Deployment

### Backend (Railway)

1. Створіть новий проект на [Railway.app](https://railway.app)
2. Підключіть GitHub репозиторій
3. Додайте PostgreSQL service
4. Налаштуйте змінні середовища
5. Root Directory: `/backend`
6. Build Command: `npm run build`
7. Start Command: `npm run start:prod`

**Environment Variables на Railway:**
```
DATABASE_URL (автоматично з PostgreSQL)
JWT_SECRET
FRONTEND_URL
SENDGRID_API_KEY
SMTP_FROM
LIQPAY_PUBLIC_KEY
LIQPAY_PRIVATE_KEY
PORT=3001
```

### Frontend (Vercel)

1. Створіть новий проект на [Vercel.com](https://vercel.com)
2. Підключіть GitHub репозиторій
3. Root Directory: `/frontend`
4. Framework Preset: Next.js
5. Налаштуйте змінні середовища

**Environment Variables на Vercel:**
```
NEXT_PUBLIC_API_URL=https://ortomat-monorepo-production.up.railway.app
NEXT_PUBLIC_FRONTEND_URL=https://ortomat.com.ua
```

### Custom Domain

1. В Vercel: Settings → Domains → Add `ortomat.com.ua`
2. Налаштуйте DNS записи у вашого domain provider:
   ```
   A     @     76.76.21.21
   CNAME www   cname.vercel-dns.com
   ```

---

## 👥 Користувачі та ролі

### Типи користувачів

#### 1. Admin 👨‍💼
**Доступ:** Повний контроль системи

**Можливості:**
- Створювати/редагувати/видаляти кур'єрів
- Управляти ортоматами
- Управляти продуктами
- Призначати ортомати кур'єрам
- Переглядати всі продажі та статистику
- Створювати invite посилання для лікарів
- Переглядати всіх користувачів

**Тестовий акаунт:**
```
Email: admin@ortomat.ua
Password: password123
```

#### 2. Doctor 👨‍⚕️
**Доступ:** Особистий кабінет

**Можливості:**
- Переглядати свій QR код
- Завантажувати QR код для друку
- Переглядати свої продажі
- Переглядати статистику комісій
- Приєднуватись до ортоматів через invite

**Реєстрація:** Публічна через `/register`

**Тестовий акаунт:**
```
Email: doctor@ortomat.ua
Password: password123
```

#### 3. Courier 🚚
**Доступ:** Управління призначеними ортоматами

**Можливості:**
- Переглядати призначені ортомати
- Оновлювати стан комірок
- Додавати/видаляти продукти з комірок
- Позначати комірки як наповнені

**Реєстрація:** Тільки через Admin панель

**Тестовий акаунт:**
```
Email: courier@ortomat.ua
Password: password123
```

### Створення тестових користувачів

```sql
-- Admin
INSERT INTO users (id, email, password, role, "firstName", "lastName", phone, "isVerified")
VALUES (
  gen_random_uuid(),
  'admin@ortomat.ua',
  '$2a$10$hashed_password_here', -- password123
  'ADMIN',
  'Адмін',
  'Система',
  '+380501234567',
  true
);

-- Doctor
INSERT INTO users (id, email, password, role, "firstName", "lastName", phone, "isVerified")
VALUES (
  gen_random_uuid(),
  'doctor@ortomat.ua',
  '$2a$10$hashed_password_here',
  'DOCTOR',
  'Іван',
  'Петров',
  '+380501234568',
  true
);

-- Courier
INSERT INTO users (id, email, password, role, "firstName", "lastName", phone, "isVerified")
VALUES (
  gen_random_uuid(),
  'courier@ortomat.ua',
  '$2a$10$hashed_password_here',
  'COURIER',
  'Петро',
  'Іванов',
  '+380501234569',
  true
);
```

---

## 📧 Email система

### SendGrid Setup

1. Створіть акаунт на [SendGrid.com](https://sendgrid.com)
2. Verify domain `ortomat.com.ua`
3. Створіть API Key
4. Додайте в `.env`:
   ```
   SENDGRID_API_KEY=SG.your_api_key
   SMTP_FROM=noreply@ortomat.com.ua
   ```

### Email Templates

Розташування: `backend/src/email/templates/*.hbs`

**Доступні templates:**
1. `verify-email.hbs` - Верифікація email
2. `welcome.hbs` - Вітальний лист
3. `reset-password.hbs` - Скидання паролю

**Приклад створення нового template:**

```handlebars
<!-- backend/src/email/templates/new-template.hbs -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{subject}}</title>
</head>
<body>
  <h1>Hello {{firstName}}!</h1>
  <p>Your custom content here.</p>
  <footer>
    <p>© {{year}} Ortomat</p>
  </footer>
</body>
</html>
```

---

## 📱 QR Code система

### Як працює

1. Кожен лікар отримує унікальний реферальний код
2. QR код генерується з URL: `https://ortomat.com.ua/buy?ref=XXXX`
3. Коли пацієнт сканує QR:
   - Відкривається сторінка вибору ортомату
   - Реферальний код зберігається
   - Після покупки лікар отримує комісію (10%)

### Генерація QR кодів

```typescript
// backend/src/qr-code/qr-code.service.ts
import * as QRCode from 'qrcode';

async generateQRCode(doctorId: string) {
  const doctorOrtomat = await this.findDoctorOrtomat(doctorId);
  const url = `${process.env.FRONTEND_URL}/buy?ref=${doctorOrtomat.referralCode}`;
  
  const qrCode = await QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
  });
  
  return qrCode; // base64 image
}
```

---

## 🐛 Troubleshooting

### Проблема: Backend не запускається

```bash
# Перевірте .env файл
cat backend/.env

# Перевірте чи доступна БД
npx prisma db push

# Перегляньте логи
npm run start:dev
```

### Проблема: Frontend не може з'єднатись з Backend

1. Перевірте `NEXT_PUBLIC_API_URL` в `.env.local`
2. Переконайтесь що backend запущений
3. Перевірте CORS налаштування в `backend/src/main.ts`

### Проблема: Email не відправляються

1. Перевірте `SENDGRID_API_KEY` в `.env`
2. Перевірте SendGrid logs на їх сайті
3. Перевірте чи domain verified
4. Перегляньте `email_logs` таблицю в БД

### Проблема: JWT токен invalid

```bash
# Перегенеруйте JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Оновіть в .env
JWT_SECRET=new_generated_secret
```

### Проблема: Prisma migration failed

```bash
# Reset database (УВАГА: видалить всі дані!)
npx prisma migrate reset

# Або виправте міграцію вручну
npx prisma migrate dev --create-only
# Відредагуйте SQL файл
npx prisma migrate dev
```

### Проблема: Module not found errors

```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json .next
npm install
```

---

## 📝 Корисні команди

### Backend

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod

# Prisma
npx prisma studio              # Open GUI
npx prisma migrate dev         # Create migration
npx prisma migrate deploy      # Apply migrations
npx prisma generate           # Generate client
npx prisma db seed            # Seed database

# Testing
npm run test
npm run test:e2e
```

### Frontend

```bash
# Development
npm run dev

# Production build
npm run build
npm run start

# Linting
npm run lint
npm run lint:fix

# Type checking
npm run type-check
```

---

## 🔐 Безпека

### Важливо

1. **Ніколи не комітьте `.env` файли**
2. **Змініть всі паролі та секрети в продакшн**
3. **Використовуйте HTTPS для продакшн**
4. **Регулярно оновлюйте залежності**

### Рекомендації

- Використовуйте strong JWT secrets (32+ символів)
- Налаштуйте rate limiting
- Включіть CORS тільки для trusted domains
- Регулярно робіть backup БД
- Моніторьте логи на підозрілу активність

---

## 📊 Моніторинг та логування

### Activity Logs

Всі важливі події зберігаються в таблиці `activity_logs`:

```typescript
enum LogType {
  CELL_OPENED
  CELL_FILLED
  ORDER_CREATED
  PAYMENT_SUCCESS
  LOGIN_SUCCESS
  COURIER_CHECKIN
  // та інші...
}
```

### Email Logs

Всі email зберігаються в `email_logs` з статусами:
- `PENDING` - в черзі
- `SENT` - відправлено
- `FAILED` - помилка
- `BOUNCED` - повернувся

### Перегляд логів

```bash
# Railway logs
railway logs

# Local development
npm run start:dev  # консоль покаже всі логи
```

---

## 🤝 Contributing

### Workflow

1. Створіть нову гілку: `git checkout -b feature/your-feature`
2. Зробіть зміни
3. Commit: `git commit -m "feat: add new feature"`
4. Push: `git push origin feature/your-feature`
5. Створіть Pull Request

### Commit Convention

Використовуємо [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: нова функція
fix: виправлення бага
docs: зміни в документації
style: форматування коду
refactor: рефакторинг
test: додавання тестів
chore: оновлення залежностей
```

---

## 📞 Контакти

- **GitHub:** [ortomat-monorepo](https://github.com/your-username/ortomat-monorepo)
- **Website:** https://ortomat.com.ua
- **Backend API:** https://ortomat-monorepo-production.up.railway.app

---

## 📄 Ліцензія

MIT License - використовуйте код як завгодно!

---

## 🎯 Roadmap

### В розробці
- [ ] Mobile app (React Native)
- [ ] Payment integration (LiqPay)
- [ ] WebSocket real-time updates
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] SMS notifications
- [ ] Inventory management system

### Завершено
- [x] User authentication
- [x] QR code system
- [x] Email notifications
- [x] Admin panel
- [x] Doctor dashboard
- [x] Courier management
- [x] Password recovery
- [x] Ortomat invites system

---

**Останнє оновлення:** Жовтень 2024

**Версія:** 1.0.0

**Автор:** Ortomat Team
