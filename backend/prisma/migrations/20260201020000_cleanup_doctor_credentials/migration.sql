-- Очищаємо паролі для всіх лікарів (ставимо NULL)
UPDATE "users"
SET "password" = NULL
WHERE "role" = 'DOCTOR';

-- Оновлюємо email для всіх лікарів до автогенерованого формату
-- Витягуємо тільки цифри з телефону і генеруємо email
UPDATE "users"
SET "email" = 'doctor_' || regexp_replace("phone", '\D', '', 'g') || '@ortomat.local'
WHERE "role" = 'DOCTOR';
