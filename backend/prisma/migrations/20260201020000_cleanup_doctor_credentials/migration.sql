-- Зробити поле email опціональним (nullable)
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- Очистити паролі та email для всіх лікарів (ставимо NULL)
UPDATE "users"
SET "password" = NULL, "email" = NULL
WHERE "role" = 'DOCTOR';
