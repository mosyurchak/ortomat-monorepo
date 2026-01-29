-- ✅ REFERRAL SYSTEM: Перехід з відсотків на систему балів

-- 1. Додати поле referralPoints до products
ALTER TABLE "products" ADD COLUMN "referralPoints" INTEGER NOT NULL DEFAULT 0;

-- 2. Оновити doctor_ortomats: замінити commissionPercent та totalEarnings на totalPoints
ALTER TABLE "doctor_ortomats" ADD COLUMN "totalPoints" INTEGER NOT NULL DEFAULT 0;
-- Видалити старі поля (commissionPercent, totalEarnings)
ALTER TABLE "doctor_ortomats" DROP COLUMN IF EXISTS "commissionPercent";
ALTER TABLE "doctor_ortomats" DROP COLUMN IF EXISTS "totalEarnings";

-- 3. Оновити sales: замінити commission на pointsEarned
ALTER TABLE "sales" ADD COLUMN "pointsEarned" INTEGER;
ALTER TABLE "sales" DROP COLUMN IF EXISTS "commission";

-- 4. Перейменувати таблицю commissions на points_transactions
ALTER TABLE "commissions" RENAME TO "points_transactions";
-- Перейменувати поле amount на points
ALTER TABLE "points_transactions" ADD COLUMN "points" INTEGER NOT NULL DEFAULT 0;
-- Скопіювати дані з amount в points (якщо є дані)
UPDATE "points_transactions" SET "points" = CAST("amount" AS INTEGER) WHERE "amount" IS NOT NULL;
-- Видалити старе поле amount
ALTER TABLE "points_transactions" DROP COLUMN IF EXISTS "amount";

-- 5. Оновити індекси та зв'язки (якщо потрібно)
-- Prisma автоматично оновить foreign keys при наступному generate
