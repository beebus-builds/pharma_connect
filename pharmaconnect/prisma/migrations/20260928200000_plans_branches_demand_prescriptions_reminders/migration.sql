-- SPECS 4B/4C/4D + 5A/5B: plans, multi-branch locations, search demand logs,
-- prescription attachments and refill reminders.
--
-- Ordering matters: Location is created and backfilled from Pharmacy *before*
-- the locationId columns become NOT NULL, so no row is ever orphaned.

-- CreateEnum
CREATE TYPE "PharmacyPlan" AS ENUM ('FREE', 'VERIFIED', 'FEATURED');

-- CreateEnum
CREATE TYPE "SearchOutcome" AS ENUM ('RESOLVED', 'UNRESOLVED');

-- CreateEnum
CREATE TYPE "PrescriptionReview" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DELETED');

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "location" geography(Point, 4326),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchLog" (
    "id" TEXT NOT NULL,
    "query" VARCHAR(120) NOT NULL,
    "medicineId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "outcome" "SearchOutcome" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionAttachment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "review" "PrescriptionReview" NOT NULL DEFAULT 'PENDING',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "daysSupply" INTEGER NOT NULL DEFAULT 30,
    "nextDue" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- Keep the geography column in sync, mirroring the Pharmacy trigger.
CREATE OR REPLACE FUNCTION public.pharmaconnect_sync_location_geography()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW."latitude" BETWEEN -90 AND 90 AND NEW."longitude" BETWEEN -180 AND 180 THEN
    NEW."location" := ST_SetSRID(ST_MakePoint(NEW."longitude", NEW."latitude"), 4326)::geography;
  ELSE
    NEW."location" := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER "Location_sync_geography"
BEFORE INSERT OR UPDATE OF "latitude", "longitude"
ON "Location"
FOR EACH ROW
EXECUTE FUNCTION public.pharmaconnect_sync_location_geography();

-- Backfill: one Location per existing Pharmacy, carrying its pin and address.
INSERT INTO "Location" (
  "id", "pharmacyId", "name", "address", "phone",
  "latitude", "longitude", "isPrimary", "createdAt", "updatedAt"
)
SELECT
  'loc_' || md5(p."id"),
  p."id",
  'Main branch',
  p."address",
  p."phone",
  p."latitude",
  p."longitude",
  true,
  p."createdAt",
  p."createdAt"
FROM "Pharmacy" p
WHERE NOT EXISTS (SELECT 1 FROM "Location" l WHERE l."pharmacyId" = p."id");

UPDATE "Location" SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
WHERE "location" IS NULL
  AND "latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180;

-- Add locationId, backfill from the pharmacy's primary branch, then make it required.
ALTER TABLE "PharmacyStock" ADD COLUMN "locationId" TEXT;
UPDATE "PharmacyStock" s
SET "locationId" = l."id"
FROM "Location" l
WHERE l."pharmacyId" = s."pharmacyId" AND l."isPrimary" = true;
ALTER TABLE "PharmacyStock" ALTER COLUMN "locationId" SET NOT NULL;

ALTER TABLE "Request" ADD COLUMN "locationId" TEXT;
UPDATE "Request" r
SET "locationId" = l."id"
FROM "Location" l
WHERE l."pharmacyId" = r."pharmacyId" AND l."isPrimary" = true;
ALTER TABLE "Request" ALTER COLUMN "locationId" SET NOT NULL;

-- SPECS 4D: replace the drift-prone subscription boolean with a tier + expiry.
ALTER TABLE "Pharmacy" ADD COLUMN "plan" "PharmacyPlan" NOT NULL DEFAULT 'FREE';
ALTER TABLE "Pharmacy" ADD COLUMN "planExpiresAt" TIMESTAMP(3);

-- Anyone who had a live paid subscription at cutover becomes VERIFIED.
UPDATE "Pharmacy"
SET "plan" = 'VERIFIED',
    "planExpiresAt" = "subscriptionExpiresAt"
WHERE "subscriptionActive" = true
  AND "subscriptionExpiresAt" IS NOT NULL
  AND "subscriptionExpiresAt" > now();

ALTER TABLE "Pharmacy" DROP COLUMN "subscriptionActive";
ALTER TABLE "Pharmacy" DROP COLUMN "subscriptionExpiresAt";

-- The old uniqueness was per-pharmacy; stock is now per-branch.
DROP INDEX "PharmacyStock_pharmacyId_medicineId_key";
CREATE UNIQUE INDEX "PharmacyStock_locationId_medicineId_key" ON "PharmacyStock"("locationId", "medicineId");

-- CreateIndex
CREATE UNIQUE INDEX "PrescriptionAttachment_requestId_key" ON "PrescriptionAttachment"("requestId");
CREATE INDEX "PrescriptionAttachment_review_createdAt_idx" ON "PrescriptionAttachment"("review", "createdAt");
CREATE INDEX "Reminder_userId_medicineId_key" ON "Reminder"("userId", "medicineId");
CREATE INDEX "Reminder_active_nextDue_idx" ON "Reminder"("active", "nextDue");
CREATE INDEX "SearchLog_createdAt_idx" ON "SearchLog"("createdAt");
CREATE INDEX "SearchLog_medicineId_createdAt_idx" ON "SearchLog"("medicineId", "createdAt");
CREATE INDEX "SearchLog_outcome_createdAt_idx" ON "SearchLog"("outcome", "createdAt");
CREATE INDEX "SearchLog_latitude_longitude_idx" ON "SearchLog"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Location_pharmacyId_idx" ON "Location"("pharmacyId");
CREATE INDEX "Location_latitude_longitude_idx" ON "Location"("latitude", "longitude");
CREATE INDEX "Location_isPrimary_idx" ON "Location"("isPrimary");
CREATE INDEX "Location_location_gist_idx" ON "Location" USING GIST ("location") WHERE "location" IS NOT NULL;

CREATE INDEX "PharmacyStock_locationId_idx" ON "PharmacyStock"("locationId");
CREATE INDEX "Request_locationId_idx" ON "Request"("locationId");
CREATE INDEX "Pharmacy_plan_planExpiresAt_idx" ON "Pharmacy"("plan", "planExpiresAt");

-- Drop the pharmacy-level "in stock" partial index; the search path now filters
-- on Location coordinates, and the composite below serves the storefront instead.
DROP INDEX "PharmacyStock_in_stock_medicine_idx";
DROP INDEX "PharmacyStock_storefront_order_idx";
CREATE INDEX "PharmacyStock_in_stock_location_medicine_idx"
ON "PharmacyStock" ("locationId", "medicineId")
WHERE "quantity" > 0;
CREATE INDEX "PharmacyStock_location_order_idx"
ON "PharmacyStock" ("locationId", "quantity" DESC, "updatedAt" DESC, "medicineId");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyStock" ADD CONSTRAINT "PharmacyStock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Request" ADD CONSTRAINT "Request_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SearchLog" ADD CONSTRAINT "SearchLog_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PrescriptionAttachment" ADD CONSTRAINT "PrescriptionAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
