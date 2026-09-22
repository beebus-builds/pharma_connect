import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { haversineDistanceKm, stockStatus } from "@/lib/utils";
import { isValidLatLng } from "@/lib/geo";
import { effectiveThreshold, isExpired } from "@/lib/inventory";
import type { PharmacyStorefrontDTO } from "@/types";

/** Public pharmacy storefront: profile, photos, and full product list. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const hasLocation = isValidLatLng(lat, lng);

    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id },
      include: {
        images: true,
        stocks: {
          include: { medicine: true },
          orderBy: [{ quantity: "desc" }, { updatedAt: "desc" }],
        },
      },
    });
    if (!pharmacy) {
      return NextResponse.json({ error: "Pharmacy not found" }, { status: 404 });
    }

    const imageUrl = (kind: "PROFILE" | "COVER"): string | null =>
      pharmacy.images.find((i) => i.kind === kind)?.url ?? null;

    const now = new Date();
    const products = pharmacy.stocks
      // Patients never see expired batches.
      .filter((s) => !isExpired(s.expiryDate, now))
      .map((s) => ({
        medicine: {
          id: s.medicine.id,
          genericName: s.medicine.genericName,
          brandName: s.medicine.brandName,
          strength: s.medicine.strength,
          manufacturer: s.medicine.manufacturer,
        },
        quantity: s.quantity,
        stockStatus: stockStatus(s.quantity, effectiveThreshold(s.lowStockThreshold)),
        mrp: s.mrp ?? null,
        expiryDate: s.expiryDate ? s.expiryDate.toISOString() : null,
        updatedAt: s.updatedAt.toISOString(),
      }));

    const dto: PharmacyStorefrontDTO = {
      id: pharmacy.id,
      name: pharmacy.name,
      address: pharmacy.address,
      phone: pharmacy.phone,
      latitude: pharmacy.latitude,
      longitude: pharmacy.longitude,
      verified: pharmacy.verified,
      distanceKm: hasLocation
        ? Math.round(haversineDistanceKm(lat, lng, pharmacy.latitude, pharmacy.longitude) * 100) / 100
        : null,
      profileImageUrl: imageUrl("PROFILE"),
      coverImageUrl: imageUrl("COVER"),
      inStockCount: products.filter((p) => p.quantity > 0).length,
      products,
    };

    return NextResponse.json({ pharmacy: dto });
  } catch (error) {
    console.error("[storefront] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
