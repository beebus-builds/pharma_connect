-- CreateEnum
CREATE TYPE "PharmacyImageKind" AS ENUM ('PROFILE', 'COVER');

-- CreateTable
CREATE TABLE "PharmacyImage" (
    "id" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "kind" "PharmacyImageKind" NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyImage_pharmacyId_kind_key" ON "PharmacyImage"("pharmacyId", "kind");
CREATE INDEX "PharmacyImage_pharmacyId_idx" ON "PharmacyImage"("pharmacyId");

-- AddForeignKey
ALTER TABLE "PharmacyImage" ADD CONSTRAINT "PharmacyImage_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
