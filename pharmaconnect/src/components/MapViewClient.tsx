"use client";

import { lazy, Suspense } from "react";
import { MapErrorBoundary } from "@/components/MapErrorBoundary";
import type { NearbyPharmacyDTO } from "@/types";

const MapView = lazy(() => import("@/components/MapView"));

const MapLoading = () => (
  <div className="h-full w-full rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm text-slate-400">
    Loading map...
  </div>
);

interface Props {
  userLocation: { lat: number; lng: number } | null;
  pharmacies: NearbyPharmacyDTO[];
  activePharmacyId?: string | null;
  onSelectPharmacy?: (id: string) => void;
}

export default function MapViewClient(props: Props) {
  return (
    <MapErrorBoundary>
      <Suspense fallback={<MapLoading />}>
        <MapView {...props} />
      </Suspense>
    </MapErrorBoundary>
  );
}
