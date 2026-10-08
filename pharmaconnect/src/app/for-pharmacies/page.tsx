import type { Metadata } from "next";
import ForPharmaciesView from "./ForPharmaciesView";

export const metadata: Metadata = {
  title: "For Pharmacies — PharmaConnect",
  description:
    "List your pharmacy on Nepal's medicine-availability network. Keep stock honest, answer demand in realtime, and be found by patients ready to buy. Free to list.",
  alternates: { canonical: "/for-pharmacies" },
  openGraph: {
    title: "For Pharmacies — PharmaConnect",
    description: "Be found by patients ready to buy. Free to list; upgrade only for extra visibility.",
  },
};

export default function ForPharmaciesPage() {
  return <ForPharmaciesView />;
}
