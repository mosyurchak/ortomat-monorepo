-- AlterTable
ALTER TABLE "payments" ADD COLUMN "paymentProvider" TEXT NOT NULL DEFAULT 'liqpay',
ADD COLUMN "invoiceId" TEXT,
ADD COLUMN "pageUrl" TEXT,
ADD COLUMN "monoStatus" TEXT,
ADD COLUMN "monoData" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "payments_invoiceId_key" ON "payments"("invoiceId");
