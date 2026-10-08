import type { Metadata } from "next";
import PricingView from "./PricingView";

export const metadata: Metadata = {
  title: "Pricing — PharmaConnect",
  description:
    "PharmaConnect pricing in NPR. Free listing is genuinely free; paid plans add a Verified badge, priority verification and top placement. Pay with Khalti.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing — PharmaConnect",
    description: "Free to list. Paid plans only add visibility. Cancel any time by not renewing.",
  },
};

export default function PricingPage() {
  return <PricingView />;
}
