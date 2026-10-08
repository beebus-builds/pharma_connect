import type { Metadata } from "next";
import AboutView from "./AboutView";

export const metadata: Metadata = {
  title: "About — PharmaConnect",
  description:
    "PharmaConnect is a shared, live catalog of medicine availability across Nepal — free for patients, honest for pharmacies. Learn our mission and values.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About PharmaConnect",
    description: "A shared shelf for every pharmacy in Nepal. Why we built it, and what we value.",
    type: "website",
  },
};

export default function AboutPage() {
  return <AboutView />;
}
