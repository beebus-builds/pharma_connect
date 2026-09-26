import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteUrl, slugifyGeneric } from "@/lib/seo";

export const revalidate = 3600;

const STATIC_ROUTES = ["", "/medicines", "/how-it-works", "/privacy", "/terms"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${base}${route || "/"}`.replace(/\/$/, "") || base,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/medicines" ? 0.9 : 0.5,
  }));
  // Fix root: `${base}` + "" handling above yields base without trailing slash.
  staticEntries[0].url = `${base}/`;

  try {
    const [medicines, pharmacies] = await Promise.all([
      prisma.medicine.findMany({ select: { genericName: true }, take: 500 }),
      prisma.pharmacy.findMany({
        where: { verified: true },
        select: { id: true, createdAt: true },
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const slugs = new Set<string>();
    for (const m of medicines) slugs.add(slugifyGeneric(m.genericName));

    const medicineEntries: MetadataRoute.Sitemap = [...slugs].map((slug) => ({
      url: `${base}/medicines/${slug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    }));

    const pharmacyEntries: MetadataRoute.Sitemap = pharmacies.map((p) => ({
      url: `${base}/pharmacies/${p.id}`,
      lastModified: p.createdAt,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    return [...staticEntries, ...medicineEntries, ...pharmacyEntries];
  } catch {
    // DB unavailable at build time — still serve static routes so indexing works.
    return staticEntries;
  }
}
