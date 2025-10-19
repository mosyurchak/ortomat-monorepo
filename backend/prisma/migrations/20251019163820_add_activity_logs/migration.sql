-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('CELL_OPENED', 'CELL_FILLED', 'CELL_CLEARED', 'CELL_PRODUCT_ASSIGNED', 'CELL_ERROR', 'ORDER_CREATED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'ORDER_COMPLETED', 'ORDER_CANCELLED', 'COURIER_CHECKIN', 'COURIER_REFILL', 'DEVICE_ONLINE', 'DEVICE_OFFLINE', 'API_ERROR', 'WEBSOCKET_COMMAND', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'UNAUTHORIZED_ACCESS');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "type" "LogType" NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "userId" TEXT,
    "ortomatId" TEXT,
    "cellNumber" INTEGER,
    "severity" "Severity" NOT NULL DEFAULT 'INFO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_type_idx" ON "activity_logs"("type");

-- CreateIndex
CREATE INDEX "activity_logs_category_idx" ON "activity_logs"("category");

-- CreateIndex
CREATE INDEX "activity_logs_severity_idx" ON "activity_logs"("severity");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_ortomatId_idx" ON "activity_logs"("ortomatId");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_ortomatId_fkey" FOREIGN KEY ("ortomatId") REFERENCES "ortomats"("id") ON DELETE SET NULL ON UPDATE CASCADE;
