import type { Metadata } from "next";
import Link from "next/link";
import { Pill } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSiteUrl, slugifyGeneric } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Medicine price list in Nepal — availability near you | PharmaConnect",
  description:
    "Browse medicine prices and availability across Nepal. Paracetamol, Azithromycin, Cetirizine and more — compare brands, strengths and nearby pharmacy stock.",
  alternates: { canonical: `${getSiteUrl()}/medicines` },
  openGraph: {
    title: "Medicine price list in Nepal | PharmaConnect",
    description: "Compare brands, strengths and nearby pharmacy stock. No account needed to browse.",
    type: "website",
  },
};

async function getGenerics(): Promise<{ name: string; slug: string; variants: number }[]> {
  try {
    const rows = await prisma.medicine.findMany({
      select: { genericName: true },
    });
    const counts = new Map<string, { name: string; variants: number }>();
    for (const r of rows) {
      const key = r.genericName.trim().toLowerCase();
      const entry = counts.get(key);
      if (entry) entry.variants += 1;
      else counts.set(key, { name: r.genericName.trim(), variants: 1 });
    }
    return [...counts.values()]
      .map((g) => ({ ...g, slug: slugifyGeneric(g.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export default async function MedicinesIndexPage() {
  const generics = await getGenerics();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-3">
        <Link href="/" className="hover:underline underline-offset-2">Home</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Medicines</span>
      </nav>
      <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
        <Pill className="h-6 w-6 text-primary-600" aria-hidden="true" />
        Medicine prices in Nepal
      </h1>
      <p className="text-sm text-slate-500 mt-2 max-w-2xl">
        Free catalog of common medicines — compare brands and strengths, then check
        live nearby stock. No account needed to browse.
      </p>

      {generics.length === 0 ? (
        <p className="text-sm text-slate-500 mt-8">Catalog is unavailable right now. Please try again later.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3 mt-6">
          {generics.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/medicines/${g.slug}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 hover:border-primary-400 hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
              >
                <span>
                  <span className="block font-bold text-sm sm:text-base">{g.name}</span>
                  <span className="block text-xs text-slate-500">
                    {g.variants} variant{g.variants === 1 ? "" : "s"} · price &amp; stock
                  </span>
                </span>
                <span aria-hidden="true" className="text-slate-300">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
