import { prisma } from "@/lib/prisma";

/**
 * Shared-schema tenancy helper.
 *
 * Tenant = Pharmacy (chain). Branch = Location.
 * Every stock / request row is scoped by pharmacyId + locationId.
 * This module centralises the "which branch?" resolution so API routes
 * don't each re-implement (and drift on) the fallback logic.
 */

export async function getPrimaryLocation(pharmacyId: string) {
  return prisma.location.findFirst({
    where: { pharmacyId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
}

/**
 * Self-heal for pharmacies created before the multi-branch migration
 * (or any chain left with zero branches): create a Main branch from the
 * chain-level address so stock writes have a branch to attach to.
 */
export async function ensurePrimaryLocation(pharmacyId: string) {
  const existing = await getPrimaryLocation(pharmacyId);
  if (existing) return existing;

  const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
  if (!pharmacy) return null;

  return prisma.location.create({
    data: {
      pharmacyId,
      name: "Main branch",
      address: pharmacy.address,
      phone: pharmacy.phone,
      latitude: pharmacy.latitude,
      longitude: pharmacy.longitude,
      isPrimary: true,
    },
  });
}

/**
 * Resolve the branch a write should attach to.
 * - If the caller passed a locationId, verify it belongs to their pharmacy.
 * - Otherwise fall back to the primary branch (creating one if missing).
 * Returns the location, or null when the requested branch is not theirs.
 */
export async function resolveTenantLocation(pharmacyId: string, requestedLocationId?: string | null) {
  if (requestedLocationId) {
    const owned = await prisma.location.findFirst({
      where: { id: requestedLocationId, pharmacyId },
    });
    if (!owned) return null;
    return owned;
  }
  return ensurePrimaryLocation(pharmacyId);
}
