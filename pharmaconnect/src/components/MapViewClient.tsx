"use client";

import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { MapErrorBoundary } from "@/components/MapErrorBoundary";
import { useLocale } from "@/components/LocaleProvider";
import type { NearbyPharmacyDTO } from "@/types";

const MapView = lazy(() => import("@/components/MapView"));

interface Props {
  userLocation: { lat: number; lng: number } | null;
  pharmacies: NearbyPharmacyDTO[];
  activePharmacyId?: string | null;
  onSelectPharmacy?: (id: string) => void;
}

/** Loading placeholder for the map chunk, shaped like the map it replaces. */
function MapLoading({ label }: { label: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-surface-sunken" role="status">
      <span className="sr-only">{label}</span>
      {/* Faint grid suggests "map incoming" without pretending to be one. */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(var(--line)) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--line)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/90 px-3.5 py-2 text-xs font-medium text-fg-muted backdrop-blur">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          {label}
        </span>
      </div>
    </div>
  );
}

export default function MapViewClient(props: Props) {
  const { t } = useLocale();
  return (
    <MapErrorBoundary>
      <Suspense fallback={<MapLoading label={t("map.loading")} />}>
        <MapView {...props} />
      </Suspense>
    </MapErrorBoundary>
  );
}
