import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { parseCsv } from "@/lib/csv";
import { medicineCreateSchema } from "@/lib/validations";
import {
  CSV_MAX_BYTES,
  CSV_MAX_ROWS,
  DEFAULT_LOW_STOCK_THRESHOLD,
  isExpired,
} from "@/lib/inventory";

interface RowError {
  row: number;
  message: string;
}

/**
 * Bulk import inventory from CSV (same columns as the export).
 * Matches medicines case-insensitively; creates missing catalog entries
 * (same dedupe as the single-add flow). Expired rows are imported but stay
 * hidden from patient search until the expiry is fixed.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 5, 60_000);
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
      return NextResponse.json({ error: "Only pharmacies can import inventory" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No CSV file attached" }, { status: 400 });
    }
    if (file.size === 0 || file.size > CSV_MAX_BYTES) {
      return NextResponse.json({ error: "CSV must be between 1 byte and 1 MB" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      return NextResponse.json({ error: "CSV is empty — export first to get the template" }, { status: 400 });
    }
    if (rows.length - 1 > CSV_MAX_ROWS) {
      return NextResponse.json({ error: `Too many rows — max ${CSV_MAX_ROWS} per import` }, { status: 400 });
    }

    const header = rows[0].map((h) => h.trim());
    const idx = (name: string) => header.indexOf(name);
    for (const required of ["genericName", "brandName", "strength", "manufacturer", "quantity"]) {
      if (idx(required) === -1) {
        return NextResponse.json(
          { error: `Missing column "${required}" — export first to get the template` },
          { status: 400 }
        );
      }
    }

    const pharmacyId = session.user.pharmacyId;
    let created = 0;
    let updated = 0;
    let expiredHidden = 0;
    const errors: RowError[] = [];
    const seen = new Set<string>(); // dupe rows inside the same file

    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r];
      if (cells.every((c) => c.trim() === "")) continue;
      const lineNo = r + 1;
      try {
        const get = (name: string) => (cells[idx(name)] ?? "").trim();

        const medParsed = medicineCreateSchema.safeParse({
          genericName: get("genericName"),
          brandName: get("brandName"),
          strength: get("strength"),
          manufacturer: get("manufacturer"),
        });
        if (!medParsed.success) {
          const first = Object.values(medParsed.error.flatten().fieldErrors).flat()[0];
          throw new Error(first || "Invalid product fields");
        }

        const quantity = Number(get("quantity"));
        if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1000000) {
          throw new Error("quantity must be a whole number ≥ 0");
        }

        const mrpRaw = idx("mrp") === -1 ? "" : get("mrp");
        const mrp = mrpRaw === "" ? null : Number(mrpRaw);
        if (mrp !== null && (!Number.isInteger(mrp) || mrp < 0)) {
          throw new Error("mrp must be a whole number ≥ 0");
        }

        const expRaw = idx("expiryDate") === -1 ? "" : get("expiryDate");
        let expiryDate: Date | null = null;
        if (expRaw !== "") {
          const d = new Date(expRaw);
          if (Number.isNaN(d.getTime())) throw new Error("expiryDate must be YYYY-MM-DD");
          expiryDate = d;
        }

        const thrRaw = idx("lowStockThreshold") === -1 ? "" : get("lowStockThreshold");
        const lowStockThreshold =
          thrRaw === "" ? DEFAULT_LOW_STOCK_THRESHOLD : Number(thrRaw);
        if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
          throw new Error("lowStockThreshold must be a whole number ≥ 0");
        }

        const { genericName, brandName, strength, manufacturer } = medParsed.data;
        const dupeKey = `${genericName}|${brandName}|${strength}|${manufacturer}`.toLowerCase();
        if (seen.has(dupeKey)) throw new Error("Duplicate row in this file — keeping the first");
        seen.add(dupeKey);

        let medicine = await prisma.medicine.findFirst({
          where: {
            genericName: { equals: genericName, mode: "insensitive" },
            brandName: { equals: brandName, mode: "insensitive" },
            strength: { equals: strength, mode: "insensitive" },
            manufacturer: { equals: manufacturer, mode: "insensitive" },
          },
        });
        if (!medicine) {
          medicine = await prisma.medicine.create({
            data: { genericName, brandName, strength, manufacturer },
          });
        }

        const existing = await prisma.pharmacyStock.findUnique({
          where: { pharmacyId_medicineId: { pharmacyId, medicineId: medicine.id } },
        });
        const oldQuantity = existing?.quantity ?? 0;

        await prisma.$transaction([
          prisma.pharmacyStock.upsert({
            where: { pharmacyId_medicineId: { pharmacyId, medicineId: medicine.id } },
            update: {
              quantity,
              mrp,
              expiryDate,
              lowStockThreshold,
              ...(quantity > effectiveThreshold(existing?.lowStockThreshold) ? { lowStockAlertSentAt: null } : {}),
            },
            create: {
              pharmacyId,
              medicineId: medicine.id,
              quantity,
              mrp,
              expiryDate,
              lowStockThreshold,
              ...(quantity <= lowStockThreshold ? { lowStockAlertSentAt: new Date() } : {}),
            },
          }),
          prisma.stockHistory.create({
            data: {
              pharmacyId,
              medicineId: medicine.id,
              oldQuantity,
              newQuantity: quantity,
              delta: quantity - oldQuantity,
              note: `CSV IMPORT ${oldQuantity} → ${quantity}`,
              createdById: session.user.id,
            },
          }),
        ]);

        if (existing) updated++;
        else created++;
        if (isExpired(expiryDate)) expiredHidden++;
      } catch (e: any) {
        errors.push({ row: lineNo, message: e.message || "Invalid row" });
      }
    }

    return NextResponse.json({
      message: `Import done: ${created} added, ${updated} updated${expiredHidden ? `, ${expiredHidden} expired (hidden from search)` : ""}${errors.length ? `, ${errors.length} rows skipped` : ""}.`,
      created,
      updated,
      expiredHidden,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    console.error("[stock] import error:", error);
    return NextResponse.json({ error: "Import failed. Please try again." }, { status: 500 });
  }
}

function effectiveThreshold(t: number | null | undefined): number {
  return typeof t === "number" && Number.isFinite(t) && t >= 0 ? t : DEFAULT_LOW_STOCK_THRESHOLD;
}
