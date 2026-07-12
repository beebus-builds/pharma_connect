import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Wiping all demo data...");
  try {
    // Delete in order to respect foreign key constraints
    await prisma.request.deleteMany();
    await prisma.pharmacyStock.deleteMany();
    await prisma.pharmacy.deleteMany();
    await prisma.medicine.deleteMany();
    await prisma.user.deleteMany();
    console.log("Database successfully wiped.");
  } catch (e) {
    console.error("Error wiping database:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
