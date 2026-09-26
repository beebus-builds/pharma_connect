import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Search, Store } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isExpired } from "@/lib/inventory";
import ShareButtons from "@/components/ShareButtons";
import {
  deslugifyGeneric,
  getSiteUrl,
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

async function resolveGeneric(slug: string): Promise<string | null> {
  const target = normalizeSlug(slug);
  try {
    const names = await prisma.medicine.findMany({
      select: { genericName: true },
      take: 2000,
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
  const display = resolved ?? deslugifyGeneric(generic);
  const url = medicineCanonicalUrl(display);
  const description = medicineSeoDescription(display, 1, 1);
  return {
    title: medicineSeoTitle(display),
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${display} price in Nepal | PharmaConnect`,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${display} price in Nepal | PharmaConnect`,
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
  const searchHref = `/?q=${encodeURIComponent(resolved)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Drug",
    name: resolved,
    description,
    url: canonical,
    manufacturer: manufacturers.slice(0, 5).map((name) => ({ "@type": "Organization", name })),
  };

  const related = await (async () => {
    try {
      const rows = await prisma.medicine.findMany({
        select: { genericName: true },
        take: 60,
      });
      const lowered = resolved.trim().toLowerCase();
      const uniq = [...new Set(rows.map((r) => r.genericName.trim()))].filter(
        (n) => n && n.toLowerCase() !== lowered
      );
      return uniq.slice(0, 6);
    } catch {
      return [];
    }
  })();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-3">
        <Link href="/" className="hover:underline underline-offset-2">Home</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/medicines" className="hover:underline underline-offset-2">Medicines</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{resolved}</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-black">{resolved} price in Nepal</h1>
      <p className="text-sm text-slate-500 mt-2 max-w-2xl">{description}</p>

      <div className="flex flex-wrap items-center gap-2 mt-5">
        <Link
          href={searchHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
        >
          <Search className="h-3.5 w-3.5" /> Check nearby stock
        </Link>
        <Link
          href="/#pharmacies"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <MapPin className="h-3.5 w-3.5" /> Kathmandu valley pharmacies
        </Link>
        <ShareButtons url={canonical} title={`${resolved} price in Nepal`} />
      </div>

      <section aria-label="Available variants" className="mt-8 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <caption className="sr-only">Brands and strengths of {resolved}</caption>
          <thead className="bg-slate-50 dark:bg-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Brand</th>
              <th scope="col" className="px-4 py-3 font-semibold">Strength</th>
              <th scope="col" className="px-4 py-3 font-semibold hidden sm:table-cell">Manufacturer</th>
              <th scope="col" className="px-4 py-3 font-semibold text-right">From</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
            {variants.map((v) => (
              <tr key={v.id}>
                <td className="px-4 py-3 font-semibold">{v.brandName}</td>
                <td className="px-4 py-3">{v.strength}</td>
                <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{v.manufacturer}</td>
                <td className="px-4 py-3 text-right">
                  {v.lowestMrp !== null ? (
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">Rs. {v.lowestMrp}</span>
                  ) : v.inStockPharmacies > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <Store className="h-3.5 w-3.5" /> {v.inStockPharmacies} shop{v.inStockPharmacies === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <Link href={searchHref} className="text-xs font-semibold text-primary-600 hover:underline underline-offset-2">
                      Ask nearby
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-label="Frequently asked questions" className="mt-8 prose prose-slate dark:prose-invert prose-sm max-w-none">
        <h2 className="text-lg font-black">Common questions</h2>
        <h3 className="font-bold mt-4">Where can I buy {resolved} in Kathmandu?</h3>
        <p>
          Search {resolved} on PharmaConnect to see verified pharmacies near you with live stock,
          then request the product or call the shop directly.
        </p>
        <h3 className="font-bold mt-4">Do I need an account to browse prices?</h3>
        <p>No. Browsing, price comparison and pharmacy storefronts are free for guests. Accounts are only needed to request stock, chat or report a listing.</p>
      </section>

      {related.length > 0 && (
        <nav aria-label="Related medicines" className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Related medicines</h2>
          <ul className="flex flex-wrap gap-2 mt-3">
            {related.map((name) => (
              <li key={name}>
                <Link
                  href={`/medicines/${slugifyGeneric(name)}`}
                  className="inline-block text-xs font-semibold px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 hover:border-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <p className="text-xs text-slate-400 mt-8">
        Prices are pharmacy-reported MRPs and may vary by shop. Always confirm availability by phone.
        Base site: {getSiteUrl()}
      </p>
    </div>
  );
}
