# 🗄️ Налаштування PostgreSQL на Railway

**Проблема**: `Can't reach database server at postgres.railway.internal:5432`

**Помилка Prisma**: `P1001` - Cannot reach database server

---

## 🔍 Діагностика

### Крок 1: Перевірте чи є PostgreSQL Service

1. Відкрийте https://railway.app
2. Виберіть ваш **Project**
3. Подивіться на список **Services** (ліворуч або в Dashboard)

**Має бути 2 services:**
- ✅ `backend` (ваш NestJS застосунок)
- ✅ `postgres` (база даних)

**Якщо PostgreSQL немає** → переходьте до **Рішення 1**

---

## ✅ Рішення 1: Додати PostgreSQL Service (якщо немає)

### 1.1. Створити PostgreSQL

1. Railway Dashboard → **"New"** → **"Database"** → **"PostgreSQL"**
2. Або кнопка **"+ New Service"** → **"Database"** → **"PostgreSQL"**
3. Railway автоматично створить PostgreSQL instance

### 1.2. Отримати DATABASE_URL

Після створення PostgreSQL:

1. Клікніть на **PostgreSQL service**
2. Tab **"Variables"**
3. Знайдіть змінну **DATABASE_URL**
4. **Скопіюйте значення** (буде виглядати так):
   ```
   postgresql://postgres:password@postgres.railway.internal:5432/railway
   ```

---

## ✅ Рішення 2: Налаштувати DATABASE_URL в Backend

### 2.1. Додати Variable

1. Виберіть ваш **backend service**
2. Tab **"Variables"**
3. Натисніть **"+ New Variable"**
4. **Якщо PostgreSQL вже існує:**
   - Клікніть **"Add Reference"**
   - Виберіть **PostgreSQL service**
   - Виберіть змінну **DATABASE_URL**
   - Railway автоматично створить reference: `${{Postgres.DATABASE_URL}}`

5. **Або додайте вручну:**
   - Variable name: `DATABASE_URL`
   - Variable value: `postgresql://postgres:password@postgres.railway.internal:5432/railway`
   - ⚠️ Замініть значення на правильне з PostgreSQL service!

### 2.2. Перевірка

У **backend Variables** має бути:

```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

або

```
DATABASE_URL = postgresql://postgres:password@postgres.railway.internal:5432/railway
```

---

## ✅ Рішення 3: Використати Public URL (якщо private network не працює)

Якщо `postgres.railway.internal` не працює, використайте **public URL**:

### 3.1. Увімкнути Public Networking

1. PostgreSQL service → Tab **"Settings"**
2. Секція **"Networking"**
3. Увімкніть **"Public Networking"** (toggle on)
4. Railway покаже **TCP Proxy URL**: `roundhouse.proxy.rlwy.net:12345`

### 3.2. Оновити DATABASE_URL

Замініть internal URL на public:

**Було:**
```
postgresql://postgres:password@postgres.railway.internal:5432/railway
```

**Стане:**
```
postgresql://postgres:password@roundhouse.proxy.rlwy.net:12345/railway
```

⚠️ **Важливо:** Замініть `12345` на ваш реальний порт!

---

## ✅ Рішення 4: Перевірити Connection Credentials

### 4.1. PostgreSQL Variables

У **PostgreSQL service → Variables** мають бути:

```
PGDATABASE = railway
PGHOST = postgres.railway.internal  (або roundhouse.proxy.rlwy.net)
PGPASSWORD = [generated password]
PGPORT = 5432  (або TCP proxy port)
PGUSER = postgres
DATABASE_URL = postgresql://postgres:[password]@[host]:[port]/railway
```

### 4.2. Скопіювати Правильний DATABASE_URL

1. PostgreSQL service → Variables → **DATABASE_URL**
2. Клікніть **"Copy"** (іконка копіювання)
3. Backend service → Variables → Оновіть **DATABASE_URL**
4. Paste скопійоване значення

---

## 🔄 Після Змін

### Крок 1: Redeploy

Railway автоматично зробить redeploy після зміни variables.

Якщо ні:
1. Backend service → **Deployments**
2. **"Redeploy Latest"**

### Крок 2: Перевірити Logs

У **Deployment Logs** має бути:

```
✓ Connected to PostgreSQL successfully
✓ Prisma migrations applied
✓ Application listening on port 3001
```

**Не має бути:**
```
❌ Can't reach database server
❌ P1001 error
```

---

## 🧪 Тест З'єднання

### Метод 1: Railway CLI

```bash
# Встановіть Railway CLI (якщо немає)
npm i -g @railway/cli

# Login
railway login

# Підключіться до PostgreSQL
railway connect postgres
```

Якщо підключення вдале - ви побачите `psql` prompt:
```
railway=#
```

### Метод 2: psql (локально)

```bash
# Використайте DATABASE_URL з Railway
psql "postgresql://postgres:password@roundhouse.proxy.rlwy.net:12345/railway"
```

---

## 📊 Структура Prisma Schema

Переконайтеся що `schema.prisma` має правильний datasource:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**НЕ має бути:**
```prisma
url = "file:./dev.db"           ❌ SQLite
url = "postgresql://localhost"  ❌ Hardcoded
```

---

## 🚨 Поширені Помилки

### Помилка 1: `postgres.railway.internal` не знайдено

**Причина**: Private networking вимкнено або недоступно

**Рішення**: Використайте public URL (Рішення 3)

### Помилка 2: `Authentication failed`

**Причина**: Неправильний пароль у DATABASE_URL

**Рішення**: Скопіюйте DATABASE_URL безпосередньо з PostgreSQL service

### Помилка 3: `Connection refused`

**Причина**: PostgreSQL service не запущений

**Рішення**:
1. PostgreSQL service → Deployments
2. Переконайтеся що status = **Active**
3. Якщо ні - **Restart Service**

### Помилка 4: `FATAL: database "railway" does not exist`

**Причина**: База даних ще не створена

**Рішення**:
```bash
railway connect postgres
CREATE DATABASE railway;
\q
```

---

## ✅ Чеклист Перевірки

- [ ] PostgreSQL service існує в Railway project
- [ ] PostgreSQL service має status "Active"
- [ ] Backend Variables містить DATABASE_URL
- [ ] DATABASE_URL має правильний формат
- [ ] DATABASE_URL посилається на правильний host (internal або public)
- [ ] DATABASE_URL містить правильний пароль
- [ ] Private networking увімкнено (або використовується public URL)
- [ ] Backend redeploy виконано після змін
- [ ] Deployment logs показують успішне підключення до БД

---

## 📞 Наступні Кроки

1. ⏳ Перевірте чи є PostgreSQL service
2. ⏳ Додайте/оновіть DATABASE_URL в backend variables
3. ⏳ Дочекайтеся redeploy (2-3 хвилини)
4. ⏳ Перевірте logs - має бути "Connected to PostgreSQL"
5. ✅ Якщо все OK - тестуйте застосунок!

---

**💡 Порада**: Використовуйте **Reference Variables** (`${{Postgres.DATABASE_URL}}`) замість копіювання URL вручну - так Railway автоматично оновить URL якщо PostgreSQL змінить credentials.
