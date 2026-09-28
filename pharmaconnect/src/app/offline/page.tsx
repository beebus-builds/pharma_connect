import type { Metadata } from "next";
import OfflineView from "@/components/OfflineView";

export const metadata: Metadata = {
  title: "Offline — PharmaConnect",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return <OfflineView />;
}
