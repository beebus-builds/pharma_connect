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
import type { NearbyPharmacyDTO, PaginationDTO } from "@/types";

type NearbyCursor = {
  kind: "nearby";
  fingerprint: string;
  distanceKm: number;
  pharmacyId: string;
  stockId: string;
};

type InternalNearby = NearbyPharmacyDTO & {
  stockId: string;
  distanceKm: number;
};

let postgisUnavailable = false;

type PostgisRow = {
  stockId: string;
  quantity: number;
  expiryDate: Date | null;
  mrp: number | null;
  lowStockThreshold: number;
  updatedAt: Date;
  pharmacyId: string;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  verified: boolean;
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  medicineId: string;
  genericName: string;
  brandName: string;
  strength: string;
  manufacturer: string;
  distanceKm: number;
};

function makeFingerprint(lat: number, lng: number, medicineId: string | undefined, radiusKm: number) {
  return createHash("sha256")
    .update(JSON.stringify({ lat, lng, medicineId: medicineId ?? null, radiusKm }))
    .digest("hex")
    .slice(0, 24);
}

function parseNearbyCursor(raw: string | undefined, fingerprint: string): NearbyCursor | null | undefined {
  if (!raw) return null;
  const payload = decodeCursor(raw);
  if (
    !payload ||
    payload.kind !== "nearby" ||
    payload.fingerprint !== fingerprint ||
    typeof payload.distanceKm !== "number" ||
    !Number.isFinite(payload.distanceKm) ||
    typeof payload.pharmacyId !== "string" ||
    typeof payload.stockId !== "string"
  ) {
    return undefined;
  }
  return {
    kind: "nearby",
    fingerprint,
    distanceKm: payload.distanceKm,
    pharmacyId: payload.pharmacyId,
    stockId: payload.stockId,
  };
}

function roundDistance(distanceKm: number) {
  return Math.round(distanceKm * 100) / 100;
}

function isAfterCursor(row: InternalNearby, cursor: NearbyCursor | null) {
  if (!cursor) return true;
  if (row.distanceKm !== cursor.distanceKm) return row.distanceKm > cursor.distanceKm;
  if (row.id !== cursor.pharmacyId) return row.id > cursor.pharmacyId;
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
  cursor: NearbyCursor | null
): Promise<InternalNearby[]> {
  const cursorDistance = cursor?.distanceKm ?? null;
  const cursorPharmacyId = cursor?.pharmacyId ?? null;
  const cursorStockId = cursor?.stockId ?? null;

  const rows = await prisma.$queryRaw<PostgisRow[]>(Prisma.sql`
    WITH nearby AS (
      SELECT
        s."id" AS "stockId",
        s."quantity" AS "quantity",
        s."expiryDate" AS "expiryDate",
        s."mrp" AS "mrp",
        s."lowStockThreshold" AS "lowStockThreshold",
        s."updatedAt" AS "updatedAt",
        p."id" AS "pharmacyId",
        p."name" AS "name",
        p."address" AS "address",
        p."phone" AS "phone",
        p."latitude" AS "latitude",
        p."longitude" AS "longitude",
        p."verified" AS "verified",
        m."id" AS "medicineId",
        m."genericName" AS "genericName",
        m."brandName" AS "brandName",
        m."strength" AS "strength",
        m."manufacturer" AS "manufacturer",
        ST_Distance(
          p."location",
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
      JOIN "Pharmacy" p ON p."id" = s."pharmacyId"
      JOIN "Medicine" m ON m."id" = s."medicineId"
      WHERE p."location" IS NOT NULL
        AND s."quantity" > 0
        AND (s."expiryDate" IS NULL OR s."expiryDate" > NOW())
        AND ST_DWithin(
          p."location",
          ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)::geography,
          ${radiusKm * 1000}::double precision
        )
        AND (${medicineId ?? null}::text IS NULL OR s."medicineId" = ${medicineId ?? null}::text)
    )
    SELECT *
    FROM nearby
    WHERE (
      ${cursorDistance ?? null}::double precision IS NULL
      OR "distanceKm" > ${cursorDistance ?? null}::double precision
      OR (
        "distanceKm" = ${cursorDistance ?? null}::double precision
        AND ("pharmacyId", "stockId") > (${cursorPharmacyId ?? null}::text, ${cursorStockId ?? null}::text)
      )
    )
    ORDER BY "distanceKm" ASC, "pharmacyId" ASC, "stockId" ASC
    LIMIT ${limit + 1}
  `);

  return rows.map((row) => ({
    id: row.pharmacyId,
    name: row.name,
    address: row.address,
    phone: row.phone,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    verified: row.verified,
    profileImageUrl: row.profileImageUrl,
    coverImageUrl: row.coverImageUrl,
    distanceKm: Number(row.distanceKm),
    quantity: row.quantity,
    stockStatus: stockStatus(row.quantity, effectiveThreshold(row.lowStockThreshold)),
    mrp: row.mrp,
    expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString() : null,
    stockUpdatedAt: new Date(row.updatedAt).toISOString(),
    medicine: {
      id: row.medicineId,
      genericName: row.genericName,
      brandName: row.brandName,
      strength: row.strength,
      manufacturer: row.manufacturer,
    },
    stockId: row.stockId,
  }));
}

async function queryBoundingBox(
  lat: number,
  lng: number,
  radiusKm: number,
  medicineId: string | undefined,
  limit: number,
  cursor: NearbyCursor | null
): Promise<InternalNearby[]> {
  const box = boundingBoxForRadius(lat, lng, radiusKm);
  const now = new Date();
  const stocks = await prisma.pharmacyStock.findMany({
    where: {
      quantity: { gt: 0 },
      ...(medicineId ? { medicineId } : {}),
      OR: [{ expiryDate: null }, { expiryDate: { gt: now } }],
      pharmacy: {
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLng, lte: box.maxLng },
      },
    },
    include: {
      pharmacy: { include: { images: true } },
      medicine: true,
    },
  });

  return stocks
    .filter((stock) => isValidLatLng(stock.pharmacy.latitude, stock.pharmacy.longitude))
    .map((stock) => {
      const distanceKm = haversineDistanceKm(lat, lng, stock.pharmacy.latitude, stock.pharmacy.longitude);
      return {
        id: stock.pharmacy.id,
        name: stock.pharmacy.name,
        address: stock.pharmacy.address,
        phone: stock.pharmacy.phone,
        latitude: stock.pharmacy.latitude,
        longitude: stock.pharmacy.longitude,
        verified: stock.pharmacy.verified,
        profileImageUrl: imageUrl(stock.pharmacy.images, "PROFILE"),
        coverImageUrl: imageUrl(stock.pharmacy.images, "COVER"),
        distanceKm,
        quantity: stock.quantity,
        stockStatus: stockStatus(stock.quantity, effectiveThreshold(stock.lowStockThreshold)),
        mrp: stock.mrp,
        expiryDate: stock.expiryDate ? stock.expiryDate.toISOString() : null,
        stockUpdatedAt: stock.updatedAt.toISOString(),
        medicine: {
          id: stock.medicine.id,
          genericName: stock.medicine.genericName,
          brandName: stock.medicine.brandName,
          strength: stock.medicine.strength,
          manufacturer: stock.medicine.manufacturer,
        },
        stockId: stock.id,
      } satisfies InternalNearby;
    })
    .filter((row) => Number.isFinite(row.distanceKm) && row.distanceKm <= radiusKm && isAfterCursor(row, cursor))
    .sort((a, b) => a.distanceKm - b.distanceKm || a.id.localeCompare(b.id) || a.stockId.localeCompare(b.stockId))
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
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const parsed = nearbyQuerySchema.safeParse({
      lat: latParam?.trim() ? latParam : undefined,
      lng: lngParam?.trim() ? lngParam : undefined,
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
    const cursor = parseNearbyCursor(parsed.data.cursor, fingerprint);
    if (cursor === undefined) {
      return NextResponse.json({ error: "Invalid nearby cursor" }, { status: 400 });
    }

    const mode = process.env.GEOSPATIC_MODE || "auto";
    let rows: InternalNearby[];
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
              distanceKm: last.distanceKm,
              pharmacyId: last.id,
              stockId: last.stockId,
            })
          : null,
    };
    const pharmacies = page.map((row) => {
      const { stockId: _stockId, distanceKm, ...dto } = row;
      return { ...dto, distanceKm: roundDistance(distanceKm) };
    });

    return NextResponse.json({ pharmacies, pagination });
  } catch (error) {
    console.error("Nearby pharmacies error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
