import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nearbyQuerySchema } from "@/lib/validations";
import { haversineDistanceKm, stockStatus } from "@/lib/utils";
import { boundingBoxForRadius, isValidLatLng } from "@/lib/geo";
import { effectiveThreshold } from "@/lib/inventory";
import { rateLimit } from "@/lib/rateLimit";
import { decodeCursor, encodeCursor } from "@/lib/pagination";
import { effectivePlan, type Plan } from "@/lib/plans";
import { recordSearch } from "@/lib/demand";
import type { NearbyPharmacyDTO, PaginationDTO, Plan as PlanDTO } from "@/types";

/**
 * Results are branches, not chains: stock lives on a Location, distance is
 * measured from the branch pin, and each branch is its own card and map pin.
 *
 * Ordering is plan rank first, then distance. That makes paid "top placement"
 * real, and the DTO carries `sponsored` so the UI can label it rather than
 * quietly passing a listing off as organic.
 */

type Cursor = {
  kind: "nearby";
  fingerprint: string;
  planRank: number;
  distanceKm: number;
  locationId: string;
  stockId: string;
};

type InternalRow = NearbyPharmacyDTO & {
  planRank: number;
  stockId: string;
};

let postgisUnavailable = false;

type PostgisRow = {
  stockId: string;
  quantity: number;
  expiryDate: Date | null;
  mrp: number | null;
  lowStockThreshold: number;
  updatedAt: Date;
  locationId: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string | null;
  branchLat: number;
  branchLng: number;
  pharmacyId: string;
  name: string;
  phone: string;
  verified: boolean;
  plan: string;
  planExpiresAt: Date | null;
  planRank: number | string | null;
  medicineId: string;
  genericName: string;
  brandName: string;
  strength: string;
  manufacturer: string;
  medicineImageUrl: string | null;
  distanceKm: number;
  profileImageUrl: string | null;
  coverImageUrl: string | null;
};

const PLAN_RANKS: Record<Plan, number> = { FREE: 0, VERIFIED: 1, FEATURED: 2 };

function planRank(plan: string, planExpiresAt: Date | null, now: Date): number {
  const effective = effectivePlan(plan as Plan, planExpiresAt, now);
  return PLAN_RANKS[effective] ?? 0;
}

function makeFingerprint(lat: number, lng: number, medicineId: string | undefined, radiusKm: number) {
  return createHash("sha256")
    .update(JSON.stringify({ lat, lng, medicineId: medicineId ?? null, radiusKm }))
    .digest("hex")
    .slice(0, 24);
}

function parseCursor(raw: string | undefined, fingerprint: string): Cursor | null | undefined {
  if (!raw) return null;
  const payload = decodeCursor(raw);
  if (
    !payload ||
    payload.kind !== "nearby" ||
    payload.fingerprint !== fingerprint ||
    typeof payload.planRank !== "number" ||
    !Number.isFinite(payload.planRank) ||
    typeof payload.distanceKm !== "number" ||
    !Number.isFinite(payload.distanceKm) ||
    typeof payload.locationId !== "string" ||
    typeof payload.stockId !== "string"
  ) {
    return undefined;
  }
  return {
    kind: "nearby",
    fingerprint,
    planRank: payload.planRank,
    distanceKm: payload.distanceKm,
    locationId: payload.locationId,
    stockId: payload.stockId,
  };
}

function roundDistance(distanceKm: number) {
  return Math.round(distanceKm * 100) / 100;
}

/** Sort key: paid placement first, then distance, then stable id tiebreakers. */
function compare(a: InternalRow, b: InternalRow) {
  if (a.planRank !== b.planRank) return b.planRank - a.planRank;
  if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
  const byLocation = a.id.localeCompare(b.id);
  return byLocation !== 0 ? byLocation : a.stockId.localeCompare(b.stockId);
}

function isAfterCursor(row: InternalRow, cursor: Cursor | null) {
  if (!cursor) return true;
  if (row.planRank !== cursor.planRank) return row.planRank < cursor.planRank;
  if (row.distanceKm !== cursor.distanceKm) return row.distanceKm > cursor.distanceKm;
  if (row.id !== cursor.locationId) return row.id > cursor.locationId;
  return row.stockId > cursor.stockId;
}

function imageUrl(
  images: Array<{ kind: string; url: string }>,
  kind: "PROFILE" | "COVER"
): string | null {
  return images.find((image) => image.kind === kind)?.url ?? null;
}

async function queryPostgis(
  lat: number,
  lng: number,
  radiusKm: number,
  medicineId: string | undefined,
  limit: number,
  cursor: Cursor | null
): Promise<InternalRow[]> {
  const now = new Date();
  const cursorRank = cursor?.planRank ?? null;
  const cursorDistance = cursor?.distanceKm ?? null;
  const cursorLocationId = cursor?.locationId ?? null;
  const cursorStockId = cursor?.stockId ?? null;

  const rows = await prisma.$queryRaw<PostgisRow[]>(Prisma.sql`
    WITH matched AS (
      SELECT
        s."id" AS "stockId",
        s."quantity" AS "quantity",
        s."expiryDate" AS "expiryDate",
        s."mrp" AS "mrp",
        s."lowStockThreshold" AS "lowStockThreshold",
        s."updatedAt" AS "updatedAt",
        l."id" AS "locationId",
        l."name" AS "branchName",
        l."address" AS "branchAddress",
        l."phone" AS "branchPhone",
        l."latitude" AS "branchLat",
        l."longitude" AS "branchLng",
        p."id" AS "pharmacyId",
        p."name" AS "name",
        p."phone" AS "phone",
        p."verified" AS "verified",
        p."plan" AS "plan",
        p."planExpiresAt" AS "planExpiresAt",
        m."id" AS "medicineId",
        m."genericName" AS "genericName",
        m."brandName" AS "brandName",
        m."strength" AS "strength",
        m."manufacturer" AS "manufacturer",
        m."imageUrl" AS "medicineImageUrl",
        ST_Distance(
          l."location",
          ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)::geography
        ) / 1000.0 AS "distanceKm",
        (
          SELECT pi."url"
          FROM "PharmacyImage" pi
          WHERE pi."pharmacyId" = p."id" AND pi."kind" = 'PROFILE'::"PharmacyImageKind"
          LIMIT 1
        ) AS "profileImageUrl",
        (
          SELECT pi."url"
          FROM "PharmacyImage" pi
          WHERE pi."pharmacyId" = p."id" AND pi."kind" = 'COVER'::"PharmacyImageKind"
          LIMIT 1
        ) AS "coverImageUrl"
      FROM "PharmacyStock" s
      JOIN "Location" l ON l."id" = s."locationId"
      JOIN "Pharmacy" p ON p."id" = l."pharmacyId"
      JOIN "Medicine" m ON m."id" = s."medicineId"
      WHERE l."location" IS NOT NULL
        AND s."quantity" > 0
        AND (s."expiryDate" IS NULL OR s."expiryDate" > NOW())
        AND ST_DWithin(
          l."location",
          ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)::geography,
          ${radiusKm * 1000}::double precision
        )
        AND (${medicineId ?? null}::text IS NULL OR s."medicineId" = ${medicineId ?? null}::text)
    ), ranked AS (
      SELECT
        matched.*,
        CASE "plan"
          WHEN 'FEATURED'::"PharmacyPlan"
            THEN (CASE WHEN "planExpiresAt" > NOW() THEN 2 ELSE 0 END)
          WHEN 'VERIFIED'::"PharmacyPlan"
            THEN (CASE WHEN "planExpiresAt" > NOW() THEN 1 ELSE 0 END)
          ELSE 0
        END AS "planRank"
      FROM matched
    )
    SELECT *
    FROM ranked
    WHERE (
      ${cursorRank ?? null}::double precision IS NULL
      OR "planRank" < ${cursorRank ?? null}::double precision
      OR (
        "planRank" = ${cursorRank ?? null}::double precision
        AND (
          "distanceKm" > ${cursorDistance ?? null}::double precision
          OR (
            "distanceKm" = ${cursorDistance ?? null}::double precision
            AND ("locationId", "stockId") > (${cursorLocationId ?? null}::text, ${cursorStockId ?? null}::text)
          )
        )
      )
    )
    ORDER BY "planRank" DESC, "distanceKm" ASC, "locationId" ASC, "stockId" ASC
    LIMIT ${limit + 1}
  `);

  void now;
  return rows.map((row) => {
    const rank = Number(row.planRank ?? 0);
    const distanceKm = Number(row.distanceKm);
    return {
      id: row.locationId,
      pharmacyId: row.pharmacyId,
      name: row.name,
      branchName: row.branchName,
      // Prefer the branch's own contact details; fall back to the chain's.
      address: row.branchAddress,
      phone: row.branchPhone ?? row.phone,
      latitude: Number(row.branchLat),
      longitude: Number(row.branchLng),
      verified: row.verified,
      plan: rank === 2 ? "FEATURED" : rank === 1 ? "VERIFIED" : "FREE",
      sponsored: rank === 2,
      distanceKm,
      quantity: row.quantity,
      stockStatus: stockStatus(row.quantity, effectiveThreshold(row.lowStockThreshold)),
      mrp: row.mrp,
      expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString() : null,
      stockUpdatedAt: new Date(row.updatedAt).toISOString(),
      profileImageUrl: row.profileImageUrl,
      coverImageUrl: row.coverImageUrl,
      medicine: {
        id: row.medicineId,
        genericName: row.genericName,
        brandName: row.brandName,
        strength: row.strength,
        manufacturer: row.manufacturer,
        imageUrl: row.medicineImageUrl,
      },
      planRank: rank,
      stockId: row.stockId,
    };
  });
}

async function queryBoundingBox(
  lat: number,
  lng: number,
  radiusKm: number,
  medicineId: string | undefined,
  limit: number,
  cursor: Cursor | null
): Promise<InternalRow[]> {
  const box = boundingBoxForRadius(lat, lng, radiusKm);
  const now = new Date();
  const stocks = await prisma.pharmacyStock.findMany({
    where: {
      quantity: { gt: 0 },
      ...(medicineId ? { medicineId } : {}),
      OR: [{ expiryDate: null }, { expiryDate: { gt: now } }],
      location: {
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLng, lte: box.maxLng },
      },
    },
    include: {
      location: { include: { pharmacy: { include: { images: true } } } },
      medicine: true,
    },
  });

  return stocks
    .filter((stock) => isValidLatLng(stock.location.latitude, stock.location.longitude))
    .map((stock) => {
      const pharmacy = stock.location.pharmacy;
      const distanceKm = haversineDistanceKm(lat, lng, stock.location.latitude, stock.location.longitude);
      const rank = planRank(pharmacy.plan, pharmacy.planExpiresAt, now);
      const plan: PlanDTO = rank === 2 ? "FEATURED" : rank === 1 ? "VERIFIED" : "FREE";
      return {
        id: stock.location.id,
        pharmacyId: pharmacy.id,
        name: pharmacy.name,
        branchName: stock.location.name,
        address: stock.location.address,
        phone: stock.location.phone ?? pharmacy.phone,
        latitude: stock.location.latitude,
        longitude: stock.location.longitude,
        verified: pharmacy.verified,
        plan,
        sponsored: rank === 2,
        distanceKm,
        quantity: stock.quantity,
        stockStatus: stockStatus(stock.quantity, effectiveThreshold(stock.lowStockThreshold)),
        mrp: stock.mrp,
        expiryDate: stock.expiryDate ? stock.expiryDate.toISOString() : null,
        stockUpdatedAt: stock.updatedAt.toISOString(),
        profileImageUrl: imageUrl(pharmacy.images, "PROFILE"),
        coverImageUrl: imageUrl(pharmacy.images, "COVER"),
        medicine: {
          id: stock.medicine.id,
          genericName: stock.medicine.genericName,
          brandName: stock.medicine.brandName,
          strength: stock.medicine.strength,
          manufacturer: stock.medicine.manufacturer,
          imageUrl: (stock.medicine as { imageUrl?: string | null }).imageUrl ?? null,
        },
        planRank: rank,
        stockId: stock.id,
      } satisfies InternalRow;
    })
    .filter((row) => Number.isFinite(row.distanceKm) && row.distanceKm <= radiusKm && isAfterCursor(row, cursor))
    .sort(compare)
    .slice(0, limit + 1);
}

function isPostgisUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /postgis|geography|location|st_dwithin|st_distance|extension/i.test(message);
}

export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 60, 60_000);
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const parsed = nearbyQuerySchema.safeParse({
      lat: searchParams.get("lat")?.trim() || undefined,
      lng: searchParams.get("lng")?.trim() || undefined,
      medicineId: searchParams.get("medicineId")?.trim() || undefined,
      radiusKm: searchParams.get("radiusKm") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { lat, lng, medicineId, radiusKm, limit } = parsed.data;
    const fingerprint = makeFingerprint(lat, lng, medicineId, radiusKm);
    const cursor = parseCursor(parsed.data.cursor, fingerprint);
    if (cursor === undefined) {
      return NextResponse.json({ error: "Invalid nearby cursor" }, { status: 400 });
    }

    const mode = process.env.GEOSPATIC_MODE || "auto";
    let rows: InternalRow[];
    if (mode === "bbox" || (mode === "auto" && postgisUnavailable)) {
      rows = await queryBoundingBox(lat, lng, radiusKm, medicineId, limit, cursor);
    } else {
      try {
        rows = await queryPostgis(lat, lng, radiusKm, medicineId, limit, cursor);
      } catch (error) {
        if (mode === "postgis" || !isPostgisUnavailable(error)) throw error;
        postgisUnavailable = true;
        rows = await queryBoundingBox(lat, lng, radiusKm, medicineId, limit, cursor);
      }
    }

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page.at(-1);
    const pagination: PaginationDTO = {
      limit,
      hasMore,
      nextCursor:
        hasMore && last
          ? encodeCursor({
              kind: "nearby",
              fingerprint,
              planRank: last.planRank,
              distanceKm: last.distanceKm,
              locationId: last.id,
              stockId: last.stockId,
            })
          : null,
    };
    const pharmacies = page.map((row) => {
      const { stockId: _stockId, planRank: _planRank, distanceKm, ...dto } = row;
      return { ...dto, distanceKm: roundDistance(distanceKm) };
    });

    // SPECS 4B: only the first page of a fresh search is a demand signal. A
    // "load more" is the same intent restated, so logging it would inflate counts.
    if (!cursor) {
      void recordSearch({ medicineId, latitude: lat, longitude: lng, found: pharmacies.length > 0 });
    }

    return NextResponse.json({ pharmacies, pagination });
  } catch (error) {
    console.error("Nearby pharmacies error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
