import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CityView from "./CityView";
import { getVerifiedPharmacies } from "@/lib/directory";
import { cityBySlug, NEPAL_CITIES } from "@/lib/nepalPlaces";

export const revalidate = 3600;

// The city set is fixed and known, so lock the route to it: unknown slugs 404 at
// the routing layer (correct status) instead of rendering a thin 200 page, and
// each known city becomes a statically-generated, indexable landing page.
export const dynamicParams = false;

export function generateStaticParams() {
  return NEPAL_CITIES.map((city) => ({ city: city.slug }));
}

interface PageProps {
  params: Promise<{ city: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params;
  const place = cityBySlug(city);
  if (!place) {
    return { title: "Location not found | PharmaConnect", robots: { index: false, follow: true } };
  }
  return {
    title: `Pharmacies in ${place.name} — verified | PharmaConnect`,
    description: `Find licence-verified pharmacies in ${place.name}, Nepal. Call ahead or open a storefront for live stock.`,
    alternates: { canonical: `/pharmacies/in/${place.slug}` },
    openGraph: {
      title: `Pharmacies in ${place.name}`,
      description: `Verified pharmacies around ${place.name}.`,
    },
  };
}

export default async function CityPage({ params }: PageProps) {
  const { city } = await params;
  const place = cityBySlug(city);
  if (!place) notFound();

  const all = await getVerifiedPharmacies();
  const entries = (all ?? []).filter((entry) => entry.citySlug === place.slug);
  return <CityView cityName={place.name} entries={entries} unavailable={all === null} />;
}
