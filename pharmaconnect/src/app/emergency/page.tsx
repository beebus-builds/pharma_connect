import type { Metadata } from "next";
import EmergencyView from "./EmergencyView";

export const metadata: Metadata = {
  title: "Emergency – PharmaConnect",
  description:
    "In an emergency, call 102 or go to the nearest hospital. PharmaConnect is information, not medical care.",
  alternates: { canonical: "/emergency" },
  openGraph: {
    title: "Emergency | PharmaConnect",
    description: "What to do right now in Nepal – and what PharmaConnect can and cannot do.",
  },
};

export default function EmergencyPage() {
  return <EmergencyView />;
}
