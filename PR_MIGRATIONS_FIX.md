# PR: Виправлення Prisma Migrations та Dockerfile на Railway

## 🎯 Проблема

Backend успішно підключається до PostgreSQL, але отримує помилку:
```
The table `public.ortomats` does not exist in the current database.
Error: P2021
```

**Причина:**
1. Prisma migrations не виконувалися під час Railway deployment
2. Railway використовував **Dockerfile** замість nixpacks.toml
3. Dockerfile мав невірний CMD path: `dist/src/main.js` замість `dist/main.js`
4. Dockerfile НЕ запускав migrations перед стартом

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

### 2. Виправлено Dockerfile

**Dockerfile - ключові зміни:**

**Було:**
```dockerfile
CMD ["node", "dist/src/main.js"]  # ❌ Невірний path
```

**Стало:**
```dockerfile
# Copy migrations
COPY backend/prisma/migrations ./prisma/migrations

# Copy entrypoint script
COPY backend/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Start application with migrations
CMD ["sh", "entrypoint.sh"]  # ✅ Запускає migrations + правильний path
```

### 3. Оновлено Nixpacks Config (fallback)

**backend/nixpacks.toml** - якщо Railway перемкнеться на nixpacks:
```toml
[start]
cmd = "sh entrypoint.sh"
```

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

- **`Dockerfile`** - ВИПРАВЛЕНО:
  - CMD змінено з `dist/src/main.js` на `sh entrypoint.sh`
  - Додано копіювання `prisma/migrations`
  - Додано копіювання та chmod для `entrypoint.sh`
  - Тепер migrations виконуються перед стартом застосунку

- **`backend/entrypoint.sh`** - новий wrapper script з повною діагностикою:
  - Перевірки dist/main.js та prisma/schema.prisma
  - Виконання migrations з детальними логами
  - Exit на першій помилці

- **`backend/nixpacks.toml`** - використовує `entrypoint.sh` (fallback якщо Railway перемкнеться на nixpacks)

---

## 🚀 Deployment Plan

1. Merge цей PR
2. Railway auto-deploy через **Dockerfile** (3-5 хв)
3. Переглянути логи - **ТЕПЕР БУДУТЬ ДЕТАЛЬНІ**:
   ```
   🔍 Checking environment...
   ✅ dist/main.js found
   ✅ Schema file found
   📦 Running migrations...
   ✅ Migrations completed successfully
   🚀 Starting application...
   [Nest] LOG Application started
   ```
4. Якщо migrations знову не спрацюють - entrypoint.sh покаже **ТОЧНУ ПРИЧИНУ**
5. Тестувати сайт - всі таблиці мають бути створені ✅

---

## 🎯 Що Виправлено

1. ✅ **Dockerfile CMD path** - було `dist/src/main.js` → тепер `entrypoint.sh`
2. ✅ **Migrations в Dockerfile** - тепер виконуються автоматично
3. ✅ **Детальна діагностика** - entrypoint.sh показує кожен крок
4. ✅ **Копіювання migrations** - Dockerfile тепер копіює всі migrations

---

**Коміти:**
- `f735e56` - fix: Додано explicit schema path для Prisma migrations
- `c5595ac` - fix: Створено детальний entrypoint script з діагностикою
- `554154d` - fix: Виправлено Dockerfile - додано migrations та змінено CMD

**ETA після merge:** 3-5 хвилин

**Найважливіше:** Railway використовує Dockerfile, тому тепер він ТОЧНО запустить migrations! 🚀
