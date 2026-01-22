# PR: Виправлення Prisma Migrations на Railway

## 🎯 Проблема

Backend успішно підключається до PostgreSQL, але отримує помилку:
```
The table `public.ortomats` does not exist in the current database.
Error: P2021
```

**Причина:** Prisma migrations не виконувалися під час Railway deployment.

---

## ✅ Виправлення

### 1. Створено Детальний Entrypoint Script

**backend/entrypoint.sh** - новий wrapper script з діагностикою:
- Перевіряє наявність `dist/main.js`
- Перевіряє наявність `prisma/schema.prisma`
- Показує DATABASE_URL (перші 30 символів)
- Виконує `npx prisma migrate deploy`
- Виводить детальні логи кожного кроку
- Перевіряє exit code migrations

### 2. Оновлено Nixpacks Config

**backend/nixpacks.toml:**
```toml
[phases.build]
cmds = [
  "npx prisma generate",
  "npm run build",
  "chmod +x entrypoint.sh",
  "ls -la dist/",
  "ls -la prisma/"  # Показує що migrations є
]

[start]
cmd = "sh entrypoint.sh"
```

Тепер entrypoint виконується з детальною діагностикою кожного кроку.

---

## 🧪 Очікуваний Результат

### Deployment Logs (з entrypoint.sh):

```
✓ Build completed
✓ Starting container...

🔍 Checking environment...
NODE_ENV: production
DATABASE_URL: postgresql://postgres:***...

🔍 Checking if dist/main.js exists...
✅ dist/main.js found

🗄️ Running Prisma migrations...
Current directory: /app/backend
Prisma schema path: ./prisma/schema.prisma
✅ Schema file found

📦 Running migrations...
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database

The following migration(s) have been applied:

migrations/
  └─ 20251021100819_remove_category
  └─ 20251025202757_add_email_functionality
  └─ 20251026175230_add_optional_recipient_to_email_logs
  └─ 20251027094135_add_ortomat_invites
  └─ 20251027173312_add_courier_ortomat_unique_constraint
  └─ 20251027174835_add_courier_ortomat_unique_constraint
  └─ 20251028084304_fix_payment_models
  └─ 20260115124843_add_mono_payment_fields
  └─ 20260115151544_add_payment_initiated_log_type

✅ Migrations completed successfully

🚀 Starting application...
[Nest] LOG [PrismaService] Prisma connected to database
[Nest] LOG [NestApplication] Nest application successfully started
[Nest] LOG Application is running on: http://[::]:3001
```

### Якщо щось не так, побачите:
```
❌ ERROR: dist/main.js not found!
❌ Schema file NOT found!
❌ Migrations failed with exit code 1
```

### НЕ має бути:
```
❌ The table `public.ortomats` does not exist
❌ Error: P2021
```

---

## 📦 Зміни

- `backend/entrypoint.sh` - новий wrapper script з повною діагностикою
- `backend/nixpacks.toml` - використовує `entrypoint.sh` замість прямого node
- Додано перевірки файлів перед стартом
- Додано детальні логи для debugging

---

## 🚀 Deployment Plan

1. Merge цей PR
2. Railway auto-deploy (3-5 хв)
3. Переглянути логи - тепер вони будуть ДЕТАЛЬНІ:
   - ✅ dist/main.js перевірено
   - ✅ prisma/schema.prisma перевірено
   - ✅ Migrations виконано
   - ✅ Application запущено
4. Якщо migrations знову не спрацюють - логи покажуть ЧОМУ
5. Тестувати сайт - всі таблиці мають бути створені

---

**Коміти:**
- `f735e56` - fix: Додано explicit schema path для Prisma migrations
- `c5595ac` - fix: Створено детальний entrypoint script з діагностикою

**ETA після merge:** 3-5 хвилин

**Якщо migrations знову не спрацюють** - entrypoint.sh покаже точну причину в логах!
