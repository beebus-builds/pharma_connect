import type { Metadata } from "next";
import TrustView from "./TrustView";

export const metadata: Metadata = {
  title: "Trust – How PharmaConnect earns it | PharmaConnect",
  description:
    "How PharmaConnect verifies pharmacies, protects patient data, and stays out of the sale of medicines. Transparency first.",
  alternates: { canonical: "/trust" },
  openGraph: {
    title: "Trust | PharmaConnect",
    description: "How we verify, what we never do, and how to report a problem.",
  },
};

export default function TrustPage() {
  return <TrustView />;
}