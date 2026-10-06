/**
 * Additive catalog seed — safe to run against production.
 *
 * Unlike `prisma/seed.ts`, this NEVER deletes. It is idempotent: medicines are
 * upserted on (genericName, brandName, strength) and stock is upserted per
 * (locationId, medicineId), so repeated runs converge instead of duplicating.
 *
 * Existing users, pharmacies, requests and conversations are left untouched.
 *
 *   DATABASE_URL=... npx tsx scripts/seed-catalog.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MEDICINES: Array<{
  genericName: string;
  brandName: string;
  strength: string;
  manufacturer: string;
  mrp: number;
}> = [
  { genericName: "Paracetamol", brandName: "Napa", strength: "500mg", manufacturer: "Beximco Pharma", mrp: 15 },
  { genericName: "Ibuprofen", brandName: "Brufen", strength: "400mg", manufacturer: "Abbott", mrp: 38 },
  { genericName: "Azithromycin", brandName: "Zithro", strength: "500mg", manufacturer: "Square Pharmaceuticals", mrp: 145 },
  { genericName: "Amoxicillin", brandName: "Amoxil", strength: "500mg", manufacturer: "GSK", mrp: 62 },
  { genericName: "Cetirizine", brandName: "Alerid", strength: "10mg", manufacturer: "Cipla", mrp: 12 },
  { genericName: "Omeprazole", brandName: "Omez", strength: "20mg", manufacturer: "Dr. Reddy's", mrp: 45 },
  { genericName: "Metformin", brandName: "Glucophage", strength: "500mg", manufacturer: "Merck", mrp: 55 },
  { genericName: "Amlodipine", brandName: "Norvasc", strength: "5mg", manufacturer: "Pfizer", mrp: 48 },
  { genericName: "Atorvastatin", brandName: "Lipitor", strength: "10mg", manufacturer: "Pfizer", mrp: 95 },
  { genericName: "Losartan", brandName: "Cozaar", strength: "50mg", manufacturer: "Merck", mrp: 72 },
  { genericName: "Diclofenac", brandName: "Voltaren", strength: "50mg", manufacturer: "Novartis", mrp: 40 },
  { genericName: "Salbutamol", brandName: "Ventolin", strength: "100mcg", manufacturer: "GSK", mrp: 210 },
  { genericName: "Vitamin C", brandName: "Celin", strength: "500mg", manufacturer: "GSK", mrp: 10 },
  { genericName: "Folic Acid", brandName: "Folvite", strength: "5mg", manufacturer: "Sun Pharma", mrp: 8 },
  { genericName: "Loratadine", brandName: "Claritin", strength: "10mg", manufacturer: "Bayer", mrp: 35 },
  { genericName: "Metronidazole", brandName: "Flagyl", strength: "400mg", manufacturer: "Sanofi", mrp: 28 },
  { genericName: "Aspirin", brandName: "Ecosprin", strength: "75mg", manufacturer: "USV", mrp: 6 },
  { genericName: "ORS", brandName: "Jeevan", strength: "1 sachet", manufacturer: "Nepal Pharmaceuticals", mrp: 18 },
  { genericName: "Ciprofloxacin", brandName: "Ciplox", strength: "500mg", manufacturer: "Cipla", mrp: 52 },
  { genericName: "Domperidone", brandName: "Motilium", strength: "10mg", manufacturer: "Janssen", mrp: 44 },
];

/** Deterministic pseudo-stock so reruns do not churn inventory rows. */
function stockFor(medicineId: string, locationId: string): number {
  let h = 0;
  const key = `${medicineId}:${locationId}`;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const bucket = h % 100;
  if (bucket < 12) return 0;
  if (bucket < 38) return (h % 5) + 1;
  return (h % 90) + 10;
}

async function main() {
  const locations = await prisma.location.findMany({
    select: { id: true, name: true, pharmacy: { select: { id: true, name: true, plan: true } } },
  });

  if (locations.length === 0) {
    console.error("No pharmacy branches found — nothing to stock. Create a pharmacy first.");
    return;
  }
  console.log(`Found ${locations.length} branch(es): ${locations.map((l) => l.pharmacy.name).join(", ")}`);

  let created = 0;
  let updated = 0;

  for (const row of MEDICINES) {
    const where = {
      genericName_brandName_strength: {
        genericName: row.genericName,
        brandName: row.brandName,
        strength: row.strength,
      },
    };
    const { mrp, ...medicineFields } = row;
    void mrp; // MRP lives on PharmacyStock, not the shared catalog row.
    const existing = await prisma.medicine.findUnique({ where });
    if (existing) {
      await prisma.medicine.update({
        where: { id: existing.id },
        data: { manufacturer: medicineFields.manufacturer },
      });
      updated++;
    } else {
      await prisma.medicine.create({ data: medicineFields });
      created++;
    }
  }

  console.log(`Medicines: ${created} created, ${updated} already present`);

  let stockRows = 0;
  for (const location of locations) {
    for (const row of MEDICINES) {
      const medicine = await prisma.medicine.findUnique({
        where: {
          genericName_brandName_strength: {
            genericName: row.genericName,
            brandName: row.brandName,
            strength: row.strength,
          },
        },
        select: { id: true },
      });
      if (!medicine) continue;

      await prisma.pharmacyStock.upsert({
        where: { locationId_medicineId: { locationId: location.id, medicineId: medicine.id } },
        update: { mrp: row.mrp },
        create: {
          pharmacyId: location.pharmacy.id,
          locationId: location.id,
          medicineId: medicine.id,
          quantity: stockFor(medicine.id, location.id),
          mrp: row.mrp,
          lowStockThreshold: 10,
        },
      });
      stockRows++;
    }
  }

  console.log(`Stock: ${stockRows} listings synced across ${locations.length} branch(es)`);
  console.log("Catalog seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });