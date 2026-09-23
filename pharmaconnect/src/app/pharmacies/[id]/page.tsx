import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { MapPin, Phone, Navigation, Store, ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { haversineDistanceKm, formatDistance, stockStatus } from "@/lib/utils";
import { isValidLatLng } from "@/lib/geo";
import { effectiveThreshold, isExpired } from "@/lib/inventory";
import { viberUrl, whatsappUrl } from "@/lib/contact";
import { VerifiedBadge } from "@/components/ui/Badge";
import StorefrontProducts from "./StorefrontProducts";
import type { PharmacyStorefrontDTO } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lat?: string; lng?: string }>;
}

async function getStorefront(id: string): Promise<PharmacyStorefrontDTO | null> {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id },
    include: {
      images: true,
      stocks: {
        include: { medicine: true },
        orderBy: [{ quantity: "desc" }, { updatedAt: "desc" }],
      },
    },
  });
  if (!pharmacy) return null;

  const imageUrl = (kind: "PROFILE" | "COVER"): string | null =>
    pharmacy.images.find((i) => i.kind === kind)?.url ?? null;

  const now = new Date();
  // Patients never see expired batches.
  const visibleStocks = pharmacy.stocks.filter((s) => !isExpired(s.expiryDate, now));
  return {
    id: pharmacy.id,
    name: pharmacy.name,
    address: pharmacy.address,
    phone: pharmacy.phone,
    latitude: pharmacy.latitude,
    longitude: pharmacy.longitude,
    verified: pharmacy.verified,
    distanceKm: null,
    profileImageUrl: imageUrl("PROFILE"),
    coverImageUrl: imageUrl("COVER"),
    inStockCount: visibleStocks.filter((s) => s.quantity > 0).length,
    products: visibleStocks.map((s) => ({
      medicine: {
        id: s.medicine.id,
        genericName: s.medicine.genericName,
        brandName: s.medicine.brandName,
        strength: s.medicine.strength,
        manufacturer: s.medicine.manufacturer,
      },
      quantity: s.quantity,
      stockStatus: stockStatus(s.quantity, effectiveThreshold(s.lowStockThreshold)),
      mrp: s.mrp ?? null,
      expiryDate: s.expiryDate ? s.expiryDate.toISOString() : null,
      updatedAt: s.updatedAt.toISOString(),
    })),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const storefront = await getStorefront(id);
  if (!storefront) return { title: "Pharmacy not found — PharmaConnect" };
  return {
    title: `${storefront.name} — products & stock | PharmaConnect`,
    description: `Browse ${storefront.inStockCount} in-stock medicines at ${storefront.name}, ${storefront.address}. Request stock and chat directly.`,
    openGraph: {
      title: `${storefront.name} on PharmaConnect`,
      description: `${storefront.inStockCount} medicines in stock · ${storefront.address}`,
      ...(storefront.coverImageUrl || storefront.profileImageUrl
        ? { images: [storefront.coverImageUrl ?? storefront.profileImageUrl!] }
        : {}),
    },
  };
}

export default async function PharmacyStorefrontPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const storefront = await getStorefront(id);
  if (!storefront) notFound();

  const lat = sp.lat?.trim() ? Number(sp.lat) : Number.NaN;
  const lng = sp.lng?.trim() ? Number(sp.lng) : Number.NaN;
  if (isValidLatLng(lat, lng)) {
    storefront.distanceKm =
      Math.round(haversineDistanceKm(lat, lng, storefront.latitude, storefront.longitude) * 100) / 100;
  }

  const session = await getServerSession(authOptions);
  const canRequest = !session || session.user.role === "PATIENT";

  const waLink = whatsappUrl(storefront.phone, storefront.name);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${storefront.latitude},${storefront.longitude}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to search
      </Link>

      {/* Cover */}
      <div className="relative h-44 sm:h-56 rounded-3xl overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-teal-600 border border-slate-200 dark:border-slate-800">
        {storefront.coverImageUrl && (
          <Image
            src={storefront.coverImageUrl}
            alt={`${storefront.name} storefront`}
            fill
            className="object-cover"
            sizes="(max-width: 896px) 100vw, 896px"
            priority
          />
        )}
      </div>

      {/* Profile header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 px-2 sm:px-4">
        <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-lg shrink-0 flex items-center justify-center">
          {storefront.profileImageUrl ? (
            <Image
              src={storefront.profileImageUrl}
              alt={storefront.name}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <Store className="h-8 w-8 text-primary-600" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1 pt-1 sm:pb-1">
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2 flex-wrap">
            {storefront.name}
            {storefront.verified && <VerifiedBadge />}
          </h1>
          <p className="text-sm text-slate-500 flex items-start gap-1.5 mt-1">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {storefront.address}
            {storefront.distanceKm !== null && (
              <span className="font-semibold text-primary-600 ml-1">· {formatDistance(storefront.distanceKm)} away</span>
            )}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-5">
        <a
          href={`tel:${storefront.phone}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90"
        >
          <Phone className="h-3.5 w-3.5" /> {storefront.phone}
        </a>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <Navigation className="h-3.5 w-3.5" /> Directions
        </a>
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            WhatsApp
          </a>
        )}
        {viberUrl(storefront.phone) && (
          <a
            href={viberUrl(storefront.phone)!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Viber
          </a>
        )}
      </div>

      {/* Products listed under this pharmacy's name */}
      <div className="mt-8">
        <StorefrontProducts pharmacy={storefront} canRequest={canRequest} />
      </div>
    </div>
  );
}
