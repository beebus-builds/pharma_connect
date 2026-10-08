import type { Metadata } from "next";
import SafetyView from "./SafetyView";

export const metadata: Metadata = {
  title: "Use it safely — PharmaConnect",
  description:
    "PharmaConnect shows medicine availability, not medical advice. How to use it responsibly, check expiry, and what to do in an emergency (call 102).",
  alternates: { canonical: "/safety" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Use PharmaConnect safely",
    description: "Availability is a guide, not a prescription. What it does, what it doesn't, and emergencies.",
  },
};

export default function SafetyPage() {
  return <SafetyView />;
}
