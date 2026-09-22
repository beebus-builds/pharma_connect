-- AlterTable: production inventory fields on PharmacyStock
ALTER TABLE "PharmacyStock" ADD COLUMN "expiryDate" TIMESTAMP(3),
ADD COLUMN "mrp" INTEGER,
ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "lowStockAlertSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PharmacyStock_expiryDate_idx" ON "PharmacyStock"("expiryDate");

-- CreateTable: audit trail of every stock change
CREATE TABLE "StockHistory" (
    "id" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "oldQuantity" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "note" VARCHAR(200),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockHistory_pharmacyId_createdAt_idx" ON "StockHistory"("pharmacyId", "createdAt");
CREATE INDEX "StockHistory_medicineId_idx" ON "StockHistory"("medicineId");

-- AddForeignKey
ALTER TABLE "StockHistory" ADD CONSTRAINT "StockHistory_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockHistory" ADD CONSTRAINT "StockHistory_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
