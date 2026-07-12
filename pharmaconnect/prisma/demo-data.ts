import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MEDICINES = [
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

const PHARMACIES = [
  { email: "pharmacy1@example.com", name: "Nepal Life Pharmacy", address: "New Road, Kathmandu", phone: "01-4223344", lat: 27.7041, lng: 85.3145, license: "PH-KTM-001" },
  { email: "pharmacy2@example.com", name: "Everest Health Pharmacy", address: "Durbar Marg, Kathmandu", phone: "01-4225566", lat: 27.7109, lng: 85.3183, license: "PH-KTM-002" },
  { email: "pharmacy3@example.com", name: "Patan Care Pharmacy", address: "Mangal Bazaar, Lalitpur", phone: "01-5525577", lat: 27.6727, lng: 85.3247, license: "PH-LTP-003" },
  { email: "pharmacy4@example.com", name: "Boudha Wellness Pharmacy", address: "Boudhanath, Kathmandu", phone: "01-4487722", lat: 27.7215, lng: 85.3620, license: "PH-KTM-004" },
  { email: "pharmacy5@example.com", name: "Bhaktapur Sanjeevani Pharmacy", address: "Durbar Square, Bhaktapur", phone: "01-6612233", lat: 27.6710, lng: 85.4298, license: "PH-BKT-005" },
];

async function main() {
  console.log("Generating massive demo data...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  // Cleanup
  await prisma.request.deleteMany();
  await prisma.pharmacyStock.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.pharmacy.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Medicines
  const medicineRecords = await prisma.medicine.createMany({ data: MEDICINES });
  const medicines = await prisma.medicine.findMany();

  // 2. Create Pharmacies
  for (const p of PHARMACIES) {
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

    // Populate stock randomly
    const stockData = medicines.map((m) => ({
      pharmacyId: user.pharmacy!.id,
      medicineId: m.id,
      quantity: Math.floor(Math.random() * 100),
    }));
    await prisma.pharmacyStock.createMany({ data: stockData });
  }

  // 3. Create Patients
  const patients = [];
  for (let i = 1; i <= 20; i++) {
    const patient = await prisma.user.create({
      data: {
        name: `Test Patient ${i}`,
        email: `patient${i}@example.com`,
        password: hashedPassword,
        role: "PATIENT",
        emailVerified: true,
      },
    });
    patients.push(patient);
  }

  // 4. Create Random Requests
  const allPharmacies = await prisma.pharmacy.findMany();
  for (const patient of patients) {
    const numRequests = Math.floor(Math.random() * 5) + 1;
    for (let i = 0; i < numRequests; i++) {
      const randomPharm = allPharmacies[Math.floor(Math.random() * allPharmacies.length)];
      const randomMed = medicines[Math.floor(Math.random() * medicines.length)];
      const statuses: ("PENDING" | "AVAILABLE" | "UNAVAILABLE")[] = ["PENDING", "AVAILABLE", "UNAVAILABLE"];
      
      await prisma.request.create({
        data: {
          patientId: patient.id,
          pharmacyId: randomPharm.id,
          medicineId: randomMed.id,
          status: statuses[Math.floor(Math.random() * statuses.length)],
        },
      });
    }
  }

  console.log("Demo data seeding complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
