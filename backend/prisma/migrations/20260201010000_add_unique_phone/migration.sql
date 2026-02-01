-- AlterTable
-- Make phone unique - it's the main identifier for doctors
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
