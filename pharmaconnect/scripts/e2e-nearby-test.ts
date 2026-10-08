/**
 * End-to-end check of the platform's core claim:
 *   "a patient searches a medicine and is shown the NEAREST pharmacy that has it."
 *
 * Creates real accounts + stock, then drives the SAME public HTTP endpoints the
 * homepage uses (/api/medicines/search + /api/pharmacies/nearby) and asserts the
 * result is correct and correctly ordered by distance.
 *
 * Run from pharmaconnect/ with the dev server already running:
 *   npx tsx scripts/e2e-nearby-test.ts
 *
 * Data is KEPT so you can log in and continue testing. Re-running is idempotent
 * (it wipes prior e2e.* data first). Remove it with:
 *   npx tsx scripts/e2e-clean.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const BASE = process.env.BASE_URL || "http://localhost:3000";
const PW = "E2ePass!23";

// A unique marker medicine so seeded noise can't leak into the result.
const MEDICINE = { genericName: "Zetatestine", brandName: "E2eCheck", strength: "1mg", manufacturer: "E2E Labs" };

// Where the "patient" is standing.
const ORIGIN = { lat: 27.7172, lng: 85.324, label: "Thamel, Kathmandu" };

// Four pharmacies at known distances from ORIGIN (haversine approx):
//   Alpha ~0.06km (in stock 12)  Beta ~1.7km (in stock 4)
//   Delta ~4.8km  (in stock 30)  Gamma ~5.1km (OUT of stock 0 -> must be excluded)
const PHARMACIES = [
  { key: "alpha", name: "E2E Alpha Medical", email: "e2e.alpha@pharmaconnect.local", address: "Thamel, Kathmandu", phone: "9800000001", lat: 27.7175, lng: 85.3245, qty: 12 },
  { key: "beta", name: "E2E Beta Medical", email: "e2e.beta@pharmaconnect.local", address: "Durbar Marg, Kathmandu", phone: "9800000002", lat: 27.702, lng: 85.32, qty: 4 },
  { key: "delta", name: "E2E Delta Medical", email: "e2e.delta@pharmaconnect.local", address: "Baluwatar, Kathmandu", phone: "9800000003", lat: 27.76, lng: 85.33, qty: 30 },
  { key: "gamma", name: "E2E Gamma Medical", email: "e2e.gamma@pharmaconnect.local", address: "Patan, Lalitpur", phone: "9800000004", lat: 27.671, lng: 85.3247, qty: 0 },
];

const PATIENTS = [
  { name: "E2E Patient One", email: "e2e.patient1@pharmaconnect.local" },
  { name: "E2E Patient Two", email: "e2e.patient2@pharmaconnect.local" },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

type Check = { name: string; pass: boolean; detail: string };
const checks: Check[] = [];
function check(name: string, pass: boolean, detail = "") {
  checks.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function wipeE2E() {
  await prisma.pharmacyStock.deleteMany({ where: { medicine: { genericName: MEDICINE.genericName } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: "e2e." } } }); // cascades pharmacy -> location
  await prisma.medicine.deleteMany({ where: { genericName: MEDICINE.genericName } });
}

async function seed() {
  const hashed = await bcrypt.hash(PW, 10);

  for (const p of PATIENTS) {
    await prisma.user.create({ data: { ...p, password: hashed, role: "PATIENT", emailVerified: true } });
  }

  const medicine = await prisma.medicine.create({ data: MEDICINE });

  const ids: Record<string, { pharmacyId: string; locationId: string }> = {};
  for (const ph of PHARMACIES) {
    const user = await prisma.user.create({
      data: {
        name: ph.name,
        email: ph.email,
        password: hashed,
        role: "PHARMACY",
        emailVerified: true,
        pharmacy: {
          create: {
            name: ph.name,
            address: ph.address,
            phone: ph.phone,
            latitude: ph.lat,
            longitude: ph.lng,
            verified: true,
            verifiedAt: new Date(),
            locations: {
              create: { name: "Main branch", address: ph.address, phone: ph.phone, latitude: ph.lat, longitude: ph.lng, isPrimary: true },
            },
          },
        },
      },
      include: { pharmacy: { include: { locations: true } } },
    });
    const pharmacy = user.pharmacy!;
    const branch = pharmacy.locations.find((l) => l.isPrimary) ?? pharmacy.locations[0];
    ids[ph.key] = { pharmacyId: pharmacy.id, locationId: branch.id };

    await prisma.pharmacyStock.create({
      data: { pharmacyId: pharmacy.id, locationId: branch.id, medicineId: medicine.id, quantity: ph.qty },
    });

    // PostGIS search reads the geography column — set it explicitly.
    await prisma.$executeRaw`
      UPDATE "Location" SET "location" = ST_SetSRID(ST_MakePoint(${ph.lng}::double precision, ${ph.lat}::double precision), 4326)::geography
      WHERE "id" = ${branch.id}`;
  }
  return { medicine, ids };
}

interface NearbyRow {
  id: string;
  pharmacyId: string;
  name: string;
  branchName: string;
  verified: boolean;
  distanceKm: number;
  quantity: number;
  stockStatus: string;
  medicine: { id: string; genericName: string };
}

async function httpTests(medicineId: string) {
  // Warm up (dev compiles routes on first hit), then run the search the UI uses.
  let searchJson: { medicines?: { id: string; genericName: string }[] } = {};
  const deadline = Date.now() + 120_000;
  for (;;) {
    try {
      const res = await fetch(`${BASE}/api/medicines/search?q=zeta&limit=5`);
      if (res.ok) {
        searchJson = (await res.json()) as typeof searchJson;
        break;
      }
    } catch {
      /* server not ready yet */
    }
    if (Date.now() > deadline) throw new Error("Search endpoint never became ready (is the dev server running?)");
    await new Promise((r) => setTimeout(r, 1500));
  }

  const found = searchJson.medicines?.find((m) => m.genericName === MEDICINE.genericName);
  check("Search returns the marker medicine", Boolean(found), found ? `id=${found!.id}` : "not found for q=zeta");
  const resolvedId = found?.id ?? medicineId;

  const run = async (radiusKm: number) => {
    const url = `${BASE}/api/pharmacies/nearby?lat=${ORIGIN.lat}&lng=${ORIGIN.lng}&medicineId=${resolvedId}&radiusKm=${radiusKm}&limit=50`;
    const res = await fetch(url);
    const json = (await res.json()) as { pharmacies?: NearbyRow[] };
    return { status: res.status, rows: json.pharmacies ?? [] };
  };

  // --- Wide radius: everything in stock, correctly ordered by distance ---
  const wide = await run(20);
  check("Nearby endpoint returns 200", wide.status === 200, `status=${wide.status}`);
  const names = wide.rows.map((r) => r.name);
  check("Returns exactly the 3 in-stock pharmacies (Gamma excluded)", wide.rows.length === 3, names.join(", ") || "none");
  check("Nearest result is E2E Alpha Medical", names[0] === "E2E Alpha Medical", `first=${names[0]}`);
  check("Out-of-stock Gamma is excluded", !names.includes("E2E Gamma Medical"));
  const distances = wide.rows.map((r) => r.distanceKm);
  const ascending = distances.every((d, i) => i === 0 || d >= distances[i - 1]);
  check("Results are sorted by distance (nearest first)", ascending, `km=[${distances.join(", ")}]`);
  check("Order matches Alpha < Beta < Delta", names[0] === "E2E Alpha Medical" && names[1] === "E2E Beta Medical" && names[2] === "E2E Delta Medical");
  check("Every result is a verified branch", wide.rows.every((r) => r.verified));
  check("Every result is the searched medicine", wide.rows.every((r) => r.medicine.genericName === MEDICINE.genericName));
  const alpha = wide.rows.find((r) => r.name === "E2E Alpha Medical");
  check("Alpha shows its live stock (qty 12, in-stock)", alpha?.quantity === 12 && alpha?.stockStatus === "in-stock", `qty=${alpha?.quantity} status=${alpha?.stockStatus}`);
  const alphaOk = alpha ? Math.abs(alpha.distanceKm - haversineKm(ORIGIN.lat, ORIGIN.lng, 27.7175, 85.3245)) < 0.3 : false;
  check("Distance is realistic (<0.5 km to Alpha)", (alpha?.distanceKm ?? 99) < 0.5 && alphaOk, `reported=${alpha?.distanceKm} km`);

  // --- Narrow radius: far ones drop out ---
  const near = await run(3);
  const nearNames = near.rows.map((r) => r.name);
  check("3 km radius keeps only Alpha + Beta", near.rows.length === 2 && nearNames.includes("E2E Alpha Medical") && nearNames.includes("E2E Beta Medical"), nearNames.join(", ") || "none");
  check("3 km radius drops Delta (far)", !nearNames.includes("E2E Delta Medical"));
}

async function main() {
  console.log(`Base: ${BASE}`);
  await wipeE2E();
  const { medicine, ids } = await seed();
  console.log("Seeded 2 patients + 4 pharmacies (+1 out of stock) around Thamel, Kathmandu.\n");

  await httpTests(medicine.id);

  const passed = checks.filter((c) => c.pass).length;
  console.log(`\nResult: ${passed}/${checks.length} checks passed`);

  console.log("\nAccounts (password for all: " + PW + ")");
  for (const p of PATIENTS) console.log(`  patient  ${p.email}`);
  for (const ph of PHARMACIES) console.log(`  pharmacy ${ph.email}  (${ph.name}, qty ${ph.qty})`);
  console.log(`\nSearch as a patient at Thamel (${ORIGIN.lat},${ORIGIN.lng}) for "${medicine.genericName}" → nearest is E2E Alpha Medical.`);
  console.log("Pharmacy ids:", Object.fromEntries(Object.entries(ids).map(([k, v]) => [k, v.pharmacyId])));

  if (passed !== checks.length) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
