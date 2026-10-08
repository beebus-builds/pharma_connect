import type { Metadata } from "next";
import PharmaciesView from "./PharmaciesView";
import { getVerifiedPharmacies, groupByCity } from "@/lib/directory";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Verified Pharmacies — PharmaConnect",
  description:
    "Browse pharmacies verified by PharmaConnect across Nepal. Call ahead, open a storefront for live stock, or get directions — no account needed.",
  alternates: { canonical: "/pharmacies" },
  openGraph: {
    title: "Verified Pharmacies in Nepal — PharmaConnect",
    description: "A directory of licence-verified pharmacies across Nepal, browsable by city.",
  },
};

export default async function PharmaciesIndexPage() {
  const entries = await getVerifiedPharmacies();
  const cities = entries ? groupByCity(entries) : [];

  return <PharmaciesView entries={entries} cities={cities} />;
}
