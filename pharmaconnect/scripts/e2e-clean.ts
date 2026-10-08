/**
 * Removes everything created by scripts/e2e-nearby-test.ts.
 *   npx tsx scripts/e2e-clean.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MARKER_GENERIC = "Zetatestine";

async function main() {
  await prisma.pharmacyStock.deleteMany({ where: { medicine: { genericName: MARKER_GENERIC } } });
  const { count } = await prisma.user.deleteMany({ where: { email: { startsWith: "e2e." } } });
  await prisma.medicine.deleteMany({ where: { genericName: MARKER_GENERIC } });
  console.log(`Cleaned up ${count} e2e user account(s) and their pharmacies/stock.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
