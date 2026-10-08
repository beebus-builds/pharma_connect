import type { Metadata } from "next";
import MedicineAZView from "./MedicineAZView";
import { prisma } from "@/lib/prisma";
import { slugifyGeneric } from "@/lib/seo";

export const revalidate = 3600;

interface GenericItem {
  name: string;
  slug: string;
  variants: number;
}

/**
 * Distinct generics + how many catalog products sit behind each.
 *
 * Same query the `/medicines` index uses — a generic is one shared molecule, so
 * rows are grouped by the name and counted, not listed individually.
 */
async function getGenericIndex(): Promise<GenericItem[] | null> {
  try {
    const rows = await prisma.medicine.findMany({ select: { genericName: true } });
    const counts = new Map<string, { name: string; variants: number }>();
    for (const r of rows) {
      const key = r.genericName.trim().toLowerCase();
      const entry = counts.get(key);
      if (entry) entry.variants += 1;
      else counts.set(key, { name: r.genericName.trim(), variants: 1 });
    }
    return [...counts.values()]
      .map((g) => ({ ...g, slug: slugifyGeneric(g.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return null;
  }
}

export const metadata: Metadata = {
  title: "Medicines A–Z — PharmaConnect",
  description:
    "An alphabetical index of every generic in the PharmaConnect catalog. Pick a medicine to compare brands, strengths, prices and nearby stock in Nepal.",
  alternates: { canonical: "/medicines/a-z" },
  openGraph: {
    title: "Medicines A–Z index — PharmaConnect",
    description: "Browse the shared medicine catalog alphabetically, then check nearby availability.",
  },
};

export default async function MedicineAZPage() {
  const generics = await getGenericIndex();
  return (
    <MedicineAZView
      generics={generics ?? []}
      available={generics !== null}
      totalVariants={generics?.reduce((n, g) => n + g.variants, 0) ?? 0}
    />
  );
}
