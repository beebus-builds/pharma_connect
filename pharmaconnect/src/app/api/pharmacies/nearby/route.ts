import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nearbyQuerySchema } from "@/lib/validations";
import { haversineDistanceKm, stockStatus } from "@/lib/utils";
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
        pharmacy: true,
        medicine: true,
      },
    });

    const results: NearbyPharmacyDTO[] = stocks
      .map((s) => {
        const distanceKm = haversineDistanceKm(lat, lng, s.pharmacy.latitude, s.pharmacy.longitude);
        return {
          id: s.pharmacy.id,
          name: s.pharmacy.name,
          address: s.pharmacy.address,
          phone: s.pharmacy.phone,
          latitude: s.pharmacy.latitude,
          longitude: s.pharmacy.longitude,
          distanceKm: Math.round(distanceKm * 100) / 100,
          quantity: s.quantity,
          stockStatus: stockStatus(s.quantity),
          medicine: {
            id: s.medicine.id,
            genericName: s.medicine.genericName,
            brandName: s.medicine.brandName,
            strength: s.medicine.strength,
            manufacturer: s.medicine.manufacturer,
          },
        };
      })
      .filter((r) => r.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return NextResponse.json({ pharmacies: results });
  } catch (error) {
    console.error("Nearby pharmacies error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
