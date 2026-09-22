import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nearbyQuerySchema } from "@/lib/validations";
import { haversineDistanceKm, stockStatus } from "@/lib/utils";
import { isValidLatLng } from "@/lib/geo";
import { effectiveThreshold, isExpired } from "@/lib/inventory";
import type { NearbyPharmacyDTO } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = nearbyQuerySchema.safeParse({
      lat: searchParams.get("lat"),
      lng: searchParams.get("lng"),
      medicineId: searchParams.get("medicineId") ?? undefined,
      radiusKm: searchParams.get("radiusKm") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { lat, lng, medicineId, radiusKm } = parsed.data;

    // Only pharmacies with stock > 0 for the requested medicine.
    // If no medicineId given, return all pharmacies with any in-stock item.
    const stocks = await prisma.pharmacyStock.findMany({
      where: {
        quantity: { gt: 0 },
        ...(medicineId ? { medicineId } : {}),
      },
      include: {
        pharmacy: { include: { images: true } },
        medicine: true,
      },
    });

    const imageUrl = (
      images: Array<{ kind: string; url: string }>,
      kind: "PROFILE" | "COVER"
    ): string | null => images.find((i) => i.kind === kind)?.url ?? null;

    const now = new Date();
    const results: NearbyPharmacyDTO[] = stocks
      .filter((s) => {
        // One corrupt coordinate row must never break the map for every visitor.
        if (!isValidLatLng(s.pharmacy.latitude, s.pharmacy.longitude)) {
          console.warn("[nearby] Skipping pharmacy with invalid coordinates:", s.pharmacy.id);
          return false;
        }
        // Expired batches are auto-hidden from patient search.
        if (isExpired(s.expiryDate, now)) return false;
        return true;
      })
      .map((s) => {
        const distanceKm = haversineDistanceKm(lat, lng, s.pharmacy.latitude, s.pharmacy.longitude);
        return {
          id: s.pharmacy.id,
          name: s.pharmacy.name,
          address: s.pharmacy.address,
          phone: s.pharmacy.phone,
          latitude: s.pharmacy.latitude,
          longitude: s.pharmacy.longitude,
          verified: s.pharmacy.verified,
          profileImageUrl: imageUrl(s.pharmacy.images, "PROFILE"),
          coverImageUrl: imageUrl(s.pharmacy.images, "COVER"),
          distanceKm: Math.round(distanceKm * 100) / 100,
          quantity: s.quantity,
          stockStatus: stockStatus(s.quantity, effectiveThreshold(s.lowStockThreshold)),
          mrp: s.mrp ?? null,
          expiryDate: s.expiryDate ? s.expiryDate.toISOString() : null,
          medicine: {
            id: s.medicine.id,
            genericName: s.medicine.genericName,
            brandName: s.medicine.brandName,
            strength: s.medicine.strength,
            manufacturer: s.medicine.manufacturer,
          },
        };
      })
      .filter((r) => Number.isFinite(r.distanceKm) && r.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return NextResponse.json({ pharmacies: results });
  } catch (error) {
    console.error("Nearby pharmacies error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
