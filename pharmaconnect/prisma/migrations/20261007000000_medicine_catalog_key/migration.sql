-- Support idempotent catalog upserts for scripts/seed-catalog.ts.
CREATE UNIQUE INDEX "Medicine_genericName_brandName_strength_key"
ON "Medicine"("genericName", "brandName", "strength");