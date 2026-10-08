import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Search, Store } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isExpired } from "@/lib/inventory";
import ShareButtons from "@/components/ShareButtons";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { buttonClasses } from "@/components/ui/Button";
import {
  deslugifyGeneric,
  medicineCanonicalUrl,
  medicineSeoDescription,
  medicineSeoTitle,
  normalizeSlug,
  slugifyGeneric,
} from "@/lib/seo";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ generic: string }>;
}

interface VariantRow {
  id: string;
  brandName: string;
  strength: string;
  manufacturer: string;
  inStockPharmacies: number;
  lowestMrp: number | null;
}

/**
 * Slug -> canonical generic name. Deslugify first and query by exact name so this
 * stays a single indexed lookup instead of scanning the whole catalog per request.
 * Falls back to a scan only when the deslugified form misses (odd spellings).
 */
async function resolveGeneric(slug: string): Promise<string | null> {
  const target = normalizeSlug(slug);
  if (!target) return null;
  const candidate = deslugifyGeneric(target);

  try {
    const direct = await prisma.medicine.findFirst({
      where: { genericName: { equals: candidate, mode: "insensitive" } },
      select: { genericName: true },
    });
    if (direct) return direct.genericName.trim();

    // Slug shape doesn't round-trip (e.g. "500mg" packed into the slug). Fall back
    // to matching on the deslugified prefix across the distinct generic names.
    const names = await prisma.medicine.findMany({
      where: { genericName: { contains: candidate, mode: "insensitive" } },
      select: { genericName: true },
      distinct: ["genericName"],
      take: 25,
    });
    const seen = new Map<string, string>();
    for (const n of names) {
      const s = slugifyGeneric(n.genericName);
      if (!seen.has(s)) seen.set(s, n.genericName.trim());
    }
    return seen.get(target) ?? null;
  } catch {
    return null;
  }
}

async function getVariants(genericName: string): Promise<VariantRow[]> {
  const medicines = await prisma.medicine.findMany({
    where: { genericName: { equals: genericName, mode: "insensitive" } },
    include: { stocks: true },
    orderBy: [{ strength: "asc" }, { brandName: "asc" }],
    take: 100,
  });
  const now = new Date();
  return medicines.map((m) => {
    const live = m.stocks.filter((s) => !isExpired(s.expiryDate, now) && s.quantity > 0);
    const mrps = live.map((s) => s.mrp).filter((v): v is number => typeof v === "number");
    return {
      id: m.id,
      brandName: m.brandName,
      strength: m.strength,
      manufacturer: m.manufacturer,
      inStockPharmacies: new Set(live.map((s) => s.pharmacyId)).size,
      lowestMrp: mrps.length ? Math.min(...mrps) : null,
    };
  });
}

export async function generateStaticParams(): Promise<{ generic: string }[]> {
  try {
    const rows = await prisma.medicine.findMany({ select: { genericName: true }, take: 200 });
    const slugs = new Set<string>();
    for (const r of rows) slugs.add(slugifyGeneric(r.genericName));
    return [...slugs].slice(0, 50).map((generic) => ({ generic }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { generic } = await params;
  const resolved = await resolveGeneric(generic);
  if (!resolved) {
    return { title: "Medicine not found | PharmaConnect", robots: { index: false, follow: true } };
  }

  // Real counts, not 1/1 placeholders — the page body computes the same numbers.
  let description = medicineSeoDescription(resolved, 1, 1);
  try {
    const [brands, strengths, inStock] = await Promise.all([
      prisma.medicine.findMany({
        where: { genericName: { equals: resolved, mode: "insensitive" } },
        select: { brandName: true },
        distinct: ["brandName"],
      }),
      prisma.medicine.findMany({
        where: { genericName: { equals: resolved, mode: "insensitive" } },
        select: { strength: true },
        distinct: ["strength"],
      }),
      prisma.pharmacyStock.findMany({
        where: {
          medicine: { genericName: { equals: resolved, mode: "insensitive" } },
          quantity: { gt: 0 },
        },
        select: { pharmacyId: true },
        distinct: ["pharmacyId"],
      }),
    ]);
    description = medicineSeoDescription(resolved, brands.length, strengths.length, inStock.length);
  } catch {
    // Keep the 1/1 fallback description.
  }

  const url = medicineCanonicalUrl(resolved);
  return {
    title: medicineSeoTitle(resolved),
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${resolved} price in Nepal | PharmaConnect`,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${resolved} price in Nepal | PharmaConnect`,
      description,
    },
  };
}

export default async function MedicineGenericPage({ params }: PageProps) {
  const { generic } = await params;
  const resolved = await resolveGeneric(generic);
  if (!resolved) notFound();

  let variants: VariantRow[] = [];
  try {
    variants = await getVariants(resolved);
  } catch {
    variants = [];
  }
  if (variants.length === 0) notFound();

  const brands = [...new Set(variants.map((v) => v.brandName))];
  const strengths = [...new Set(variants.map((v) => v.strength))];
  const manufacturers = [...new Set(variants.map((v) => v.manufacturer))];
  const inStockTotal = variants.reduce((n, v) => n + v.inStockPharmacies, 0);
  const description = medicineSeoDescription(resolved, brands.length, strengths.length, inStockTotal);
  const canonical = medicineCanonicalUrl(resolved);
  // Homepage reads `?q=` to preselect this medicine and `#pharmacies` to scroll
  // the results list into view.
  const searchHref = `/?q=${encodeURIComponent(resolved)}#pharmacies`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Drug",
    name: resolved,
    description,
    url: canonical,
    manufacturer: manufacturers.slice(0, 5).map((name) => ({ "@type": "Organization", name })),
  };

  // Related = other generics people actually stock, not arbitrary catalog rows.
  const related = await (async () => {
    try {
      const rows = await prisma.medicine.groupBy({
        by: ["genericName"],
        where: { genericName: { not: resolved } },
        _count: { _all: true },
        orderBy: { _count: { genericName: "desc" } },
        take: 6,
      });
      return rows.map((r) => r.genericName.trim()).filter(Boolean);
    } catch {
      return [];
    }
  })();

  return (
    <Container className="max-w-4xl py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/medicines", label: "Medicines" },
          { label: resolved },
        ]}
        className="mb-4"
      />

      <SectionHeading
        eyebrow={`${brands.length} brands · ${strengths.length} strengths`}
        title={`${resolved} price in Nepal`}
        description={description}
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href={searchHref} className={buttonClasses({ size: "sm" })}>
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          Check nearby stock
        </Link>
        <Link href="/medicines" className={buttonClasses({ size: "sm", variant: "secondary" })}>
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          Browse all medicines
        </Link>
        <ShareButtons url={canonical} title={`${resolved} price in Nepal`} />
      </div>

      {variants.length === 0 ? (
        <Card className="mt-8 p-8 text-center text-sm text-fg-muted">
          No brand variants for {resolved} are listed yet.
        </Card>
      ) : (
        <section aria-label="Available variants" className="table-cards mt-8 overflow-hidden rounded-2xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Brands and strengths of {resolved}</caption>
            <thead className="bg-surface-sunken">
              <tr>
                <th
                  scope="col"
                  className="border-b border-line px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle"
                >
                  Brand
                </th>
                <th
                  scope="col"
                  className="border-b border-line px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle"
                >
                  Strength
                </th>
                <th
                  scope="col"
                  className="hidden border-b border-line px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle sm:table-cell"
                >
                  Manufacturer
                </th>
                <th
                  scope="col"
                  className="border-b border-line px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle"
                >
                  From
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {variants.map((v) => (
                <tr key={v.id} className="transition-colors hover:bg-surface-sunken/60">
                  <td data-label="Brand" className="px-4 py-3 font-semibold text-fg">
                    {v.brandName}
                  </td>
                  <td data-label="Strength" className="px-4 py-3 text-fg-muted">
                    {v.strength}
                  </td>
                  <td
                    data-label="Manufacturer"
                    className="hidden px-4 py-3 text-fg-muted sm:table-cell"
                  >
                    {v.manufacturer}
                  </td>
                  <td data-label="From" className="px-4 py-3 text-right">
                    {v.lowestMrp !== null ? (
                      <span className="tabular font-bold text-accent">Rs. {v.lowestMrp}</span>
                    ) : v.inStockPharmacies > 0 ? (
                      <span className="tabular inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <Store className="h-3.5 w-3.5" aria-hidden="true" />
                        {v.inStockPharmacies} shop{v.inStockPharmacies === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <Link
                        href={searchHref}
                        className="rounded text-xs font-semibold text-accent hover:underline"
                      >
                        Ask nearby
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section aria-label="Frequently asked questions" className="mt-8 max-w-2xl">
        <h2 className="headline font-display text-xl text-fg">Common questions</h2>
        <div className="mt-4 space-y-5">
          <div>
            <h3 className="text-[0.9375rem] font-semibold text-fg">
              Where can I buy {resolved} near me?
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">
              Search {resolved} on PharmaConnect to see verified pharmacies near you with live stock,
              then request the product or call the shop directly. We show every counter that has it
              — not an advert for one.
            </p>
          </div>
          <div>
            <h3 className="text-[0.9375rem] font-semibold text-fg">
              Do I need an account to browse prices?
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">
              No. Browsing, price comparison and pharmacy storefronts are free for guests. Accounts
              are only needed to request stock, chat or report a listing.
            </p>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <nav aria-label="Related medicines" className="mt-8">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-fg-subtle">
            Other commonly stocked medicines
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {related.map((name) => (
              <li key={name}>
                <Chip size="sm" className="pointer-events-none">
                  <Link
                    href={`/medicines/${slugifyGeneric(name)}`}
                    className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                  >
                    {name}
                  </Link>
                </Chip>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <p className="mt-8 text-xs leading-relaxed text-fg-subtle">
        Prices are pharmacy-reported MRPs and may vary by shop. Always confirm availability by phone.
      </p>
    </Container>
  );
}
