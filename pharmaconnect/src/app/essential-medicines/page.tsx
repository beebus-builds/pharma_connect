import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { slugifyGeneric } from "@/lib/seo";
import EssentialMedicinesView from "./EssentialMedicinesView";

export const metadata: Metadata = {
  title: "Essential medicines for Nepal households | PharmaConnect",
  description:
    "A practical essential-medicines reference for Nepal households and pharmacies: fever/pain, infections, hydration, allergy, stomach, chronic care, vitamins, wound care.",
  alternates: { canonical: "/essential-medicines" },
  openGraph: {
    title: "Essential medicines | PharmaConnect",
    description: "WHO-aligned reference list tailored for Nepal. Informational only.",
  },
};

export const revalidate = 3600;

interface Item { generic: string; href: string }
interface Group { key: string; hint: string; items: Item[] }

const KIT: { key: string; hint: string; items: string[] }[] = [
  { key: "fever", hint: "Paracetamol first-line for fever and pain; ibuprofen/NSAIDs when anti-inflammatory needed.", items: ["Paracetamol", "Ibuprofen", "Diclofenac"] },
  { key: "infection", hint: "Use only on a clinician’s advice; complete the full course.", items: ["Amoxicillin", "Azithromycin", "Ciprofloxacin", "Metronidazole", "Cotrimoxazole"] },
  { key: "hydration", hint: "ORS saves lives in diarrhoea; zinc shortens duration.", items: ["Oral rehydration salts", "Zinc sulphate"] },
  { key: "allergy", hint: "Non-sedating antihistamines for daily use; sedating ones for short relief.", items: ["Cetirizine", "Loratadine"] },
  { key: "stomach", hint: "Antacids and ORS are first-line before acid suppressants.", items: ["Oral rehydration salts", "Aluminium hydroxide gel"] },
  { key: "chronic", hint: "Daily therapy - confirm doses and monitoring with a clinician.", items: ["Metformin", "Amlodipine", "Losartan", "Aspirin", "Levothyroxine"] },
  { key: "vitamins", hint: "Supplement on a clinician’s advice; evidence for prevention is mixed.", items: ["Vitamin C", "Vitamin D", "Calcium", "Ferrous sulphate", "Zinc sulphate"] },
  { key: "skin", hint: "Clean water, soap, and protective dressings are first-line.", items: ["Povidone iodine", "Paracetamol"] },
];

export default async function EssentialMedicinesPage() {
  let rows: { id: string; genericName: string }[] = [];
  try {
    rows = await prisma.medicine.findMany({ select: { id: true, genericName: true } }) as any;
  } catch {
    rows = [];
  }
  const byName = new Map(rows.map((r) => [r.genericName.toLowerCase(), r.id]));

  const groups: Group[] = KIT.map((g) => ({
    key: g.key,
    hint: g.hint,
    items: g.items.map((name) => ({
      generic: name,
      href: byName.has(name.toLowerCase())
        ? `/medicines/${slugifyGeneric(name)}`
        : `/medicines?q=${encodeURIComponent(name)}`,
    })),
  }));

  return <EssentialMedicinesView groups={groups} catalogCount={rows.length} />;
}
