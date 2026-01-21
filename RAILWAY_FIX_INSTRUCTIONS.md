# 🚂 Інструкція: Виправлення помилки 404 на Railway

## Проблема
```
Cannot POST /api/orders/:id/create-mono-payment
```

Endpoint **є в коді** і **змержений в main**, але Railway повертає 404.

---

## ✅ Покрокове рішення

### Крок 1: Перевірте що Railway задеплоїв останній код

1. Зайдіть на **https://railway.app**
2. Виберіть проект **ortomat-backend**
3. Розділ **"Deployments"**
4. Знайдіть останній deployment

**Перевірте:**
- ✅ Статус: **Success** (зелена галочка)
- ✅ Git Commit: має бути `992ca5a` або новіший
- ✅ Час: останні 10-30 хвилин

**Якщо commit старий:**
- Натисніть **"Deploy"** → **"Redeploy"**

---

### Крок 2: Запустіть Prisma міграції

Railway потребує застосування нових міграцій БД.

**Спосіб А - Через Railway Web Terminal:**

1. Railway Dashboard → Ваш backend service
2. Знайдіть tab **"Variables"** або **"Settings"**
3. Відкрийте **"Terminal"** (якщо є)
4. Виконайте:
```bash
npx prisma migrate deploy
```

**Спосіб Б - Через Railway CLI (якщо встановлений):**

```bash
railway login
railway link
railway run npx prisma migrate deploy
```

**Спосіб В - Додати в Start Command:**

1. Railway → Settings → **Deploy**
2. **Start Command** змініть на:
```bash
npx prisma migrate deploy && npm run start:prod
```

---

### Крок 3: Перевірте Environment Variables

Railway потребує цих змінних:

**Обов'язкові:**
```
DATABASE_URL=postgresql://... (автоматично від Railway PostgreSQL)
JWT_SECRET=your_secret_key
FRONTEND_URL=https://ortomat.com.ua
MONO_TOKEN=your_monobank_token_here
PORT=3001
```

**Як додати:**
1. Railway → Ваш service → **"Variables"**
2. Додайте **MONO_TOKEN** (якщо немає)
3. Натисніть **"Save"**
4. Railway автоматично redeploy

---

### Крок 4: Перевірте Build налаштування

**Railway → Settings → Deploy:**

**Build Command:**
```bash
npm install && npx prisma generate && npm run build
```

**Start Command:**
```bash
npx prisma migrate deploy && npm run start:prod
```

Або окремо:
```bash
npm run start:prod
```

---

### Крок 5: Перезапустіть сервіс

Якщо все інше не допомогло:

1. Railway → Service → **Settings**
2. Прокрутіть вниз
3. Натисніть **"Restart Service"**

Або просто:
- **Deploy** → **"Redeploy"**

---

### Крок 6: Перевірте логи

**Щоб знайти справжню причину:**

1. Railway → **Deployments** → Клікніть на останній
2. Розділ **"Logs"**
3. Шукайте помилки:

**Типові помилки:**

❌ **"Cannot find module '@prisma/client'"**
→ Додайте `npx prisma generate` в Build Command

❌ **"MONO_TOKEN is not defined"**
→ Додайте MONO_TOKEN в Variables

❌ **"Migration failed"**
→ Запустіть `npx prisma migrate deploy`

❌ **"Port 3001 already in use"**
→ Restart service

---

### Крок 7: Тест endpoint після виправлення

**Через браузер:**
Відкрийте:
```
https://ortomat-monorepo-production.up.railway.app/api/ortomats
```

Має повернути список ортоматів (200 OK)

**Через cURL:**
```bash
curl -X POST \
  https://ortomat-monorepo-production.up.railway.app/api/orders/test-123/create-mono-payment \
  -H "Content-Type: application/json"
```

**Очікувані відповіді:**
- ✅ 200 OK + JSON → endpoint працює
- ❌ 404 Not Found → endpoint не знайдено
- ❌ 500 Server Error → є помилка в коді/налаштуваннях

---

## 📊 Чеклист діагностики

- [ ] Railway deployment статус = Success
- [ ] Git commit = 992ca5a або новіший
- [ ] Prisma міграції застосовані
- [ ] MONO_TOKEN присутній в Variables
- [ ] Build Command містить `prisma generate`
- [ ] Логи не показують помилок
- [ ] Frontend також оновився (Vercel)
- [ ] Кеш браузера очищено (Ctrl+Shift+R)

---

## 🐛 Альтернативна діагностика

### Перевірка через Railway Console:

```bash
# Перевірити чи файл існує
ls backend/src/orders/orders.controller.ts

# Перевірити чи endpoint в коді
grep "create-mono-payment" backend/src/orders/orders.controller.ts

# Перевірити Node.js процес
ps aux | grep node

# Перевірити на якому порту слухає
netstat -tulpn | grep :3001
```

---

## 🔄 Якщо нічого не допомагає - Повний Redeploy

1. Railway → Settings → **"Remove Service"** (НЕ робіть це зараз!)
2. Або просто:
   - **Settings** → **Deploy** → **"Clear Build Cache"**
   - Потім **"Redeploy"**

---

## ✅ Після успішного виправлення

Перевірте:
1. Зайдіть на https://ortomat.com.ua
2. Виберіть товар → натисніть "Купити"
3. Перейдіть до оплати
4. Має працювати без помилки!

---

## 📞 Що робити якщо все ще не працює

1. **Скопіюйте повні логи з Railway**
2. **Зробіть скріншот Variables**
3. **Покажіть мені** - я допоможу!

Найімовірніше проблема в одному з:
- ❌ MONO_TOKEN не налаштований
- ❌ Prisma міграції не застосовані
- ❌ Railway кешував старий build
- ❌ Environment variables не збережені

---

**Успіхів! 🚀**
