import type { Metadata } from "next";
import HelpView from "./HelpView";

export const metadata: Metadata = {
  title: "Help center | PharmaConnect",
  description:
    "Find answers about using PharmaConnect — searching medicines, requests, chat, pharmacies, and account help.",
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Help center | PharmaConnect",
    description: "Answers, shortcuts, and how to get in touch with support.",
  },
};

export default function HelpPage() {
  return <HelpView />;
}
