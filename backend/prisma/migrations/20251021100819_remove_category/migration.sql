-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DOCTOR', 'COURIER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'PAYMENT_PENDING', 'PAYMENT_PROCESSING', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'CELL_OPENING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('CELL_OPENED', 'CELL_FILLED', 'CELL_CLEARED', 'CELL_PRODUCT_ASSIGNED', 'CELL_ERROR', 'ORDER_CREATED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'ORDER_COMPLETED', 'ORDER_CANCELLED', 'COURIER_CHECKIN', 'COURIER_REFILL', 'DEVICE_ONLINE', 'DEVICE_OFFLINE', 'API_ERROR', 'WEBSOCKET_COMMAND', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'UNAUTHORIZED_ACCESS');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "phone" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ortomats" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "totalCells" INTEGER NOT NULL DEFAULT 37,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ortomats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cells" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "ortomatId" TEXT NOT NULL,
    "productId" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "lastRefillDate" TIMESTAMP(3),
    "courierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "size" TEXT NOT NULL DEFAULT 'Uni',
    "price" DOUBLE PRECISION NOT NULL,
    "mainImage" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT,
    "color" TEXT,
    "material" TEXT,
    "manufacturer" TEXT,
    "videoUrl" TEXT,
    "termsAndConditions" TEXT,
    "attributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_ortomats" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "ortomatId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "qrCode" TEXT,
    "commissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_ortomats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_ortomats" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "ortomatId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_ortomats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT,
    "productId" TEXT NOT NULL,
    "ortomatId" TEXT NOT NULL,
    "cellNumber" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "commission" DOUBLE PRECISION,
    "referralCode" TEXT,
    "paymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderNumber" TEXT,
    "customerPhone" TEXT,
    "completedAt" TIMESTAMP(3),
    "doctorOrtomatId" TEXT,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cells_ortomatId_number_key" ON "cells"("ortomatId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_ortomats_referralCode_key" ON "doctor_ortomats"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_ortomats_doctorId_ortomatId_key" ON "doctor_ortomats"("doctorId", "ortomatId");

-- CreateIndex
CREATE UNIQUE INDEX "courier_ortomats_courierId_ortomatId_key" ON "courier_ortomats"("courierId", "ortomatId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orderNumber_key" ON "sales"("orderNumber");

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
ALTER TABLE "cells" ADD CONSTRAINT "cells_ortomatId_fkey" FOREIGN KEY ("ortomatId") REFERENCES "ortomats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cells" ADD CONSTRAINT "cells_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_ortomats" ADD CONSTRAINT "doctor_ortomats_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_ortomats" ADD CONSTRAINT "doctor_ortomats_ortomatId_fkey" FOREIGN KEY ("ortomatId") REFERENCES "ortomats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_ortomats" ADD CONSTRAINT "courier_ortomats_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_ortomats" ADD CONSTRAINT "courier_ortomats_ortomatId_fkey" FOREIGN KEY ("ortomatId") REFERENCES "ortomats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_ortomatId_fkey" FOREIGN KEY ("ortomatId") REFERENCES "ortomats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_doctorOrtomatId_fkey" FOREIGN KEY ("doctorOrtomatId") REFERENCES "doctor_ortomats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_ortomatId_fkey" FOREIGN KEY ("ortomatId") REFERENCES "ortomats"("id") ON DELETE SET NULL ON UPDATE CASCADE;
