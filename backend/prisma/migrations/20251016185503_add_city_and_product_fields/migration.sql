-- AlterTable
ALTER TABLE "ortomats" ADD COLUMN     "city" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "color" TEXT,
ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "material" TEXT,
ADD COLUMN     "termsAndConditions" TEXT;
