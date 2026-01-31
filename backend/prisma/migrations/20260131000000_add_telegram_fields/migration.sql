-- AlterTable
ALTER TABLE "users" ADD COLUMN "telegramChatId" TEXT,
ADD COLUMN "telegramUsername" TEXT,
ADD COLUMN "telegramNotifications" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramChatId_key" ON "users"("telegramChatId");
