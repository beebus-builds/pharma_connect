CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "Pharmacy" ADD COLUMN "location" geography(Point, 4326);

CREATE OR REPLACE FUNCTION public.pharmaconnect_sync_pharmacy_location()
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

CREATE TRIGGER "Pharmacy_sync_location"
BEFORE INSERT OR UPDATE OF "latitude", "longitude"
ON "Pharmacy"
FOR EACH ROW
EXECUTE FUNCTION public.pharmaconnect_sync_pharmacy_location();

UPDATE "Pharmacy"
SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
WHERE "latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180;

CREATE INDEX "Pharmacy_location_gist_idx"
ON "Pharmacy" USING GIST ("location")
WHERE "location" IS NOT NULL;

CREATE INDEX "Medicine_genericName_trgm_idx"
ON "Medicine" USING GIN ("genericName" gin_trgm_ops);

CREATE INDEX "Medicine_brandName_trgm_idx"
ON "Medicine" USING GIN ("brandName" gin_trgm_ops);

CREATE INDEX "PharmacyStock_in_stock_medicine_idx"
ON "PharmacyStock" ("medicineId", "pharmacyId")
WHERE "quantity" > 0;

CREATE INDEX "PharmacyStock_storefront_order_idx"
ON "PharmacyStock" ("pharmacyId", "quantity" DESC, "updatedAt" DESC, "medicineId");
