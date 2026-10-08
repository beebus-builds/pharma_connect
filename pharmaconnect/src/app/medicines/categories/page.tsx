import type { Metadata } from "next";
import MedicineCategoriesView from "./MedicineCategoriesView";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

/** Lower-cased generic names actually present in the shared catalog. */
async function getCatalogNames(): Promise<string[] | null> {
  try {
    const rows = await prisma.medicine.findMany({
      select: { genericName: true },
      distinct: ["genericName"],
    });
    return rows.map((r) => r.genericName.trim().toLowerCase());
  } catch {
    return null;
  }
}

export const metadata: Metadata = {
  title: "Browse medicines by category — PharmaConnect",
  description:
    "Browse the PharmaConnect catalog by what a medicine is used for — fever & pain, antibiotics, stomach, diabetes, heart, asthma, vitamins and more. Categories follow the WHO Essential Medicines List.",
  alternates: { canonical: "/medicines/categories" },
  openGraph: {
    title: "Browse medicines by category — PharmaConnect",
    description: "The shared Nepal medicine catalog, grouped by use. Free to browse.",
  },
};

export default async function MedicineCategoriesPage() {
  const catalog = await getCatalogNames();
  return <MedicineCategoriesView catalog={catalog} />;
}
