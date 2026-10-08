import type { Metadata } from "next";
import Link from "next/link";
import { Pill, ArrowRight, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSiteUrl, slugifyGeneric } from "@/lib/seo";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

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

/** `null` distinguishes "the database is unreachable" from "the catalog is empty". */
async function getGenerics(): Promise<{ name: string; slug: string; variants: number }[] | null> {
  try {
    const rows = await prisma.medicine.findMany({ select: { genericName: true } });
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
    // Previously this returned `[]`, so a database outage rendered the same
    // page as an empty catalog and nobody knew to look.
    return null;
  }
}

export default async function MedicinesIndexPage() {
  const generics = await getGenerics();
  const totalVariants = generics?.reduce((n, g) => n + g.variants, 0) ?? 0;

  return (
    <Container className="py-8 sm:py-10">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Medicines" }]} className="mb-4" />

      <SectionHeading
        eyebrow={`${generics?.length ?? 0} generics · ${totalVariants} products`}
        title="Medicine prices in Nepal"
        description="Free catalog of common medicines — compare brands and strengths, then check live nearby stock. No account needed to browse."
      />

      {generics === null ? (
        <EmptyState
          tone="error"
          className="mt-8"
          icon={AlertTriangle}
          title="The catalog is unavailable right now"
          body="We could not reach the medicine database. This is usually temporary."
        />
      ) : generics.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={Pill}
          title="No medicines listed yet"
          body="Pharmacies add products to the shared catalog as they stock them."
        />
      ) : (
        <ul className="mt-8 grid gap-2 sm:grid-cols-2">
          {generics.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/medicines/${g.slug}`}
                className={`${buttonClasses({ variant: "secondary", block: true, className: "h-auto justify-between py-3.5 text-left font-normal" })}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[0.9375rem] font-semibold text-fg">
                    {g.name}
                  </span>
                  <span className="tabular block text-xs text-fg-muted">
                    {g.variants} variant{g.variants === 1 ? "" : "s"} · price &amp; stock
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
