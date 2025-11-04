-- Міграція: Додавання нових полів до Product + Settings модель
-- Дата: 2025-11-04
-- Опис: Додаємо країну, тип, таблицю розмірів та глобальні умови покупки

-- 1. Додаємо нові поля до Product
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sizeChartUrl" TEXT;

-- 2. Створюємо таблицю Settings для глобальних налаштувань
CREATE TABLE IF NOT EXISTS "settings" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
  "purchaseTerms" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Вставляємо дефолтний запис
INSERT INTO "settings" ("id", "purchaseTerms") 
VALUES ('default', 'Загальні умови покупки будуть тут. Адміністратор може їх редагувати.')
ON CONFLICT ("id") DO NOTHING;

-- 4. Коментарі для документації
COMMENT ON COLUMN "products"."country" IS 'Країна виробника';
COMMENT ON COLUMN "products"."type" IS 'Тип товару (наприклад: ортопедичні устілки, бандажі і т.д.)';
COMMENT ON COLUMN "products"."sizeChartUrl" IS 'URL картинки з таблицею розмірів';
COMMENT ON TABLE "settings" IS 'Глобальні налаштування системи';
COMMENT ON COLUMN "settings"."purchaseTerms" IS 'Загальні умови покупки (показуються на всіх карточках товарів)';
