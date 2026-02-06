-- ✅ SECURITY: Add refresh token fields for JWT authentication
-- AlterTable
ALTER TABLE "users" ADD COLUMN "refreshToken" TEXT,
ADD COLUMN "refreshTokenExpiry" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_refreshToken_key" ON "users"("refreshToken");
