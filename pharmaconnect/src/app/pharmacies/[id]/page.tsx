import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { MapPin, Phone, Navigation, Store, ArrowLeft, PackageCheck, MessageCircle } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { haversineDistanceKm, formatDistance, stockStatus } from "@/lib/utils";
import { isValidLatLng } from "@/lib/geo";
import { effectiveThreshold, isExpired } from "@/lib/inventory";
import { effectivePlan } from "@/lib/plans";
import { viberUrl, whatsappUrl } from "@/lib/contact";
import { getSiteUrl } from "@/lib/seo";
import { VerifiedBadge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { buttonClasses } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import ShareButtons from "@/components/ShareButtons";
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
      locations: true,
      stocks: {
        include: { medicine: true, location: { select: { id: true, name: true } } },
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
    plan: effectivePlan(pharmacy.plan, pharmacy.planExpiresAt, now),
    distanceKm: null,
    profileImageUrl: imageUrl("PROFILE"),
    coverImageUrl: imageUrl("COVER"),
    inStockCount: visibleStocks.filter((s) => s.quantity > 0).length,
    branches: pharmacy.locations.map((l) => ({
      id: l.id,
      name: l.name,
      address: l.address,
      phone: l.phone ?? pharmacy.phone,
      latitude: l.latitude,
      longitude: l.longitude,
    })),
    products: visibleStocks.map((s) => ({
      medicine: {
        id: s.medicine.id,
        genericName: s.medicine.genericName,
        brandName: s.medicine.brandName,
        strength: s.medicine.strength,
        manufacturer: s.medicine.manufacturer,
        imageUrl: (s.medicine as { imageUrl?: string | null }).imageUrl ?? null,
      },
      quantity: s.quantity,
      stockStatus: stockStatus(s.quantity, effectiveThreshold(s.lowStockThreshold)),
      mrp: s.mrp ?? null,
      expiryDate: s.expiryDate ? s.expiryDate.toISOString() : null,
      updatedAt: s.updatedAt.toISOString(),
      locationId: s.locationId,
      locationName: s.location?.name ?? "Main branch",
    })),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const storefront = await getStorefront(id);
  if (!storefront) return { title: "Pharmacy not found — PharmaConnect" };
  const canonical = `${getSiteUrl()}/pharmacies/${storefront.id}`;
  const description = `Browse ${storefront.inStockCount} in-stock medicines at ${storefront.name}, ${storefront.address}. Request stock and chat directly.`;
  return {
    title: `${storefront.name} — products & stock | PharmaConnect`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${storefront.name} on PharmaConnect`,
      description: `${storefront.inStockCount} medicines in stock · ${storefront.address}`,
      url: canonical,
      type: "website",
      ...(storefront.coverImageUrl || storefront.profileImageUrl
        ? { images: [storefront.coverImageUrl ?? storefront.profileImageUrl!] }
        : {}),
    },
    twitter: {
      card: "summary",
      title: `${storefront.name} on PharmaConnect`,
      description: `${storefront.inStockCount} medicines in stock · ${storefront.address}`,
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
    <Container className="py-8">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to search
      </Link>

      {/* Cover */}
      <div className="relative h-40 overflow-hidden rounded-3xl border border-line bg-accent-soft sm:h-52">
        {storefront.coverImageUrl ? (
          <Image
            src={storefront.coverImageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 896px) 100vw, 896px"
            priority
          />
        ) : (
          // No photo on file: a calm brand-tinted panel beats a broken image.
          <div className="mesh absolute inset-0" aria-hidden="true" />
        )}
      </div>

      {/* Profile header */}
      <div className="-mt-10 flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:px-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-canvas bg-surface shadow-card sm:h-24 sm:w-24">
          {storefront.profileImageUrl ? (
            <Image
              src={storefront.profileImageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <Store className="h-8 w-8 text-accent" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1 sm:pb-1">
          <h1 className="headline flex flex-wrap items-center gap-2 font-display text-2xl text-fg sm:text-3xl">
            {storefront.name}
            {storefront.verified && <VerifiedBadge />}
          </h1>
          <p className="mt-1.5 flex items-start gap-1.5 text-sm text-fg-muted">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              {storefront.address}
              {storefront.distanceKm !== null && (
                <span className="ml-1 font-semibold text-accent">
                  · {formatDistance(storefront.distanceKm)} away
                </span>
              )}
            </span>
          </p>
        </div>
      </div>

      {/* At a glance — the three numbers a patient actually decides on */}
      <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
        <StatTile
          icon={PackageCheck}
          label="In stock now"
          value={storefront.inStockCount}
          tone={storefront.inStockCount > 0 ? "positive" : "neutral"}
        />
        <StatTile
          icon={Store}
          label="Branches"
          value={storefront.branches.length}
          tone="neutral"
        />
        <StatTile
          icon={MapPin}
          label={storefront.distanceKm !== null ? "Distance" : "Location"}
          // No `?lat/lng`: say so rather than rendering an em-dash that reads
          // like a measurement of zero.
          value={storefront.distanceKm !== null ? storefront.distanceKm.toFixed(1) : "Pinned"}
          caption={
            storefront.distanceKm !== null ? "km from you" : "Exact point on the map"
          }
          tone="neutral"
        />
      </div>

      {/* Branches — the count above is a promise; this is the payoff. */}
      {storefront.branches.length > 1 && (
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {storefront.branches.map((branch) => (
            <li
              key={branch.id}
              className="flex items-start gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5"
            >
              <Store className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{branch.name}</p>
                <p className="truncate text-xs text-fg-muted">{branch.address}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Actions — calling is the primary intent on a storefront */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <a
          href={`tel:${storefront.phone.replace(/[^+\d]/g, "")}`}
          className={buttonClasses({ size: "sm" })}
          aria-label={`Call ${storefront.name} at ${storefront.phone}`}
        >
          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
          Call {storefront.phone}
        </a>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses({ size: "sm", variant: "secondary" })}
        >
          <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
          Directions
        </a>
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ size: "sm", variant: "secondary" })}
          >
            <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" aria-hidden="true" />
            WhatsApp
          </a>
        )}
        {viberUrl(storefront.phone) && (
          <a
            href={viberUrl(storefront.phone)!}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ size: "sm", variant: "secondary" })}
          >
            <Phone className="h-3.5 w-3.5 text-[#7360F2]" aria-hidden="true" />
            Viber
          </a>
        )}
        <ShareButtons
          url={`${getSiteUrl()}/pharmacies/${storefront.id}`}
          title={`${storefront.name} on PharmaConnect`}
        />
      </div>

      {/* Products listed under this pharmacy's name */}
      <div className="mt-9">
        <StorefrontProducts pharmacy={storefront} canRequest={canRequest} />
      </div>
    </Container>
  );
}
