import type { Metadata } from "next";
import ContactView from "./ContactView";

export const metadata: Metadata = {
  title: "Contact — PharmaConnect",
  description:
    "Get in touch with the PharmaConnect team — account help, report a listing, or list your pharmacy. We reply within two working days.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact PharmaConnect",
    description: "Support, partnerships, and reporting. Plus what to do in a medical emergency.",
  },
};

export default function ContactPage() {
  return <ContactView />;
}
