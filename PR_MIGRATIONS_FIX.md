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

### 1. Додано Explicit Schema Path

**backend/start.sh:**
```bash
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### 2. Спрощено Start Command

**backend/nixpacks.toml:**
```toml
[start]
cmd = "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main.js"
```

Тепер migrations виконуються **безпосередньо** в start command, що більш надійно.

---

## 🧪 Очікуваний Результат

### Deployment Logs:

```
✓ Build completed
✓ Starting container...
✓ Running: npx prisma migrate deploy --schema=./prisma/schema.prisma
✓ Prisma Migrate applied the following migration(s):
  20251021100819_remove_category
  20251025202757_add_email_functionality
  20251026175230_add_optional_recipient_to_email_logs
  20251027094135_add_ortomat_invites
  20251027173312_add_courier_ortomat_unique_constraint
  20251027174835_add_courier_ortomat_unique_constraint
  20251028084304_fix_payment_models
  20260115124843_add_mono_payment_fields
  20260115151544_add_payment_initiated_log_type
✓ All migrations applied successfully
✓ Starting: node dist/main.js
[Nest] LOG [PrismaService] Prisma connected to database
[Nest] LOG [NestApplication] Nest application successfully started
```

### НЕ має бути:
```
❌ The table `public.ortomats` does not exist
❌ Error: P2021
```

---

## 📦 Зміни

- `backend/start.sh` - додано `--schema=./prisma/schema.prisma`
- `backend/nixpacks.toml` - start command запускає migrations перед node

---

## 🚀 Deployment Plan

1. Merge цей PR
2. Railway auto-deploy (3-5 хв)
3. Перевірити logs - має бути "All migrations applied"
4. Тестувати сайт - всі таблиці мають бути створені

---

**Коміт:** `f735e56` - fix: Додано explicit schema path для Prisma migrations

**ETA після merge:** 3-5 хвилин
