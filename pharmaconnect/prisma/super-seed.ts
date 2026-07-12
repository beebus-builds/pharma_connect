import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Super Seed...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  // Cleanup
  await prisma.request.deleteMany();
  await prisma.pharmacyStock.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.pharmacy.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Admin
  await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@pharmaconnect.com',
      password: hashedPassword,
      role: 'ADMIN',
      emailVerified: true,
    },
  });
  console.log("Created Admin");

  // 2. Medicines
  const medicinesData = [
    { genericName: "Paracetamol", brandName: "Napa", strength: "500mg", manufacturer: "Beximco Pharma" },
    { genericName: "Ibuprofen", brandName: "Brufen", strength: "400mg", manufacturer: "Abbott" },
    { genericName: "Azithromycin", brandName: "Zithro", strength: "500mg", manufacturer: "Deurali-Janta" },
    { genericName: "Amoxicillin", brandName: "Amoxil", strength: "500mg", manufacturer: "GSK" },
    { genericName: "Cetirizine", brandName: "Alerid", strength: "10mg", manufacturer: "Cipla" },
    { genericName: "Omeprazole", brandName: "Omez", strength: "20mg", manufacturer: "Dr. Reddy's" },
    { genericName: "Metformin", brandName: "Glucophage", strength: "500mg", manufacturer: "Merck" },
    { genericName: "Amlodipine", brandName: "Norvasc", strength: "5mg", manufacturer: "Pfizer" },
    { genericName: "Atorvastatin", brandName: "Lipitor", strength: "10mg", manufacturer: "Pfizer" },
    { genericName: "Losartan", brandName: "Cozaar", strength: "50mg", manufacturer: "Merck" },
  ];
  const medicineRecords = await prisma.medicine.createMany({ data: medicinesData });
  const medicines = await prisma.medicine.findMany();

  // 3. Pharmacies
  const pharmaciesData = [
    { email: "pharmacy1@example.com", name: "Nepal Life Pharmacy", address: "New Road, Kathmandu", phone: "01-4223344", lat: 27.7041, lng: 85.3145, license: "PH-KTM-001" },
    { email: "pharmacy2@example.com", name: "Everest Health Pharmacy", address: "Durbar Marg, Kathmandu", phone: "01-4225566", lat: 27.7109, lng: 85.3183, license: "PH-KTM-002" },
  ];

  for (const p of pharmaciesData) {
    const user = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        password: hashedPassword,
        role: "PHARMACY",
        emailVerified: true,
        pharmacy: {
          create: {
            name: p.name,
            address: p.address,
            phone: p.phone,
            latitude: p.lat,
            longitude: p.lng,
            licenseNumber: p.license,
          },
        },
      },
      include: { pharmacy: true },
    });

    const stockData = medicines.map((m) => ({
      pharmacyId: user.pharmacy!.id,
      medicineId: m.id,
      quantity: Math.floor(Math.random() * 100),
    }));
    await prisma.pharmacyStock.createMany({ data: stockData });
  }

  // 4. Patients
  for (let i = 1; i <= 5; i++) {
    await prisma.user.create({
      data: {
        name: `Test Patient ${i}`,
        email: `patient${i}@example.com`,
        password: hashedPassword,
        role: "PATIENT",
        emailVerified: true,
      },
    });
  }

  console.log("Super Seed complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
