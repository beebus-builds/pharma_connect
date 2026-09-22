import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INVENTORY_CSV_HEADERS, toCsv } from "@/lib/csv";

/** Download the full inventory as CSV (opens in Excel/Sheets). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stocks = await prisma.pharmacyStock.findMany({
    where: { pharmacyId: session.user.pharmacyId },
    include: { medicine: true },
    orderBy: { updatedAt: "desc" },
  });

  const csv = toCsv(
    [...INVENTORY_CSV_HEADERS],
    stocks.map((s) => [
      s.medicine.genericName,
      s.medicine.brandName,
      s.medicine.strength,
      s.medicine.manufacturer,
      s.quantity,
      s.mrp,
      s.expiryDate ? s.expiryDate.toISOString().slice(0, 10) : "",
      s.lowStockThreshold,
    ])
  );

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory-${date}.csv"`,
    },
  });
}
