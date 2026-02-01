-- AlterTable
-- Make password optional for users (doctors don't need password, only Telegram)
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;
