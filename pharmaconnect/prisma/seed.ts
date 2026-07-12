import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
  { genericName: "Diclofenac", brandName: "Voltaren", strength: "50mg", manufacturer: "Novartis" },
  { genericName: "Ranitidine", brandName: "Zantac", strength: "150mg", manufacturer: "GSK" },
  { genericName: "Ciprofloxacin", brandName: "Ciplox", strength: "500mg", manufacturer: "Cipla" },
  { genericName: "Domperidone", brandName: "Motilium", strength: "10mg", manufacturer: "Janssen" },
  { genericName: "Salbutamol", brandName: "Ventolin", strength: "100mcg", manufacturer: "GSK" },
  { genericName: "Vitamin C", brandName: "Celin", strength: "500mg", manufacturer: "GSK" },
  { genericName: "Folic Acid", brandName: "Folvite", strength: "5mg", manufacturer: "Sun Pharma" },
  { genericName: "Loratadine", brandName: "Claritin", strength: "10mg", manufacturer: "Bayer" },
  { genericName: "Metronidazole", brandName: "Flagyl", strength: "400mg", manufacturer: "Sanofi" },
  { genericName: "Aspirin", brandName: "Ecosprin", strength: "75mg", manufacturer: "USV" },
];

const pharmaciesData = [
  {
    email: "pharmacy1@example.com",
    name: "Nepal Life Pharmacy",
    address: "New Road, Kathmandu 44600",
    phone: "01-4223344",
    latitude: 27.7041,
    longitude: 85.3145,
    licenseNumber: "PH-KTM-001",
  },
  {
    email: "pharmacy2@example.com",
    name: "Everest Health Pharmacy",
    address: "Durbar Marg, Kathmandu 44600",
    phone: "01-4225566",
    latitude: 27.7109,
    longitude: 85.3183,
    licenseNumber: "PH-KTM-002",
  },
  {
    email: "pharmacy3@example.com",
    name: "Patan Care Pharmacy",
    address: "Mangal Bazaar, Lalitpur 44700",
    phone: "01-5525577",
    latitude: 27.6727,
    longitude: 85.3247,
    licenseNumber: "PH-LTP-003",
  },
  {
    email: "pharmacy4@example.com",
    name: "Boudha Wellness Pharmacy",
    address: "Boudhanath, Kathmandu 44600",
    phone: "01-4487722",
    latitude: 27.7215,
    longitude: 85.3620,
    licenseNumber: "PH-KTM-004",
  },
  {
    email: "pharmacy5@example.com",
    name: "Bhaktapur Sanjeevani Pharmacy",
    address: "Durbar Square Road, Bhaktapur 44800",
    phone: "01-6612233",
    latitude: 27.6710,
    longitude: 85.4298,
    licenseNumber: "PH-BKT-005",
  },
];

function randomStock() {
  const bucket = Math.random();
  if (bucket < 0.15) return 0;
  if (bucket < 0.4) return Math.floor(Math.random() * 5) + 1;
  return Math.floor(Math.random() * 90) + 10;
}

async function main() {
  console.log("Seeding database...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  await prisma.request.deleteMany();
  await prisma.pharmacyStock.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.pharmacy.deleteMany();
  await prisma.user.deleteMany();

  const patient = await prisma.user.create({
    data: {
      name: "Sample Patient",
      email: "patient@example.com",
      password: hashedPassword,
      role: "PATIENT",
    },
  });
  console.log(`Created patient: ${patient.email}`);

  const medicines = [];
  for (const m of medicinesData) {
    const medicine = await prisma.medicine.create({ data: m });
    medicines.push(medicine);
  }
  console.log(`Created ${medicines.length} medicines`);

  for (const p of pharmaciesData) {
    const user = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        password: hashedPassword,
        role: "PHARMACY",
        pharmacy: {
          create: {
            name: p.name,
            address: p.address,
            phone: p.phone,
            latitude: p.latitude,
            longitude: p.longitude,
            licenseNumber: p.licenseNumber,
          },
        },
      },
      include: { pharmacy: true },
    });

    if (!user.pharmacy) continue;

    const stockData = medicines.map((medicine) => ({
      pharmacyId: user.pharmacy!.id,
      medicineId: medicine.id,
      quantity: randomStock(),
    }));

    await prisma.pharmacyStock.createMany({ data: stockData });
    console.log(`Created pharmacy ${p.name} with ${stockData.length} stock entries`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
