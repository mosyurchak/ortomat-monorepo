/*
  Warnings:

  - A unique constraint covering the columns `[ortomatId]` on the table `courier_ortomats` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `courier_ortomats` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "courier_ortomats" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "courier_ortomats_ortomatId_key" ON "courier_ortomats"("ortomatId");
